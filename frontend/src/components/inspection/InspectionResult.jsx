import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, AlertCircle, Download, FileText, RefreshCw } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import Button from '../common/Button';
import { formatProcessingTime, formatAnomalyScore, formatDate, formatCategory } from '../../utils/formatters';
import { INSPECTION_STATUS } from '../../utils/constants';
import { normalizeStatus } from '../../utils/constants';
import './InspectionResult.css';

const InspectionResult = ({ result, onNewInspection }) => {
  const navigate = useNavigate();

  // Normalize: backend returns `decision` (snake_case) and `anomaly_score`;
  // mock data returns `status` and `anomalyScore`. Accept both.
  const status       = normalizeStatus(result.decision || result.status);
  const anomalyScore = result.anomaly_score ?? result.anomalyScore;
  const processingTime = result.inference_time_ms ?? result.processingTime;
  const modelVersion   = result.model_version  || result.modelVersion;
  const timestamp      = result.created_at     || result.timestamp;
  const inspectionId   = result.inspection_id  || result.id;

  const getDecisionIcon = () => {
    switch (status) {
      case INSPECTION_STATUS.PASS:        return CheckCircle2;
      case INSPECTION_STATUS.REJECT:      return XCircle;
      case INSPECTION_STATUS.NEEDS_REVIEW: return AlertCircle;
      default:                             return AlertCircle;
    }
  };

  const getDecisionColor = () => {
    switch (status) {
      case INSPECTION_STATUS.PASS:         return 'var(--color-success)';
      case INSPECTION_STATUS.REJECT:       return 'var(--color-danger)';
      case INSPECTION_STATUS.NEEDS_REVIEW: return 'var(--color-warning)';
      default:                             return 'var(--color-text-muted)';
    }
  };

  const getDecisionMessage = () => {
    switch (status) {
      case INSPECTION_STATUS.PASS:
        return 'No significant anomalies detected. Product meets quality standards.';
      case INSPECTION_STATUS.REJECT:
        return 'Anomalous visual patterns were identified in the inspected region.';
      case INSPECTION_STATUS.NEEDS_REVIEW:
        return 'Marginal confidence level detected. Manual verification recommended.';
      default:
        return 'Inspection completed.';
    }
  };

  const DecisionIcon = getDecisionIcon();

  return (
    <div className="inspection-result card">
      <div className="result-header">
        <h2 className="heading-md">Inspection Results</h2>
      </div>

      {/* Decision Display */}
      <div className="decision-container" style={{ borderColor: getDecisionColor() }}>
        <div className="decision-icon" style={{ color: getDecisionColor() }}>
          <DecisionIcon size={48} strokeWidth={2} />
        </div>
        <div className="decision-content">
          <StatusBadge status={status} size="large" />
          <p className="decision-message body-md">{getDecisionMessage()}</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-item">
          <span className="metric-label">Anomaly Score</span>
          <span className="metric-value text-mono">
            {formatAnomalyScore(anomalyScore)}
          </span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Prediction</span>
          <span className="metric-value text-mono">
            {result.prediction || 'N/A'}
          </span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Product Category</span>
          <span className="metric-value">
            {formatCategory(result.category)}
          </span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Processing Time</span>
          <span className="metric-value text-mono">
            {formatProcessingTime(processingTime)}
          </span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Model Version</span>
          <span className="metric-value text-mono">
            {modelVersion || 'N/A'}
          </span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Inspection Time</span>
          <span className="metric-value body-sm">
            {formatDate(timestamp)}
          </span>
        </div>
      </div>

      {/* Defect Details (only shown for mock data with bounding boxes) */}
      {result.defects && result.defects.length > 0 && (
        <div className="defect-details">
          <h3 className="heading-sm">Detected Defects</h3>
          <div className="defect-list">
            {result.defects.map((defect, index) => (
              <div key={defect.id || index} className="defect-item">
                <div className="defect-header">
                  <span className="defect-type text-mono">{defect.type}</span>
                  <span className={`severity-badge severity-${defect.severity.toLowerCase()}`}>
                    {defect.severity}
                  </span>
                </div>
                <div className="defect-info">
                  <span className="body-sm text-muted">
                    Confidence: {(defect.confidence * 100).toFixed(1)}%
                  </span>
                  <span className="body-sm text-muted">
                    Region {index + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="result-actions">
        {inspectionId && (
          <>
            <Button
              variant="secondary"
              icon={FileText}
              size="medium"
              onClick={() => navigate(`/report/${inspectionId}`)}
            >
              View Full Report
            </Button>
            <Button
              variant="secondary"
              icon={Download}
              size="medium"
              onClick={() => navigate(`/report/${inspectionId}`)}
            >
              Download Report
            </Button>
          </>
        )}
        <Button
          variant="primary"
          icon={RefreshCw}
          size="medium"
          onClick={onNewInspection}
        >
          Inspect Another Image
        </Button>
      </div>
    </div>
  );
};

export default InspectionResult;
