"""Standalone FastAPI prediction microservice for AgentShield-AI Prompt Injection Detection.

Completely decoupled from backend/app/main.py. Can be run independently via:
    uvicorn ml-model.api.app:app --port 8001
"""

import os
import sys
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, HTTPException
import joblib

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from api.schemas import ModelInfoResponse, PredictionRequest, PredictionResponse
from src.preprocessor import clean_text

ARTIFACTS_DIR = os.path.join(BASE_DIR, "artifacts")

# Global in-memory model holders
_vectorizer = None
_base_model = None
_calibrated_model = None


def load_model_artifacts():
    """Load pre-trained artifacts from the artifacts directory."""
    global _vectorizer, _base_model, _calibrated_model

    vec_path = os.path.join(ARTIFACTS_DIR, "vectorizer.joblib")
    base_path = os.path.join(ARTIFACTS_DIR, "model.joblib")
    cal_path = os.path.join(ARTIFACTS_DIR, "calibrated_model.joblib")

    if not os.path.exists(vec_path) or not os.path.exists(base_path):
        # Auto-train if artifacts are missing
        from src.train import main as train_main
        train_main()

    _vectorizer = joblib.load(vec_path)
    _base_model = joblib.load(base_path)
    if os.path.exists(cal_path):
        _calibrated_model = joblib.load(cal_path)
    else:
        _calibrated_model = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager loading artifacts at service startup."""
    load_model_artifacts()
    yield


app = FastAPI(
    title="AgentShield-AI Prompt Injection Classifier",
    description="Standalone ML classification microservice for detecting prompt injection and adversarial directives.",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health", tags=["System"])
async def health():
    """Service health and model readiness probe."""
    is_ready = _vectorizer is not None and _base_model is not None
    return {
        "status": "healthy" if is_ready else "initializing",
        "model_loaded": is_ready,
    }


@app.get("/model-info", response_model=ModelInfoResponse, tags=["Metadata"])
async def model_info():
    """Return metadata about the active ML classifier."""
    if _vectorizer is None or _base_model is None:
        raise HTTPException(status_code=503, detail="Model artifacts are not loaded")

    vocab_len = len(_vectorizer.vocabulary_)
    return ModelInfoResponse(
        vocabulary_size=vocab_len,
        n_features=_base_model.n_features_in_,
    )


@app.post("/predict", response_model=PredictionResponse, tags=["Inference"])
async def predict(request: PredictionRequest):
    """Classify natural language text as SAFE or SUSPICIOUS.

    Computes:
    - Label based on decision margin
    - Probability from CalibratedClassifierCV (Platt scaling)
    - Normalized risk score (0-100)
    """
    if _vectorizer is None or _base_model is None:
        load_model_artifacts()

    raw_text = request.text
    processed = clean_text(raw_text)

    # Vectorize
    vec = _vectorizer.transform([processed])

    # Raw margin w^T * x + b
    decision_margin = float(_base_model.decision_function(vec)[0])

    # Probability estimation (using calibrated model if available)
    if _calibrated_model is not None:
        prob_suspicious = float(_calibrated_model.predict_proba(vec)[0, 1])
    else:
        prob_suspicious = float(_base_model.predict_proba(vec)[0, 1])

    # Binary classification threshold at 0.5
    is_suspicious = bool(prob_suspicious >= 0.5 or decision_margin > 0.0)
    label = "SUSPICIOUS" if is_suspicious else "SAFE"
    risk_score = round(prob_suspicious * 100.0, 1)

    return PredictionResponse(
        text=raw_text,
        label=label,
        is_suspicious=is_suspicious,
        calibrated_probability=round(prob_suspicious, 4),
        decision_margin=round(decision_margin, 4),
        risk_score=risk_score,
    )

