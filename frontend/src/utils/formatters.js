// ===================================
// INSPECTRA 2.0 - FORMATTERS
// ===================================

/**
 * Format a date to a readable string
 */
export function formatDate(date) {
  if (!date) return 'N/A';
  
  const d = new Date(date);
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return d.toLocaleDateString('en-US', options);
}

/**
 * Format a date to a short time string
 */
export function formatTime(date) {
  if (!date) return 'N/A';
  
  const d = new Date(date);
  const options = {
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return d.toLocaleTimeString('en-US', options);
}

/**
 * Format anomaly score as percentage
 */
export function formatAnomalyScore(score) {
  if (score === null || score === undefined) return 'N/A';
  return `${(score * 100).toFixed(2)}%`;
}

/**
 * Format percentage
 */
export function formatPercentage(value, decimals = 1) {
  if (value === null || value === undefined) return 'N/A';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format number with commas
 */
export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('en-US');
}

/**
 * Format processing time in milliseconds
 */
export function formatProcessingTime(ms) {
  if (!ms) return 'N/A';
  
  if (ms < 1000) {
    return `${ms}ms`;
  }
  
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format file size
 */
export function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text, maxLength = 50) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Generate inspection ID
 */
export function generateInspectionId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `INS-${timestamp}-${random}`;
}

/**
 * Format category label
 */
export function formatCategory(category) {
  if (!category) return 'Unknown';
  
  const categoryMap = {
    'metal': 'Metal Components',
    'textiles': 'Textiles',
    'electronics': 'Electronics',
    'other': 'Other'
  };
  
  return categoryMap[category] || category;
}
