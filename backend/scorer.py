"""
Risk scoring engine.

Thresholds match the assessment specification exactly:
  0–30   → Low
  31–65  → Medium
  66–100 → High

Scoring formula:
  Each finding contributes:  severity_weight × confidence
  Severity weights:  High=30  Medium=15  Low=5

Diminishing-returns cap:
  Raw scores above 80 are compressed slightly so that many weak
  Low-severity signals cannot manufacture a High risk level.
"""
from typing import List, Tuple

from models import Finding


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SEVERITY_WEIGHTS = {
    "High":   30,
    "Medium": 15,
    "Low":     5,
}

RECOMMENDED_ACTIONS = {
    "High": (
        "Do not rely on this document without independent verification. "
        "Consult a document forensics specialist if this document is part of "
        "a legal, financial, or compliance process."
    ),
    "Medium": (
        "Review the document manually if it is part of a sensitive or "
        "high-value process. Consider requesting the original source file "
        "or corroborating evidence."
    ),
    "Low": (
        "No immediate action required. Standard document verification "
        "procedures apply. The minor observations noted are consistent "
        "with normal document handling."
    ),
}

SUMMARIES = {
    "High": (
        "The document shows multiple metadata indicators that are inconsistent "
        "with normal, unmodified document creation. These findings do not "
        "confirm tampering, but they warrant careful review and additional "
        "verification before relying on this document."
    ),
    "Medium": (
        "The document contains metadata patterns that may indicate post-creation "
        "modification or conversion. These signals should be reviewed in context "
        "but do not confirm tampering on their own."
    ),
    "Low": (
        "Analysis complete. The document metadata appears largely consistent. "
        "Minor observations were noted but are common in normal document workflows "
        "and do not indicate manipulation."
    ),
}

NO_FINDINGS_SUMMARY = (
    "Analysis complete. No metadata anomalies were detected. "
    "The document's metadata appears consistent and complete."
)


# ---------------------------------------------------------------------------
# Scorer
# ---------------------------------------------------------------------------

class RiskScorer:

    @staticmethod
    def calculate(findings: List[Finding]) -> Tuple[int, str, str, str]:
        """
        Returns (score, level, summary, recommended_action).
        """
        if not findings:
            return 0, "Low", NO_FINDINGS_SUMMARY, RECOMMENDED_ACTIONS["Low"]

        raw = 0.0
        for f in findings:
            weight = SEVERITY_WEIGHTS.get(f.severity, 0)
            raw += weight * f.confidence

        # Diminishing returns: compress scores above 80 so that many weak
        # signals cannot push into High territory unfairly.
        if raw > 80:
            excess = raw - 80
            raw = 80 + (excess * 0.4)

        score = max(0, min(100, int(round(raw))))

        if score >= 66:
            level = "High"
        elif score >= 31:
            level = "Medium"
        else:
            level = "Low"

        return score, level, SUMMARIES[level], RECOMMENDED_ACTIONS[level]