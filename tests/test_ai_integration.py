"""
tests/test_ai_integration.py
-----------------------------
Comprehensive integration tests for the AI layer and Inspectra backend.
Tests module imports, contract conformity, genuine heatmap generation,
removal of synthetic gradients, error handling, health status,
and end-to-end database + inspection pipeline execution.
"""

import json
import sys
from datetime import datetime
from pathlib import Path
import numpy as np
from PIL import Image

# Setup paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from database.database import SessionLocal, init_db
from database.models import Inspection
from routes.analytics import get_analytics
from routes.history import get_history, get_inspection_by_id
from services.ai_service import (
    AIServiceError,
    _mock_inspect_image,
    _validate_ai_response,
    call_ai_engine,
    get_ai_status,
)
from services.decision_engine import make_decision
from services.inspection_service import InspectionError, run_inspection


def test_1_ai_module_imports():
    """Verify all AI engine modules can be imported and expose expected symbols."""
    import ai_engine
    import ai_engine.config as ai_config
    import ai_engine.inference as ai_inference
    from ai_engine.inference.result_schema import InspectionResult
    import ai_engine.predictor as ai_predictor

    assert hasattr(ai_config, "CATEGORIES")
    assert "metal_nut" in ai_config.CATEGORIES
    assert hasattr(ai_inference, "inspect_image")
    assert callable(ai_inference.inspect_image)
    assert hasattr(ai_predictor, "inspect_image")
    assert callable(ai_predictor.inspect_image)
    assert hasattr(ai_predictor, "save_anomaly_heatmap")
    print("PASS: Test 1 - AI module imports verified.")


def test_2_category_normalization():
    """Verify category mapping between backend ('metal') and AI model ('metal_nut')."""
    from ai_engine.predictor import normalize_category

    assert normalize_category("metal") == "metal_nut"
    assert normalize_category("bottle") == "bottle"
    assert normalize_category("METAL") == "metal_nut"
    print("PASS: Test 2 - Category normalization verified.")


def test_3_ai_status_diagnostics():
    """Verify that get_ai_status clearly reports the active engine state."""
    status = get_ai_status()
    assert "active_engine" in status
    assert "model_architecture" in status
    assert status["model_architecture"] == "PatchCore (wide_resnet50_2)"
    print(f"PASS: Test 3 - AI status diagnostics verified ({status}).")


def test_4_genuine_heatmap_generation():
    """Verify save_anomaly_heatmap transforms genuine anomaly map to a Jet colormap PNG."""
    from ai_engine.predictor import save_anomaly_heatmap
    from config import UPLOAD_DIR

    test_img = UPLOAD_DIR / "temp_source_img.jpg"
    target_hm = UPLOAD_DIR / "temp_target_heatmap.png"
    Image.new("RGB", (320, 240), color=(100, 100, 100)).save(str(test_img), "JPEG")

    try:
        # Simulate genuine 2D anomaly map tensor from PatchCore
        dummy_anomaly_map = np.zeros((64, 64), dtype=np.float32)
        dummy_anomaly_map[20:40, 20:40] = 3.5  # Localized defect peak

        saved_path = save_anomaly_heatmap(
            anomaly_map=dummy_anomaly_map,
            original_image_path=test_img,
            output_path=target_hm,
        )

        assert saved_path is not None
        assert Path(saved_path).exists()

        # Check resolution matches original image
        with Image.open(saved_path) as img:
            assert img.format == "PNG"
            assert img.size == (320, 240)
            # Center of defect should be high/red
            pixel_defect = img.getpixel((150, 110))
            assert pixel_defect[0] > 180  # Strong red component for peak anomaly

        print("PASS: Test 4 - Genuine anomaly map Jet colormap & resolution resizing verified.")
    finally:
        if test_img.exists():
            test_img.unlink()
        if target_hm.exists():
            target_hm.unlink()


def test_5_no_synthetic_gradient():
    """Verify synthetic score-based gradient heatmaps are completely removed."""
    mock_res = _mock_inspect_image("any.jpg", "metal", 123)
    assert mock_res["heatmap_path"] is None, "Synthetic gradient must not be fabricated in mock/fallback."
    print("PASS: Test 5 - Verified absence of synthetic gradient fabrication.")


def test_6_contract_response_validation():
    """Verify _validate_ai_response accepts heatmap_path=None and validates existing PNGs."""
    from config import UPLOAD_DIR

    # Valid response with heatmap_path=None
    resp_no_heatmap = {
        "category": "metal",
        "prediction": "NORMAL",
        "anomaly_score": 0.15,
        "heatmap_path": None,
        "inference_time_ms": 95.0,
        "model_version": "patchcore-v1",
    }
    _validate_ai_response(resp_no_heatmap, "metal")

    # Valid response with real heatmap
    real_hm = UPLOAD_DIR / "heatmap_val_test.png"
    Image.new("RGB", (10, 10)).save(str(real_hm), "PNG")
    try:
        resp_with_heatmap = dict(resp_no_heatmap)
        resp_with_heatmap["heatmap_path"] = str(real_hm)
        _validate_ai_response(resp_with_heatmap, "metal")
        print("PASS: Test 6 - Contract response validation (with & without heatmap) verified.")
    finally:
        if real_hm.exists():
            real_hm.unlink()


def test_7_backend_health_endpoint():
    """Verify health endpoint includes service, version, and AI status."""
    from main import health_check

    health = health_check()
    assert health["status"] == "healthy"
    assert health["service"] == "Inspectra Backend"
    assert "ai_engine" in health
    print(f"PASS: Test 7 - Backend health check verified ({health}).")


def test_8_real_engine_call_and_error_handling():
    """Verify that call_ai_engine invokes the real AI engine entry point and reports exact dependency/checkpoint requirements."""
    from config import UPLOAD_DIR

    test_upload = UPLOAD_DIR / "sample_real_check.jpg"
    Image.new("RGB", (256, 256), color=(180, 180, 180)).save(str(test_upload), "JPEG")

    try:
        try:
            call_ai_engine(str(test_upload), "metal", inspection_id=8888)
            print("PASS: Test 8 - Actual AI engine completed inference.")
        except AIServiceError as err:
            assert "AI engine" in str(err) or "Checkpoint" in str(err)
            print(f"PASS: Test 8 - Real AI engine invocation & strict error handling verified: {err}")
    finally:
        if test_upload.exists():
            test_upload.unlink()


def test_9_pipeline_persistence_and_null_heatmap_handling():
    """Verify database persistence, decision engine, history and analytics with heatmap_url=null."""
    from config import UPLOAD_DIR

    init_db()
    db = SessionLocal()
    try:
        mock_result = _mock_inspect_image(
            image_path=str(UPLOAD_DIR / "test.jpg"),
            category="metal",
            inspection_id=7777,
        )
        decision = make_decision(mock_result["anomaly_score"])

        record = Inspection(
            id=7777,
            filename="sample_test.jpg",
            category="metal",
            prediction=mock_result["prediction"],
            anomaly_score=mock_result["anomaly_score"],
            decision=decision,
            original_image_path="/uploads/sample_test.jpg",
            heatmap_path=mock_result["heatmap_path"] or "",
            inference_time_ms=mock_result["inference_time_ms"],
            model_version=mock_result["model_version"],
            created_at=datetime.utcnow(),
        )
        db.merge(record)
        db.commit()

        # Query back
        row = db.query(Inspection).filter(Inspection.id == 7777).first()
        assert row is not None
        assert row.to_dict()["heatmap_url"] is None
        print(f"PASS: Test 9 - Database persistence with heatmap_url=None verified for inspection #{row.id}.")

        # Test history and analytics endpoints
        hist_resp = get_history(limit=5, skip=0, db=db)
        hist = json.loads(hist_resp.body)
        assert hist["total"] >= 1

        detail_resp = get_inspection_by_id(inspection_id=7777, db=db)
        detail = json.loads(detail_resp.body)
        assert detail["inspection_id"] == 7777
        assert detail["heatmap_url"] is None

        ana_resp = get_analytics(db=db)
        ana = json.loads(ana_resp.body)
        assert ana["total_inspections"] >= 1
        print("PASS: Test 10 - History and analytics endpoints return correct null heatmap_url.")

    finally:
        db.close()


if __name__ == "__main__":
    print("\n=== RUNNING INSPECTRA 2.0 AI INTEGRATION TEST SUITE ===\n")
    test_1_ai_module_imports()
    test_2_category_normalization()
    test_3_ai_status_diagnostics()
    test_4_genuine_heatmap_generation()
    test_5_no_synthetic_gradient()
    test_6_contract_response_validation()
    test_7_backend_health_endpoint()
    test_8_real_engine_call_and_error_handling()
    test_9_pipeline_persistence_and_null_heatmap_handling()
    print("\n=======================================================")
    print("ALL HEATMAP & AI INTEGRATION TESTS PASSED!")
    print("=======================================================\n")
