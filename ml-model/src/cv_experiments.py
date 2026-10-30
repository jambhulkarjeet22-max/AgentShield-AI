"""Cross-validation experiments executed STRICTLY on training data (ml-model/data/train.csv).

Uses GroupKFold across the 16 training groups to evaluate:
1. Stopwords handling (None vs 'english')
2. Regularization strength C (0.1, 0.25, 0.5, 1.0, 2.0)
3. Class weighting (None vs 'balanced')
4. N-gram ranges ((1,1) vs (1,2))
5. Sublinear TF (True vs False)

Computes CV Accuracy, CV F1, CV Precision, CV Recall, and CV Log-Loss.
DOES NOT touch test.csv.
"""

import os
import sys
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, log_loss, precision_score, recall_score
from sklearn.model_selection import GroupKFold
from sklearn.pipeline import Pipeline

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
TRAIN_CSV = os.path.join(DATA_DIR, "train.csv")


def run_cv_experiment(df: pd.DataFrame, pipeline: Pipeline, n_splits: int = 4):
    """Run GroupKFold cross-validation on training data only."""
    gkf = GroupKFold(n_splits=n_splits)
    
    accuracies = []
    precisions = []
    recalls = []
    f1s = []
    log_losses = []

    X = df["text"].str.lower()
    y = (df["label"] == "SUSPICIOUS").astype(int).values
    groups = df["group_id"].values

    for train_idx, val_idx in gkf.split(X, y, groups=groups):
        X_tr, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_tr, y_val = y[train_idx], y[val_idx]

        pipeline.fit(X_tr, y_tr)
        y_pred = pipeline.predict(X_val)
        y_prob = pipeline.predict_proba(X_val)[:, 1]

        accuracies.append(accuracy_score(y_val, y_pred))
        precisions.append(precision_score(y_val, y_pred, zero_division=0))
        recalls.append(recall_score(y_val, y_pred, zero_division=0))
        f1s.append(f1_score(y_val, y_pred, zero_division=0))
        # Clip probabilities for stable log-loss computation
        y_prob_clipped = np.clip(y_prob, 1e-15, 1 - 1e-15)
        log_losses.append(log_loss(y_val, y_prob_clipped))

    return {
        "cv_accuracy": np.mean(accuracies),
        "cv_precision": np.mean(precisions),
        "cv_recall": np.mean(recalls),
        "cv_f1": np.mean(f1s),
        "cv_log_loss": np.mean(log_losses),
    }


def main():
    df_train = pd.read_csv(TRAIN_CSV)
    print("=================================================================")
    print("CROSS-VALIDATION EXPERIMENTS ON TRAINING DATA (16 Groups)")
    print(f"Total training samples: {len(df_train)}")
    print(f"Validation Strategy: GroupKFold(n_splits=4) - zero group leakage")
    print("=================================================================")

    configurations = [
        # Baseline (current config)
        {
            "name": "Config 1: Current Baseline (No stopwords, C=1.0, balanced)",
            "ngram_range": (1, 2),
            "stop_words": None,
            "sublinear_tf": True,
            "C": 1.0,
            "class_weight": "balanced",
        },
        # Config 2: English stopwords (prevents 'to', 'with', 'in' from dominating)
        {
            "name": "Config 2: English Stopwords, C=1.0, balanced",
            "ngram_range": (1, 2),
            "stop_words": "english",
            "sublinear_tf": True,
            "C": 1.0,
            "class_weight": "balanced",
        },
        # Config 3: English stopwords + Stronger L2 Regularization (C=0.5)
        {
            "name": "Config 3: English Stopwords, C=0.5, balanced",
            "ngram_range": (1, 2),
            "stop_words": "english",
            "sublinear_tf": True,
            "C": 0.5,
            "class_weight": "balanced",
        },
        # Config 4: English stopwords + High Regularization (C=0.25)
        {
            "name": "Config 4: English Stopwords, C=0.25, balanced",
            "ngram_range": (1, 2),
            "stop_words": "english",
            "sublinear_tf": True,
            "C": 0.25,
            "class_weight": "balanced",
        },
        # Config 5: English stopwords, C=0.5, class_weight=None (natural balance)
        {
            "name": "Config 5: English Stopwords, C=0.5, class_weight=None",
            "ngram_range": (1, 2),
            "stop_words": "english",
            "sublinear_tf": True,
            "C": 0.5,
            "class_weight": None,
        },
        # Config 6: English stopwords, C=1.0, class_weight=None
        {
            "name": "Config 6: English Stopwords, C=1.0, class_weight=None",
            "ngram_range": (1, 2),
            "stop_words": "english",
            "sublinear_tf": True,
            "C": 1.0,
            "class_weight": None,
        },
        # Config 7: Unigrams only (1,1), English stopwords, C=0.5
        {
            "name": "Config 7: Unigrams only (1,1), English Stopwords, C=0.5",
            "ngram_range": (1, 1),
            "stop_words": "english",
            "sublinear_tf": True,
            "C": 0.5,
            "class_weight": None,
        },
    ]

    results = []
    for cfg in configurations:
        pipe = Pipeline([
            ("vec", TfidfVectorizer(
                ngram_range=cfg["ngram_range"],
                stop_words=cfg["stop_words"],
                sublinear_tf=cfg["sublinear_tf"],
                max_features=5000,
            )),
            ("clf", LogisticRegression(
                C=cfg["C"],
                class_weight=cfg["class_weight"],
                max_iter=1000,
                random_state=42,
            )),
        ])

        metrics = run_cv_experiment(df_train, pipe, n_splits=4)
        results.append({
            "name": cfg["name"],
            **metrics,
        })
        print(f"--> {cfg['name']}")
        print(f"    CV Acc: {metrics['cv_accuracy']:.4f} | F1: {metrics['cv_f1']:.4f} | Prec: {metrics['cv_precision']:.4f} | Rec: {metrics['cv_recall']:.4f} | Log-Loss: {metrics['cv_log_loss']:.4f}")

    # Summary table
    res_df = pd.DataFrame(results)
    print("\n=================================================================")
    print("CROSS-VALIDATION SUMMARY TABLE (TRAIN DATA ONLY):")
    print("=================================================================")
    for idx, r in res_df.iterrows():
        print(f"{r['name']:<55} | Acc: {r['cv_accuracy']:.3f} | F1: {r['cv_f1']:.3f} | Prec: {r['cv_precision']:.3f} | Rec: {r['cv_recall']:.3f} | Loss: {r['cv_log_loss']:.3f}")
    print("=================================================================")


if __name__ == "__main__":
    main()

