"""
services/decision_engine.py
----------------------------
Converts a numeric anomaly score into one of three inspection decisions.

CONTRACT (agreed with all members):
    PASS         — score < SAFE_THRESHOLD
    NEEDS REVIEW — SAFE_THRESHOLD <= score < REJECT_THRESHOLD
    REJECT       — score >= REJECT_THRESHOLD

⚠  THRESHOLDS ARE PROVISIONAL.
   These values must be calibrated against real validation data before
   the final demonstration. Do not treat them as validated quality gates.

SAFETY RULE:
    Invalid, non-finite, or missing scores must NEVER produce PASS.
    Any ambiguous input returns REJECT as the safe default.
"""

import logging
import math

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Threshold configuration
# Change these values here only — do not hardcode elsewhere.
# ---------------------------------------------------------------------------
SAFE_THRESHOLD   = 0.30   # Below this → PASS
REJECT_THRESHOLD = 0.70   # At or above this → REJECT
                           # Between the two  → NEEDS REVIEW

# Decision label constants — use these everywhere, never raw strings
DECISION_PASS         = "PASS"
DECISION_NEEDS_REVIEW = "NEEDS REVIEW"
DECISION_REJECT       = "REJECT"


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------
def make_decision(anomaly_score: float) -> str:
    """
    Converts an anomaly score to an inspection decision.

    Parameters
    ----------
    anomaly_score : float
        The confidence score from the AI engine, expected in [0.0, 1.0].

    Returns
    -------
    str
        One of: "PASS", "NEEDS REVIEW", "REJECT"

    Safety behaviour
    ----------------
    - NaN, Inf, -Inf         → REJECT  (never PASS on bad data)
    - Score outside [0, 1]   → REJECT  (treat out-of-range as worst case)
    - Non-numeric type       → REJECT
    """
    # --- Type check -------------------------------------------------------
    if not isinstance(anomaly_score, (int, float)):
        logger.error(
            "Decision engine received non-numeric score: %r — defaulting to REJECT",
            anomaly_score,
        )
        return DECISION_REJECT

    # --- Finite check -----------------------------------------------------
    if math.isnan(anomaly_score) or math.isinf(anomaly_score):
        logger.error(
            "Decision engine received non-finite score: %s — defaulting to REJECT",
            anomaly_score,
        )
        return DECISION_REJECT

    # --- Range check ------------------------------------------------------
    if anomaly_score < 0.0 or anomaly_score > 1.0:
        logger.warning(
            "Score %.4f is outside [0, 1] — defaulting to REJECT",
            anomaly_score,
        )
        return DECISION_REJECT

    # --- Main decision logic ----------------------------------------------
    if anomaly_score < SAFE_THRESHOLD:
        decision = DECISION_PASS
    elif anomaly_score < REJECT_THRESHOLD:
        decision = DECISION_NEEDS_REVIEW
    else:
        decision = DECISION_REJECT

    logger.info(
        "Decision: score=%.4f thresholds=[%.2f, %.2f) → %s",
        anomaly_score, SAFE_THRESHOLD, REJECT_THRESHOLD, decision,
    )
    return decision


# ---------------------------------------------------------------------------
# Boundary helper (used in tests and future calibration tooling)
# ---------------------------------------------------------------------------
def get_thresholds() -> dict:
    """Returns the current threshold configuration as a dict."""
    return {
        "safe_threshold":   SAFE_THRESHOLD,
        "reject_threshold": REJECT_THRESHOLD,
    }
