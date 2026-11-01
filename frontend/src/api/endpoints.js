// ===================================
// INSPECTRA 2.0 - API ENDPOINTS
// ===================================

import apiClient from './client';

// ============ INSPECTION ENDPOINTS ============

/**
 * Upload image and run inspection
 */
export async function createInspection(formData) {
  const response = await apiClient.post('/api/inspections', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
}

/**
 * Get all inspections with optional filters
 */
export async function getInspections(params = {}) {
  const response = await apiClient.get('/api/inspections', { params });
  return response.data;
}

/**
 * Get single inspection by ID
 */
export async function getInspectionById(id) {
  const response = await apiClient.get(`/api/inspections/${id}`);
  return response.data;
}

/**
 * Delete inspection
 */
export async function deleteInspection(id) {
  const response = await apiClient.delete(`/api/inspections/${id}`);
  return response.data;
}

// ============ ANALYTICS ENDPOINTS ============

/**
 * Get overview analytics
 */
export async function getOverviewAnalytics() {
  const response = await apiClient.get('/api/analytics/overview');
  return response.data;
}

/**
 * Get defect trends data
 */
export async function getDefectTrends(params = {}) {
  const response = await apiClient.get('/api/analytics/defect-trends', { params });
  return response.data;
}

/**
 * Get inspection activity over time
 */
export async function getInspectionActivity(params = {}) {
  const response = await apiClient.get('/api/analytics/inspection-activity', { params });
  return response.data;
}

/**
 * Get quality distribution
 */
export async function getQualityDistribution() {
  const response = await apiClient.get('/api/analytics/quality-distribution');
  return response.data;
}

// ============ MODEL ENDPOINTS ============

/**
 * Get model performance metrics
 */
export async function getModelPerformance() {
  const response = await apiClient.get('/api/model/performance');
  return response.data;
}

/**
 * Get available models
 */
export async function getAvailableModels() {
  const response = await apiClient.get('/api/model/available');
  return response.data;
}

// ============ SYSTEM ENDPOINTS ============

/**
 * Get system health status
 */
export async function getSystemHealth() {
  const response = await apiClient.get('/health');
  return response.data;
}

/**
 * Get system information
 */
export async function getSystemInfo() {
  const response = await apiClient.get('/api/system/info');
  return response.data;
}
