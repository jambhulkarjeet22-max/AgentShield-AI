"""Text preprocessing utilities for Prompt Injection ML model."""

import re
import unicodedata
from typing import List


def clean_text(text: str) -> str:
    """Normalize and clean raw prompt text for TF-IDF feature extraction.

    - Normalizes unicode characters (NFKC).
    - Preserves crucial punctuation patterns and tag delimiters (e.g., </system>, ```, <|im_start|>).
    - Normalizes consecutive whitespace.
    """
    if not isinstance(text, str):
        return ""

    # Normalize unicode
    text = unicodedata.normalize("NFKC", text)

    # Replace tabs/newlines with single spaces while preserving word boundaries
    text = re.sub(r"[\r\n\t]+", " ", text)

    # Normalize multiple whitespace characters
    text = re.sub(r"\s+", " ", text).strip()

    # Convert to lowercase for standard tokenization
    return text.lower()


def batch_clean(texts: List[str]) -> List[str]:
    """Clean a batch of text strings."""
    return [clean_text(t) for t in texts]

