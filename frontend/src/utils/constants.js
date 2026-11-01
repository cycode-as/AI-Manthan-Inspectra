// ===================================
// INSPECTRA 2.0 - CONSTANTS
// ===================================

export const PRODUCT_CATEGORIES = [
  { value: 'metal', label: 'Metal Components' },
  { value: 'textiles', label: 'Textiles' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'other', label: 'Other' }
];

export const INSPECTION_STATUS = {
  PASS: 'PASS',
  REJECT: 'REJECT',
  NEEDS_REVIEW: 'NEEDS_REVIEW'
};

export const STATUS_COLORS = {
  PASS: {
    bg: 'var(--color-badge-pass-bg)',
    text: 'var(--color-success)',
    border: 'var(--color-badge-pass-border)'
  },
  REJECT: {
    bg: 'var(--color-badge-reject-bg)',
    text: 'var(--color-danger)',
    border: 'var(--color-badge-reject-border)'
  },
  NEEDS_REVIEW: {
    bg: 'var(--color-badge-review-bg)',
    text: 'var(--color-review)',
    border: 'var(--color-badge-review-border)'
  }
};

export const DEFECT_SEVERITY = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
};

export const DEFECT_COLORS = {
  HIGH: '#E5484D',
  MEDIUM: '#E99A21',
  LOW: '#16A36A'
};

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

export const MODEL_VERSION = 'v2.3.1';
export const INSPECTION_MODE = 'Automated AI Detection';
