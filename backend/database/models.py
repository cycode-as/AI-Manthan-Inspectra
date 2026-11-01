"""
database/models.py
------------------
SQLAlchemy ORM model for the inspections table.

Each row represents one complete inspection: the uploaded image, the AI
engine's prediction, the decision engine's verdict, and file paths for
serving the original image and the AI-generated heatmap.
"""

from datetime import datetime
from pathlib import Path
from sqlalchemy import Integer, String, Float, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from database.database import Base


class Inspection(Base):
    """
    Stores every inspection result produced by the system.
    """

    __tablename__ = "inspections"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True, autoincrement=True
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    prediction: Mapped[str] = mapped_column(String(50), nullable=False)
    anomaly_score: Mapped[float] = mapped_column(Float, nullable=False)
    decision: Mapped[str] = mapped_column(String(50), nullable=False)
    original_image_path: Mapped[str] = mapped_column(String(512), nullable=False)
    heatmap_path: Mapped[str | None] = mapped_column(String(512), nullable=True, default="")
    inference_time_ms: Mapped[float] = mapped_column(Float, nullable=False)
    model_version: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )

    def to_dict(self) -> dict:
        """
        Returns a plain dict safe for JSON serialisation.
        """
        orig_name = Path(self.original_image_path).name if self.original_image_path else ""
        heat_name = Path(self.heatmap_path).name if self.heatmap_path and self.heatmap_path.strip() else None

        return {
            "inspection_id": self.id,
            "filename": self.filename,
            "category": self.category,
            "prediction": self.prediction,
            "anomaly_score": self.anomaly_score,
            "decision": self.decision,
            "original_image_url": f"/uploads/{orig_name}" if orig_name else None,
            "heatmap_url": f"/uploads/{heat_name}" if heat_name else None,
            "inference_time_ms": self.inference_time_ms,
            "model_version": self.model_version,
            "created_at": self.created_at.isoformat(),
        }
