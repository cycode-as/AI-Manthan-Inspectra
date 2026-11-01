import React from 'react';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { INSPECTION_STATUS, STATUS_COLORS } from '../../utils/constants';
import './StatusBadge.css';

const StatusBadge = ({ status, showIcon = true, size = 'medium' }) => {
  const getStatusIcon = () => {
    switch (status) {
      case INSPECTION_STATUS.PASS:
        return CheckCircle2;
      case INSPECTION_STATUS.REJECT:
        return XCircle;
      case INSPECTION_STATUS.NEEDS_REVIEW:
        return AlertCircle;
      default:
        return null;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case INSPECTION_STATUS.PASS:
        return 'PASS';
      case INSPECTION_STATUS.REJECT:
        return 'REJECT';
      case INSPECTION_STATUS.NEEDS_REVIEW:
        return 'NEEDS REVIEW';
      default:
        return 'UNKNOWN';
    }
  };

  const Icon = getStatusIcon();
  const colors = STATUS_COLORS[status] || {};

  return (
    <span
      className={`status-badge ${size}`}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border
      }}
    >
      {showIcon && Icon && <Icon size={size === 'small' ? 12 : 14} strokeWidth={2} />}
      <span className="status-label">{getStatusLabel()}</span>
    </span>
  );
};

export default StatusBadge;
