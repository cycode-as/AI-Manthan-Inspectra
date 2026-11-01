from dataclasses import dataclass, asdict
from typing import Any


@dataclass
class InspectionResult:
    category: str
    product_type: str
    prediction: str
    anomaly_score: float | None
    anomaly_map_path: str | None
    model_version: str
    inference_time_ms: float
    defects: list[dict[str, Any]]
    error: str | None = None

    def to_dict(self):
        return asdict(self)