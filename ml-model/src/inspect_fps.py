"""Diagnostic script to inspect False Positives and feature weights."""

import os
import joblib
import numpy as np
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
ARTIFACTS_DIR = os.path.join(BASE_DIR, "artifacts")

test_df = pd.read_csv(os.path.join(DATA_DIR, "test.csv"))
vec = joblib.load(os.path.join(ARTIFACTS_DIR, "vectorizer.joblib"))
model = joblib.load(os.path.join(ARTIFACTS_DIR, "model.joblib"))

feature_names = np.array(vec.get_feature_names_out())
coefs = model.coef_[0]

X_test_vec = vec.transform(test_df["text"].str.lower())
preds = model.predict(X_test_vec)
probs = model.predict_proba(X_test_vec)[:, 1]
margins = model.decision_function(X_test_vec)

test_df["pred"] = preds
test_df["prob"] = probs
test_df["margin"] = margins

safe_samples = test_df[test_df["label"] == "SAFE"]
fps = safe_samples[safe_samples["pred"] == 1]
tns = safe_samples[safe_samples["pred"] == 0]

print("=================================================================")
print("FALSE POSITIVE DIAGNOSTIC INSPECTION")
print("=================================================================")
print(f"Total SAFE test samples: {len(safe_samples)}")
print(f"  - True Negatives:      {len(tns)}")
print(f"  - False Positives:     {len(fps)}")
print("\nFalse Positives by Semantic Group:")
for group, count in fps["group_id"].value_counts().items():
    print(f"  * {group}: {count}/{len(safe_samples[safe_samples['group_id'] == group])}")

print("\n-----------------------------------------------------------------")
print("Detailed False Positive Samples with Feature Attribution:")
print("-----------------------------------------------------------------")

for idx, row in fps.iterrows():
    text = row["text"]
    vec_row = vec.transform([text.lower()])
    non_zero_indices = vec_row.nonzero()[1]
    
    # Calculate word-level contributions: tfidf * coef
    contributions = []
    for feat_idx in non_zero_indices:
        feat_name = feature_names[feat_idx]
        val = vec_row[0, feat_idx]
        weight = coefs[feat_idx]
        contrib = val * weight
        contributions.append((feat_name, val, weight, contrib))
    
    # Sort by positive contribution (pushing toward SUSPICIOUS)
    contributions.sort(key=lambda x: x[3], reverse=True)
    
    print(f"\n[ID: {idx}] Group: {row['group_id']}")
    print(f"Text: '{text}'")
    print(f"Decision Margin: {row['margin']:+.4f} | Prob: {row['prob']:.4f}")
    print("Top positive features (pushing toward SUSPICIOUS):")
    for feat_name, val, weight, contrib in contributions[:5]:
        if contrib > 0:
            print(f"   + '{feat_name}': tfidf={val:.3f}, weight={weight:+.3f} -> contrib={contrib:+.4f}")
    print("Top negative features (pushing toward SAFE):")
    for feat_name, val, weight, contrib in sorted(contributions, key=lambda x: x[3])[:3]:
        if contrib < 0:
            print(f"   - '{feat_name}': tfidf={val:.3f}, weight={weight:+.3f} -> contrib={contrib:+.4f}")

print("\n=================================================================")
print("Overall Model Intercept:", model.intercept_[0])
print("Top 15 Most Suspicious Features across entire vocabulary:")
top_suspicious_idx = np.argsort(coefs)[-15:][::-1]
for i in top_suspicious_idx:
    print(f"  {feature_names[i]:<25}: {coefs[i]:+.4f}")

print("\nTop 15 Most Safe Features across entire vocabulary:")
top_safe_idx = np.argsort(coefs)[:15]
for i in top_safe_idx:
    print(f"  {feature_names[i]:<25}: {coefs[i]:+.4f}")
print("=================================================================")

