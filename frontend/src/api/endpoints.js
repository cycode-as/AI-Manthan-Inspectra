// ===================================
// INSPECTRA 2.0 - API ENDPOINTS
// Aligned with actual FastAPI backend routes:
//   POST /api/inspect
//   GET  /api/history
//   GET  /api/history/{inspection_id}
//   GET  /api/analytics
//   GET  /api/model/performance
//   GET  /health
// ===================================

import apiClient from './client';

// ============ INSPECTION ENDPOINTS ============

/**
 * Upload image and run inspection.
 * POST /api/inspect
 * Accepts multipart/form-data with fields: image (file), category (string).
 * Do NOT manually set Content-Type — the browser sets the multipart boundary.
 */
export async function createInspection(formData) {
  const response = await apiClient.post('/api/inspect', formData, {
    headers: {
      // Intentionally unset so axios/browser sets multipart boundary automatically
      'Content-Type': undefined,
    },
  });
  return response.data;
}

/**
 * Get all inspections with optional pagination.
 * GET /api/history?limit=&skip=
 */
export async function getInspections(params = {}) {
  const response = await apiClient.get('/api/history', { params });
  return response.data;
}

/**
 * Get single inspection by ID.
 * GET /api/history/{inspection_id}
 */
export async function getInspectionById(id) {
  const response = await apiClient.get(`/api/history/${id}`);
  return response.data;
}

// ============ ANALYTICS ENDPOINTS ============

/**
 * Get dashboard analytics.
 * GET /api/analytics
 * Returns: { total_inspections, passed, rejected, needs_review, defect_rate,
 *            pass_rate, defect_distribution, category_breakdown, recent_inspections }
 */
export async function getOverviewAnalytics() {
  const response = await apiClient.get('/api/analytics');
  return response.data;
}

// Alias kept for backward compatibility with any existing callers
export const getAnalytics = getOverviewAnalytics;

/**
 * Get technical model performance metrics and latency statistics.
 * GET /api/model/performance
 */
export async function getModelPerformance() {
  const response = await apiClient.get('/api/model/performance');
  return response.data;
}

// ============ SYSTEM ENDPOINTS ============

/**
 * Get backend health status.
 * GET /health
 */
export async function getSystemHealth() {
  const response = await apiClient.get('/health');
  return response.data;
}
