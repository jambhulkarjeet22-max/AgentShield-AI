"""Model training pipeline for AgentShield-AI Prompt Injection Detection.

Trains:
1. TfidfVectorizer (unigram + bigram text representation).
2. LogisticRegression classifier with balanced class weighting.
3. CalibratedClassifierCV (Platt scaling cross-validated on training set) to avoid
   presenting raw heuristic sigmoid outputs as true confidence.
Saves artifacts to ml-model/artifacts/.
"""

import os
import sys
from typing import Tuple
import joblib
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

# Add ml-model to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from src.preprocessor import clean_text

DATA_DIR = os.path.join(BASE_DIR, "data")
ARTIFACTS_DIR = os.path.join(BASE_DIR, "artifacts")
TRAIN_CSV = os.path.join(DATA_DIR, "train.csv")


def load_training_data() -> Tuple[pd.Series, pd.Series]:
    """Load the reproducible training split."""
    if not os.path.exists(TRAIN_CSV):
        from data.generate_dataset import main as gen_main
        gen_main()

    df = pd.read_csv(TRAIN_CSV)
    # Apply text cleaning
    X = df["text"].apply(clean_text)
    # Binary target: 1 for SUSPICIOUS, 0 for SAFE
    y = (df["label"] == "SUSPICIOUS").astype(int)
    return X, y


def train_pipeline() -> Tuple[TfidfVectorizer, LogisticRegression, CalibratedClassifierCV]:
    """Fit vectorizer, base Logistic Regression, and calibrated classifier."""
    X_train, y_train = load_training_data()

    print(f"Training on {len(X_train)} samples ({y_train.sum()} SUSPICIOUS, {len(y_train) - y_train.sum()} SAFE)...")

    # 1. Feature Extraction: Sublinear TF scaling, unigrams & bigrams
    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        max_features=5000,
        sublinear_tf=True,
        min_df=1,
    )
    X_train_vec = vectorizer.fit_transform(X_train)

    # 2. Base Estimator: Logistic Regression with balanced weighting
    base_model = LogisticRegression(
        C=1.0,
        max_iter=1000,
        class_weight="balanced",
        random_state=42,
        solver="lbfgs",
    )
    base_model.fit(X_train_vec, y_train)

    # 3. Probability Calibration (Requirement 4):
    # Cross-validated Platt scaling (sigmoid) to produce empirically validated probabilities
    calibrated_model = CalibratedClassifierCV(
        estimator=base_model,
        method="sigmoid",
        cv=3,
    )
    calibrated_model.fit(X_train_vec, y_train)

    return vectorizer, base_model, calibrated_model


def save_artifacts(
    vectorizer: TfidfVectorizer,
    base_model: LogisticRegression,
    calibrated_model: CalibratedClassifierCV,
) -> None:
    """Save trained vectorizer and models to artifacts directory."""
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)

    vec_path = os.path.join(ARTIFACTS_DIR, "vectorizer.joblib")
    base_path = os.path.join(ARTIFACTS_DIR, "model.joblib")
    cal_path = os.path.join(ARTIFACTS_DIR, "calibrated_model.joblib")

    joblib.dump(vectorizer, vec_path)
    joblib.dump(base_model, base_path)
    joblib.dump(calibrated_model, cal_path)

    print(f"Saved vectorizer to:        {vec_path}")
    print(f"Saved base model to:        {base_path}")
    print(f"Saved calibrated model to:  {cal_path}")


def main():
    print("=================================================================")
    print("AgentShield-AI ML Model Training")
    print("=================================================================")
    vectorizer, base_model, calibrated_model = train_pipeline()
    save_artifacts(vectorizer, base_model, calibrated_model)
    print("Training successfully completed.")
    print("=================================================================")


if __name__ == "__main__":
    main()

