"""
tests/test_decision_engine.py
------------------------------
Unit tests for services/decision_engine.py

Tests every threshold boundary and every safety edge case.
These tests do NOT require a DB or HTTP client.
"""

import math
import sys
from pathlib import Path

import pytest

# Ensure backend/ is on path (also done by conftest, but kept here for
# running this file in isolation with: pytest tests/test_decision_engine.py)
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.decision_engine import (
    make_decision,
    get_thresholds,
    DECISION_PASS,
    DECISION_NEEDS_REVIEW,
    DECISION_REJECT,
    SAFE_THRESHOLD,
    REJECT_THRESHOLD,
)


# ---------------------------------------------------------------------------
# Happy path — normal scores
# ---------------------------------------------------------------------------

def test_score_zero_is_pass():
    assert make_decision(0.0) == DECISION_PASS


def test_score_just_below_safe_threshold_is_pass():
    assert make_decision(SAFE_THRESHOLD - 0.001) == DECISION_PASS


def test_score_at_safe_threshold_is_needs_review():
    # SAFE_THRESHOLD is the lower boundary of NEEDS REVIEW (inclusive)
    assert make_decision(SAFE_THRESHOLD) == DECISION_NEEDS_REVIEW


def test_score_midpoint_is_needs_review():
    mid = (SAFE_THRESHOLD + REJECT_THRESHOLD) / 2
    assert make_decision(mid) == DECISION_NEEDS_REVIEW


def test_score_just_below_reject_threshold_is_needs_review():
    assert make_decision(REJECT_THRESHOLD - 0.001) == DECISION_NEEDS_REVIEW


def test_score_at_reject_threshold_is_reject():
    # REJECT_THRESHOLD is the lower boundary of REJECT (inclusive)
    assert make_decision(REJECT_THRESHOLD) == DECISION_REJECT


def test_score_above_reject_threshold_is_reject():
    assert make_decision(REJECT_THRESHOLD + 0.1) == DECISION_REJECT


def test_score_one_is_reject():
    assert make_decision(1.0) == DECISION_REJECT


# ---------------------------------------------------------------------------
# Safety cases — invalid inputs must NEVER produce PASS
# ---------------------------------------------------------------------------

def test_nan_is_reject():
    assert make_decision(float("nan")) == DECISION_REJECT


def test_positive_inf_is_reject():
    assert make_decision(float("inf")) == DECISION_REJECT


def test_negative_inf_is_reject():
    assert make_decision(float("-inf")) == DECISION_REJECT


def test_negative_score_is_reject():
    assert make_decision(-0.1) == DECISION_REJECT


def test_score_above_one_is_reject():
    assert make_decision(1.1) == DECISION_REJECT


def test_string_input_is_reject():
    assert make_decision("high") == DECISION_REJECT  # type: ignore[arg-type]


def test_none_input_is_reject():
    assert make_decision(None) == DECISION_REJECT  # type: ignore[arg-type]


def test_list_input_is_reject():
    assert make_decision([0.5]) == DECISION_REJECT  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# Decision labels are exact contract strings
# ---------------------------------------------------------------------------

def test_pass_label_exact():
    assert make_decision(0.0) == "PASS"


def test_needs_review_label_exact():
    assert make_decision(SAFE_THRESHOLD) == "NEEDS REVIEW"


def test_reject_label_exact():
    assert make_decision(1.0) == "REJECT"


# ---------------------------------------------------------------------------
# Threshold configuration
# ---------------------------------------------------------------------------

def test_get_thresholds_returns_dict():
    t = get_thresholds()
    assert isinstance(t, dict)
    assert "safe_threshold"   in t
    assert "reject_threshold" in t


def test_thresholds_are_ordered():
    t = get_thresholds()
    assert t["safe_threshold"] < t["reject_threshold"]


def test_safe_threshold_value():
    assert SAFE_THRESHOLD == 0.30


def test_reject_threshold_value():
    assert REJECT_THRESHOLD == 0.70
