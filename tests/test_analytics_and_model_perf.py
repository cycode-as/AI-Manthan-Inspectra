"""
tests/test_analytics_and_model_perf.py
--------------------------------------
Verifies:
1. GET /api/analytics returns correct response structure, defect rates,
   category breakdowns, and does NOT conflate decisions with product categories.
2. GET /api/model/performance returns genuine model architecture, measured latency,
   inspection distribution, and explicit un-evaluated status for AUROC/F1.
"""

import sys
from pathlib import Path
import json

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from database.database import SessionLocal, init_db
from database.models import Inspection
from routes.analytics import get_analytics, get_model_performance


def test_analytics_and_model_performance_endpoints():
    init_db()
    db = SessionLocal()
    try:
        # 1. Test GET /api/analytics
        res = get_analytics(db)
        assert res.status_code == 200
        body = json.loads(res.body.decode("utf-8"))
        print("\nAnalytics API response sample:")
        print(f"Total: {body['total_inspections']}, Passed: {body['passed']}, Rejected: {body['rejected']}, Review: {body['needs_review']}")
        print(f"Defect Rate: {body['defect_rate']}%, Pass Rate: {body['pass_rate']}%")
        print(f"Defect Distribution: {body['defect_distribution']}")
        print(f"Category Breakdown count: {len(body['category_breakdown'])}")

        assert "total_inspections" in body
        assert "defect_rate" in body
        assert "pass_rate" in body
        assert "defect_distribution" in body
        assert "category_breakdown" in body
        assert isinstance(body["category_breakdown"], list)

        # Check that categories in category_breakdown are actual product categories, NOT decisions
        for item in body["category_breakdown"]:
            assert item["category"] not in ["PASS", "REJECT", "NEEDS REVIEW"]
            assert "total_inspections" in item
            assert "anomalies_detected" in item
            assert "normal_count" in item
            assert "passed" in item
            assert "rejected" in item
            assert "needs_review" in item
            assert "anomaly_rate" in item

        # 2. Test GET /api/model/performance
        perf_res = get_model_performance(db)
        assert perf_res.status_code == 200
        perf_body = json.loads(perf_res.body.decode("utf-8"))
        print("\nModel Performance API response sample:")
        print(f"Model: {perf_body['model_info']['name']}, Backbone: {perf_body['model_info']['backbone']}")
        print(f"Inference Latencies: avg={perf_body['inference_performance']['average_inference_time_ms']}ms")
        print(f"Inspection Perf: {perf_body['inspection_performance']}")
        print(f"Evaluation Metrics: evaluated={perf_body['evaluation_metrics']['evaluated']}, status={perf_body['evaluation_metrics']['status']}")

        assert perf_body["model_info"]["architecture"] == "PatchCore Anomaly Detection"
        assert perf_body["model_info"]["model_version"] == "patchcore-v1"
        assert "inference_performance" in perf_body
        assert "inspection_performance" in perf_body
        assert perf_body["evaluation_metrics"]["evaluated"] is False
        assert perf_body["evaluation_metrics"]["image_level_auroc"] is None

        print("\nPASS: All analytics and model performance endpoint tests passed successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    test_analytics_and_model_performance_endpoints()
