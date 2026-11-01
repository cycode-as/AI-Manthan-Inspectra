# INSPECTRA 2.0 — Shared Integration Contracts

These contracts are the shared technical agreements for all three project members. Endpoint names, function names, and response field names must not be changed without discussion and agreement.

## 1. Team ownership

| Member | Responsibility |
|---|---|
| Member 1 | AI inference and heatmap generation |
| Member 2 | Backend APIs, decisions, database, image storage |
| Member 3 | Frontend and visualization |

## 2. Backend API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Backend status |
| GET | `/health` | Backend health check |
| POST | `/api/inspect` | Inspect an uploaded product image |
| GET | `/api/history` | Fetch all inspection records |
| GET | `/api/history/{inspection_id}` | Fetch one inspection |
| GET | `/api/analytics` | Fetch dashboard statistics |
| GET | `/uploads/{filename}` | Access original images and heatmaps |

### Inspection request

Content type: `multipart/form-data`

Required fields:
- `image`: Image file
- `category`: Product category

Initial supported category: `metal`.

## 3. AI inference contract — Member 1

Required Python interface:

```python
inspect_image(image_path: str, category: str) -> dict
```

Required output:

```python
{
    "category": "metal",
    "prediction": "ANOMALY",
    "anomaly_score": 0.82,
    "heatmap_path": "backend/uploads/heatmap_101.png",
    "inference_time_ms": 120,
    "model_version": "metal_v1"
}
```

Rules:
1. Prediction must be `NORMAL` or `ANOMALY`.
2. Anomaly score must be numeric and finite.
3. Heatmap path must point to an actual generated image.
4. Inference time must be numeric.
5. Model version must identify the model used.
6. Function name and output keys must not change without informing Member 2.
7. AI handles inference and heatmap generation only.
8. AI does not handle database operations or inspection decisions.

## 4. Backend decision engine contract — Member 2

The backend converts the anomaly score into one of:

- `PASS`: Score below the validated safe threshold.
- `REJECT`: Score at or above the validated rejection threshold.
- `NEEDS REVIEW`: Score between the two thresholds.

Initial provisional values:

```python
SAFE_THRESHOLD = 0.30
REJECT_THRESHOLD = 0.70
```

Rules:
1. These thresholds must be calibrated against validation data.
2. Invalid or non-finite scores must never produce PASS.
3. AI processing failures are errors, not defect predictions.
4. Decision logic belongs exclusively to the backend.
5. Decision labels must remain exactly `PASS`, `REJECT`, and `NEEDS REVIEW`.
6. Anomaly score must not be presented as defect probability.

## 5. Database contract — Member 2

Database: SQLite with SQLAlchemy.

Primary table: `inspections`.

Required fields:
- `id`: Unique inspection ID, primary key.
- `filename`: Original filename.
- `category`: Product category.
- `prediction`: NORMAL / ANOMALY.
- `anomaly_score`: AI anomaly score.
- `decision`: PASS / REJECT / NEEDS REVIEW.
- `original_image_path`: Original image location.
- `heatmap_path`: Generated heatmap location.
- `inference_time_ms`: Inference duration.
- `model_version`: Model identifier.
- `created_at`: Inspection timestamp.

Rules:
1. Every successful inspection gets a unique ID.
2. Every successful inspection is saved.
3. Records persist after server restarts.
4. Existing records must not be overwritten.
5. Store image paths, not image binaries, in SQLite.

## 6. Image storage contract — Member 2

Storage directory:

`backend/uploads/`

Naming:
- `original_{inspection_id}.{extension}`
- `heatmap_{inspection_id}.png`

Supported formats: JPG, JPEG, PNG.

Maximum upload size: 10 MB.

Rules:
1. Validate actual image content, not only the extension.
2. Generate unique server-side filenames.
3. Store relative image paths in the database.
4. Return image URLs using `/uploads/{filename}`.
5. Heatmaps must be actual generated image files.
6. Original images and heatmaps must remain available for history.

## 7. Frontend integration contract — Member 3

### Successful inspection response

HTTP 200:

```json
{
  "inspection_id": 101,
  "filename": "sample.jpg",
  "category": "metal",
  "prediction": "ANOMALY",
  "anomaly_score": 0.82,
  "decision": "REJECT",
  "original_image_url": "/uploads/original_101.jpg",
  "heatmap_url": "/uploads/heatmap_101.png",
  "inference_time_ms": 120,
  "model_version": "metal_v1",
  "created_at": "2026-11-01T10:30:00"
}
```

### Analytics response

```json
{
  "total_inspections": 100,
  "passed": 65,
  "rejected": 25,
  "needs_review": 10,
  "defect_distribution": {
    "metal": 25
  },
  "recent_inspections": []
}
```

### UI rules

- PASS: Green.
- REJECT: Red.
- NEEDS REVIEW: Amber.
- Show original image and heatmap side by side.
- Display anomaly score separately from decision.
- Include loading and error states.
- Display the backend's actual returned error message.

Mock JSON may be used during frontend development, but not in the final AI demonstration.

## 8. API error response contract

All API errors:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_IMAGE",
    "message": "Uploaded file is not a valid image."
  }
}
```

HTTP statuses:

| Status | Meaning |
|---|---|
| 400 | Invalid request or unsupported category |
| 413 | File exceeds upload limit |
| 422 | Invalid image or missing required fields |
| 500 | Internal server error |
| 503 | AI inference service unavailable |

Successful inspection responses use HTTP 200.

The frontend must display the backend's returned error message instead of silently failing.

## 9. Complete inspection workflow

Image Upload → AI Inference → Heatmap Generation → Backend Quality Decision → Database Storage → Frontend Result.

## 10. GitHub collaboration rules

Repository: `https://github.com/cycode-as/AI-Manthan-Inspectra`

Branches:
- `feature/ai-engine`: Member 1.
- `feature/backend`: Member 2.
- `feature/frontend`: Member 3.
- `main`: Stable integrated project.

Rules:
1. Work only on the assigned branch.
2. Never push directly to main.
3. Do not commit virtual environments, secrets, databases, or uploaded test images.
4. Do not independently modify another member's module.
5. Discuss contract changes before implementation.
6. Push changes regularly.
7. Integrate through pull requests and test continuously.

## 11. Open integration question

The backend creates `inspection_id`, and the AI function receives only `image_path` and `category`. The team must agree how the heatmap will be assigned its final `heatmap_{inspection_id}.png` filename and placed in `backend/uploads/`, without changing the agreed AI function signature or output keys.