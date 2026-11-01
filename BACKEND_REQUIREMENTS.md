# BACKEND API REQUIREMENTS FOR INSPECTRA FRONTEND

## Document Purpose
This document lists the exact backend API endpoints and functionality required by the Inspectra 2.0 frontend. This is provided to the **Backend Team Member** for implementation.

---

## Current Backend Status

**Inspection Date**: November 1, 2026

### Implemented Endpoints
- ✅ `GET /health` - Health check endpoint (working)
- ✅ `GET /` - Root endpoint returning welcome message

### Missing Endpoints
The following endpoints are referenced by the frontend but **NOT YET IMPLEMENTED** in the backend:

---

## REQUIRED ENDPOINTS

### 1. POST /api/inspect
**Purpose**: Upload an image and run AI inspection

**Request**:
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body Parameters:
  - `file` (required): Image file (JPG, JPEG, PNG)
  - `category` (required): Product category string ("metal", "textiles", "electronics", "other")

**Expected Response** (200 OK):
```json
{
  "inspection_id": "INS-1730467200000-1234",
  "filename": "product_image.jpg",
  "category": "metal",
  "prediction": "anomaly" or "normal",
  "anomaly_score": 0.847,
  "decision": "REJECT" or "PASS" or "NEEDS_REVIEW",
  "original_image_url": "/uploads/INS-1730467200000-1234_original.jpg",
  "heatmap_url": "/uploads/INS-1730467200000-1234_heatmap.jpg",
  "inference_time_ms": 1247,
  "model_version": "v2.3.1",
  "created_at": "2026-11-01T12:00:00Z"
}
```

**Field Descriptions**:
- `inspection_id`: Unique identifier for this inspection
- `filename`: Original uploaded filename
- `category`: Product category as provided in request
- `prediction`: Model's raw prediction ("anomaly" or "normal")
- `anomaly_score`: Float between 0 and 1 indicating anomaly likelihood
- `decision`: Final decision based on thresholds ("PASS", "REJECT", or "NEEDS_REVIEW")
- `original_image_url`: Relative path to stored original image
- `heatmap_url`: Relative path to AI-generated heatmap visualization
- `inference_time_ms`: Processing time in milliseconds
- `model_version`: Version identifier of the AI model used
- `created_at`: ISO 8601 timestamp

**Error Responses**:
- `400`: Invalid file format or missing required fields
- `500`: AI model error or processing failure

---

### 2. GET /api/history
**Purpose**: Retrieve all inspection records with optional filtering

**Request**:
- Method: `GET`
- Query Parameters (all optional):
  - `category`: Filter by product category
  - `decision`: Filter by decision (PASS, REJECT, NEEDS_REVIEW)
  - `limit`: Maximum number of results (default: 50)
  - `offset`: Number of results to skip (for pagination)

**Expected Response** (200 OK):
```json
{
  "inspections": [
    {
      "inspection_id": "INS-1730467200000-1234",
      "filename": "product_image.jpg",
      "category": "metal",
      "prediction": "anomaly",
      "anomaly_score": 0.847,
      "decision": "REJECT",
      "original_image_url": "/uploads/INS-1730467200000-1234_original.jpg",
      "heatmap_url": "/uploads/INS-1730467200000-1234_heatmap.jpg",
      "inference_time_ms": 1247,
      "model_version": "v2.3.1",
      "created_at": "2026-11-01T12:00:00Z"
    },
    ...
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

**Alternative Accepted Response** (simpler format):
```json
[
  {
    "inspection_id": "INS-1730467200000-1234",
    ...
  },
  ...
]
```

**Error Responses**:
- `500`: Database error

---

### 3. GET /api/history/{inspection_id}
**Purpose**: Retrieve a single inspection by its ID

**Request**:
- Method: `GET`
- URL Parameter: `inspection_id` - The unique inspection identifier

**Expected Response** (200 OK):
```json
{
  "inspection_id": "INS-1730467200000-1234",
  "filename": "product_image.jpg",
  "category": "metal",
  "prediction": "anomaly",
  "anomaly_score": 0.847,
  "decision": "REJECT",
  "original_image_url": "/uploads/INS-1730467200000-1234_original.jpg",
  "heatmap_url": "/uploads/INS-1730467200000-1234_heatmap.jpg",
  "inference_time_ms": 1247,
  "model_version": "v2.3.1",
  "created_at": "2026-11-01T12:00:00Z"
}
```

**Error Responses**:
- `404`: Inspection ID not found
- `500`: Database error

---

### 4. GET /api/analytics
**Purpose**: Get dashboard analytics and statistics

**Request**:
- Method: `GET`
- Query Parameters (optional):
  - `period`: Time period for analytics (e.g., "7d", "30d", "all")

**Expected Response** (200 OK):
```json
{
  "total_inspections": 1247,
  "passed": 1089,
  "rejected": 98,
  "needs_review": 60,
  "pass_rate": 87.3,
  "reject_rate": 7.9,
  "review_rate": 4.8,
  "defect_rate": 7.9,
  "inspection_activity": [
    {
      "date": "Nov 1",
      "inspections": 87,
      "defects": 12
    },
    ...
  ],
  "defect_distribution": [
    {
      "category": "Surface Scratches",
      "count": 45
    },
    ...
  ],
  "trends": {
    "total_inspections": 12.5,
    "passed": 8.3,
    "rejected": -5.2,
    "defect_rate": -2.1
  }
}
```

**Field Descriptions**:
- `total_inspections`: Total number of inspections
- `passed`, `rejected`, `needs_review`: Count by decision
- `pass_rate`, `reject_rate`, `review_rate`: Percentages (0-100)
- `defect_rate`: Percentage of defective products
- `inspection_activity`: Time-series data for charts
- `defect_distribution`: Breakdown of defect types
- `trends`: Comparison vs. previous period (percentage change)

**Minimum Required Fields** (if full analytics not available):
```json
{
  "total_inspections": 1247,
  "passed": 1089,
  "rejected": 98,
  "needs_review": 60,
  "defect_rate": 7.9
}
```

**Error Responses**:
- `500`: Database or calculation error

---

### 5. GET /uploads/{filename}
**Purpose**: Serve stored images (original and heatmap)

**Request**:
- Method: `GET`
- URL Parameter: `filename` - The image filename

**Expected Response** (200 OK):
- Content-Type: `image/jpeg` or `image/png`
- Body: Binary image data

**Error Responses**:
- `404`: File not found
- `403`: Access denied

**Implementation Notes**:
- This endpoint should serve files from the `backend/uploads/` directory
- Ensure proper CORS headers are set
- Consider adding cache headers for performance

---

## OPTIONAL ENDPOINTS (Not Required for MVP)

### GET /api/model/performance
**Purpose**: Get AI model performance metrics

**Expected Response**:
```json
{
  "model_version": "v2.3.1",
  "metrics": {
    "image_level_auroc": 0.967,
    "pixel_level_auroc": 0.984,
    "precision": 0.943,
    "recall": 0.921,
    "f1_score": 0.932,
    "average_inference_time": 847
  },
  "supported_categories": ["metal", "textiles", "electronics", "other"],
  "status": "OPERATIONAL",
  "last_updated": "2026-11-01T10:00:00Z"
}
```

**Note**: The frontend will display placeholder values if this endpoint is not implemented.

---

## IMPLEMENTATION PRIORITY

### Phase 1 (Critical for Basic Functionality):
1. ✅ **POST /api/inspect** - Core inspection functionality
2. ✅ **GET /uploads/{filename}** - Image serving
3. ✅ **GET /api/history/{inspection_id}** - View individual inspection details

### Phase 2 (Required for Full Dashboard):
4. ✅ **GET /api/history** - Inspection history list
5. ✅ **GET /api/analytics** - Dashboard statistics

### Phase 3 (Nice to Have):
6. ⚪ **GET /api/model/performance** - Model metrics display

---

## DATA PERSISTENCE REQUIREMENTS

### Database Schema Recommendation:

**Inspections Table**:
```sql
CREATE TABLE inspections (
    inspection_id VARCHAR(50) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    prediction VARCHAR(20) NOT NULL,
    anomaly_score FLOAT NOT NULL,
    decision VARCHAR(20) NOT NULL,
    original_image_url VARCHAR(500) NOT NULL,
    heatmap_url VARCHAR(500),
    inference_time_ms INTEGER NOT NULL,
    model_version VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
- Primary key on `inspection_id`
- Index on `created_at` for sorting
- Index on `category` for filtering
- Index on `decision` for filtering

---

## FILE STORAGE REQUIREMENTS

### Image Storage:
- Store uploaded images in `backend/uploads/` directory
- Naming convention: `{inspection_id}_original.{ext}`
- Naming convention for heatmaps: `{inspection_id}_heatmap.{ext}`
- Supported formats: JPG, JPEG, PNG
- Maximum file size: 10MB recommended

### Cleanup Strategy:
- Consider implementing automatic cleanup of old images
- Or provide an admin endpoint for manual cleanup

---

## AI MODEL INTEGRATION REQUIREMENTS

The backend must integrate with the AI/ML engine to:

1. **Accept uploaded image** from the frontend
2. **Send image to AI model** for inference
3. **Receive prediction** including:
   - Anomaly prediction (normal/anomaly)
   - Anomaly score (0-1)
   - Heatmap image data
4. **Apply decision logic**:
   - `anomaly_score > 0.7` → REJECT
   - `0.4 < anomaly_score <= 0.7` → NEEDS_REVIEW
   - `anomaly_score <= 0.4` → PASS
5. **Store results** in database
6. **Return response** to frontend

**Coordinate with AI Engine Team** on:
- Model input format expectations
- Model output format
- Heatmap generation method
- Error handling for model failures

---

## CORS CONFIGURATION

The backend must allow CORS requests from:
- `http://localhost:5173` (Vite dev server)
- `http://127.0.0.1:5173` (alternative localhost)

Already configured in `backend/config.py` ✅

---

## ERROR HANDLING STANDARDS

All error responses should follow this format:

```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "details": "Additional context (optional)"
}
```

**Common Error Codes**:
- `invalid_file`: Invalid file format
- `file_too_large`: File exceeds size limit
- `inspection_not_found`: Inspection ID not found
- `model_error`: AI model processing failed
- `database_error`: Database operation failed

---

## TESTING CHECKLIST

Before considering the backend complete, test:

- [ ] Upload JPG, JPEG, PNG images successfully
- [ ] Reject invalid file formats
- [ ] Store inspection records in database
- [ ] Serve images via /uploads/ endpoint
- [ ] Retrieve individual inspection by ID
- [ ] Retrieve inspection history list
- [ ] Filter history by category
- [ ] Filter history by decision
- [ ] Generate analytics statistics
- [ ] Handle missing inspection ID (404)
- [ ] Handle model errors gracefully
- [ ] CORS headers allow frontend access

---

## FRONTEND INTEGRATION STATUS

### Currently Implemented in Frontend:
- ✅ API client with Axios configured
- ✅ All endpoint functions defined in `frontend/src/api/endpoints.js`
- ✅ Error handling for offline backend
- ✅ Error handling for missing endpoints
- ✅ Empty states for no data
- ✅ Loading states during API calls
- ✅ Image upload with validation
- ✅ Inspection history with filtering
- ✅ Inspection details page
- ✅ PDF report generation
- ✅ Dashboard analytics display

### Frontend is Ready For:
Once you implement the backend endpoints, the frontend will automatically:
- Connect to the real API
- Display actual inspection data
- Show real-time analytics
- Enable full user workflows

**No frontend changes needed** once backend is implemented correctly.

---

## QUESTIONS FOR BACKEND TEAM?

If you have questions about:
- Expected data formats
- Field requirements
- Error handling
- AI model integration
- Database schema

**Contact**: Frontend Team Member (Member 3)

---

## DOCUMENT VERSION

- **Version**: 1.0
- **Date**: November 1, 2026
- **Author**: Frontend Team Member
- **Status**: Requirements Documented - Awaiting Backend Implementation

---

**Next Steps for Backend Team**:
1. Review this requirements document
2. Implement endpoints in priority order (Phase 1 first)
3. Test each endpoint with Postman or similar tool
4. Coordinate with AI Engine team for model integration
5. Notify frontend team when endpoints are ready for testing
