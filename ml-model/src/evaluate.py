"""Evaluation script for AgentShield-AI Prompt Injection Detection model.

Evaluates the trained model on the exact reproducible held-out test split (ml-model/data/test.csv).
Computes:
1. Accuracy
2. Precision
3. Recall
4. F1-Score
5. Confusion Matrix
6. Probability Calibration Evaluation (Brier Score Loss & Log Loss)

Outputs metrics to console and writes ml-model/artifacts/metrics.json.
"""

import json
import os
import sys
from typing import Any, Dict
import joblib
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    log_loss,
    precision_score,
    recall_score,
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from src.preprocessor import clean_text

DATA_DIR = os.path.join(BASE_DIR, "data")
ARTIFACTS_DIR = os.path.join(BASE_DIR, "artifacts")
TEST_CSV = os.path.join(DATA_DIR, "test.csv")


def load_test_data():
    """Load the exact reproducible test split."""
    if not os.path.exists(TEST_CSV):
        raise FileNotFoundError(f"Test data split not found at {TEST_CSV}. Run generate_dataset.py first.")

    df = pd.read_csv(TEST_CSV)
    X = df["text"].apply(clean_text)
    y = (df["label"] == "SUSPICIOUS").astype(int)
    return X, y, df


def load_artifacts():
    """Load the trained vectorizer and models from artifacts directory."""
    vec_path = os.path.join(ARTIFACTS_DIR, "vectorizer.joblib")
    base_path = os.path.join(ARTIFACTS_DIR, "model.joblib")
    cal_path = os.path.join(ARTIFACTS_DIR, "calibrated_model.joblib")

    if not os.path.exists(vec_path) or not os.path.exists(base_path):
        raise FileNotFoundError("Model artifacts not found. Run train.py before evaluating.")

    vectorizer = joblib.load(vec_path)
    base_model = joblib.load(base_path)
    calibrated_model = joblib.load(cal_path) if os.path.exists(cal_path) else None

    return vectorizer, base_model, calibrated_model


def evaluate_model() -> Dict[str, Any]:
    """Run full evaluation suite on the held-out test split."""
    X_test, y_test, df_test = load_test_data()
    vectorizer, base_model, calibrated_model = load_artifacts()

    X_test_vec = vectorizer.transform(X_test)
    y_pred = base_model.predict(X_test_vec)
    y_prob_base = base_model.predict_proba(X_test_vec)[:, 1]

    # Compute base classification metrics
    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, zero_division=0))
    rec = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_pred, zero_division=0))

    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = [int(v) for v in cm.ravel()]

    metrics: Dict[str, Any] = {
        "dataset_split": {
            "test_sample_count": len(y_test),
            "safe_count": int((y_test == 0).sum()),
            "suspicious_count": int((y_test == 1).sum()),
            "semantic_test_groups": df_test["group_id"].unique().tolist(),
        },
        "classification_metrics": {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
        },
        "confusion_matrix": {
            "true_negatives": tn,
            "false_positives": fp,
            "false_negatives": fn,
            "true_positives": tp,
            "matrix_2x2": [[tn, fp], [fn, tp]],
        },
        "calibration_evaluation": {
            "uncalibrated_log_loss": round(float(log_loss(y_test, y_prob_base)), 4),
            "uncalibrated_brier_score": round(float(brier_score_loss(y_test, y_prob_base)), 4),
        },
    }

    if calibrated_model is not None:
        y_prob_cal = calibrated_model.predict_proba(X_test_vec)[:, 1]
        metrics["calibration_evaluation"]["calibrated_log_loss"] = round(float(log_loss(y_test, y_prob_cal)), 4)
        metrics["calibration_evaluation"]["calibrated_brier_score"] = round(float(brier_score_loss(y_test, y_prob_cal)), 4)

    # Save metrics JSON
    metrics_path = os.path.join(ARTIFACTS_DIR, "metrics.json")
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    return metrics


def print_evaluation_report(metrics: Dict[str, Any]) -> None:
    """Print clean, un-fabricated evaluation report to console."""
    ds = metrics["dataset_split"]
    cm = metrics["confusion_matrix"]
    cm_mat = cm["matrix_2x2"]
    cls_m = metrics["classification_metrics"]
    cal_m = metrics["calibration_evaluation"]

    print("=================================================================")
    print("AgentShield-AI ML Model Evaluation Report")
    print("=================================================================")
    print(f"Test Split Size:         {ds['test_sample_count']} samples")
    print(f"  - Actual SAFE:         {ds['safe_count']}")
    print(f"  - Actual SUSPICIOUS:   {ds['suspicious_count']}")
    print(f"Test Groups Evaluated:   {ds['semantic_test_groups']}")
    print("-----------------------------------------------------------------")
    print("Classification Metrics (Exact Scikit-Learn Output):")
    print(f"  - Accuracy:            {cls_m['accuracy']:.4f}")
    print(f"  - Precision:           {cls_m['precision']:.4f}")
    print(f"  - Recall:              {cls_m['recall']:.4f}")
    print(f"  - F1-Score:            {cls_m['f1_score']:.4f}")
    print("-----------------------------------------------------------------")
    print("Confusion Matrix:")
    print(f"                   Predicted SAFE    Predicted SUSPICIOUS")
    print(f"  Actual SAFE       TN = {cm_mat[0][0]:<5}       FP = {cm_mat[0][1]:<5}")
    print(f"  Actual SUSP       FN = {cm_mat[1][0]:<5}       TP = {cm_mat[1][1]:<5}")
    print("-----------------------------------------------------------------")
    print("Probability Calibration Evaluation:")
    print(f"  - Uncalibrated Log-Loss:     {cal_m['uncalibrated_log_loss']:.4f}")
    print(f"  - Uncalibrated Brier Score:  {cal_m['uncalibrated_brier_score']:.4f}")
    if "calibrated_brier_score" in cal_m:
        print(f"  - Calibrated Log-Loss:       {cal_m['calibrated_log_loss']:.4f}")
        print(f"  - Calibrated Brier Score:    {cal_m['calibrated_brier_score']:.4f}")
    print("-----------------------------------------------------------------")
    print("Notice: Logistic Regression probability is an empirical statistical")
    print("heuristic. It is NOT guaranteed confidence and must be interpreted")
    print("alongside deterministic policy guardrails.")
    print("=================================================================")


def main():
    metrics = evaluate_model()
    print_evaluation_report(metrics)


if __name__ == "__main__":
    main()

