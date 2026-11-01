# INSPECTRA 2.0 — API Error Response Contract

All API errors must use the following JSON structure:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_IMAGE",
    "message": "Uploaded file is not a valid image."
  }
}
```

## HTTP status codes

| Status | Meaning |
|---|---|
| 400 | Invalid request or unsupported category |
| 413 | File exceeds upload limit |
| 422 | Invalid image or missing required fields |
| 500 | Internal server error |
| 503 | AI inference service unavailable |

## Rules

1. Every error response must include `success: false`.
2. Every error must include an `error` object.
3. The `error` object must contain a machine-readable `code` and a user-readable `message`.
4. The frontend must display the backend's returned `error.message`.
5. The frontend must not silently fail or display an empty result when an API error occurs.
6. Successful inspection responses must use HTTP 200.
7. Do not expose internal stack traces, secrets, or sensitive server details to the frontend.

## Example error codes

- `INVALID_REQUEST`
- `UNSUPPORTED_CATEGORY`
- `FILE_TOO_LARGE`
- `INVALID_IMAGE`
- `MISSING_REQUIRED_FIELDS`
- `INTERNAL_SERVER_ERROR`
- `AI_SERVICE_UNAVAILABLE`