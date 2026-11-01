import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Printer, AlertCircle } from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';
import { getInspectionById } from '../api/endpoints';
import { formatDate, formatAnomalyScore, formatProcessingTime, formatCategory } from '../utils/formatters';
import { API_BASE_URL } from '../utils/constants';
import { generatePDFReport } from '../utils/pdfGenerator';
import './InspectionReport.css';

const InspectionReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const reportRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inspection, setInspection] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadInspectionDetails();
  }, [id]);

  const loadInspectionDetails = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getInspectionById(id);
      setInspection(data);
    } catch (err) {
      console.error('Error loading inspection details:', err);
      if (err.response?.status === 404) {
        setError('Inspection not found');
      } else if (!err.response) {
        setError('Unable to connect to server. Please check if the backend is running.');
      } else {
        setError('Failed to load inspection details');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!inspection) return;
    
    setDownloading(true);
    try {
      await generatePDFReport(inspection, reportRef.current);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF report. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <LoadingSpinner size="large" message="Loading report..." />;
  }

  if (error || !inspection) {
    return (
      <div className="inspection-report-page">
        <div className="error-container card">
          <AlertCircle size={48} className="error-icon" />
          <h2 className="heading-md">Error Loading Report</h2>
          <p className="text-muted body-md">{error || 'Report not found'}</p>
          <div className="error-actions">
            <Button variant="secondary" onClick={() => navigate('/history')}>
              <ArrowLeft size={18} />
              Back to History
            </Button>
            <Button variant="primary" onClick={loadInspectionDetails}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${API_BASE_URL}${path}`;
  };

  const originalImageUrl = getImageUrl(inspection.original_image_url || inspection.imageUrl);
  const heatmapImageUrl = getImageUrl(inspection.heatmap_url || inspection.heatmapUrl);

  return (
    <div className="inspection-report-page">
      {/* Action Bar (hidden in print) */}
      <div className="report-actions no-print">
        <Button 
          variant="ghost" 
          icon={ArrowLeft}
          onClick={() => navigate('/history')}
        >
          Back to History
        </Button>
        
        <div className="actions-right">
          <Button 
            variant="secondary" 
            icon={Printer}
            size="medium"
            onClick={handlePrint}
          >
            Print
          </Button>
          <Button 
            variant="primary" 
            icon={Download}
            size="medium"
            onClick={handleDownloadPDF}
            loading={downloading}
            disabled={downloading}
          >
            Download PDF
          </Button>
        </div>
      </div>

      {/* Report Content */}
      <div ref={reportRef} className="report-container card">
        {/* Report Header */}
        <div className="report-header">
          <div className="report-branding">
            <div className="brand-logo">INSPECTRA</div>
            <div className="brand-subtitle">AI-Powered Industrial Quality Inspection</div>
          </div>
          <div className="report-meta">
            <h1 className="report-title">Inspection Report</h1>
            <p className="report-id text-mono">Report ID: {inspection.inspection_id || inspection.id}</p>
            <p className="report-date">{formatDate(inspection.created_at || inspection.timestamp)}</p>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="report-section">
          <h2 className="section-heading">Executive Summary</h2>
          <div className="summary-grid">
            <div className="summary-item decision-summary">
              <span className="summary-label">Final Decision</span>
              <StatusBadge status={inspection.decision || inspection.status} size="large" />
            </div>
            <div className="summary-item">
              <span className="summary-label">Anomaly Score</span>
              <span className="summary-value text-mono">
                {formatAnomalyScore(inspection.anomaly_score || inspection.anomalyScore)}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Product Category</span>
              <span className="summary-value">
                {formatCategory(inspection.category)}
              </span>
            </div>
          </div>
        </div>

        {/* Inspection Details */}
        <div className="report-section">
          <h2 className="section-heading">Inspection Details</h2>
          <table className="details-table">
            <tbody>
              <tr>
                <td className="detail-label">Inspection ID</td>
                <td className="detail-value text-mono">{inspection.inspection_id || inspection.id}</td>
              </tr>
              <tr>
                <td className="detail-label">Filename</td>
                <td className="detail-value text-mono">{inspection.filename || 'N/A'}</td>
              </tr>
              <tr>
                <td className="detail-label">Product Category</td>
                <td className="detail-value">{formatCategory(inspection.category)}</td>
              </tr>
              <tr>
                <td className="detail-label">Model Prediction</td>
                <td className="detail-value text-mono">{inspection.prediction || 'N/A'}</td>
              </tr>
              <tr>
                <td className="detail-label">Anomaly Score</td>
                <td className="detail-value text-mono">
                  {formatAnomalyScore(inspection.anomaly_score || inspection.anomalyScore)}
                </td>
              </tr>
              <tr>
                <td className="detail-label">Final Decision</td>
                <td className="detail-value">
                  <StatusBadge status={inspection.decision || inspection.status} />
                </td>
              </tr>
              <tr>
                <td className="detail-label">Inference Time</td>
                <td className="detail-value text-mono">
                  {formatProcessingTime(inspection.inference_time_ms || inspection.processingTime)}
                </td>
              </tr>
              <tr>
                <td className="detail-label">Model Version</td>
                <td className="detail-value text-mono">
                  {inspection.model_version || inspection.modelVersion || 'N/A'}
                </td>
              </tr>
              <tr>
                <td className="detail-label">Inspection Date</td>
                <td className="detail-value">{formatDate(inspection.created_at || inspection.timestamp)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Visual Analysis */}
        <div className="report-section">
          <h2 className="section-heading">Visual Analysis</h2>
          <div className="report-images">
            {originalImageUrl && (
              <div className="report-image-container">
                <h3 className="image-label">Original Image</h3>
                <img 
                  src={originalImageUrl} 
                  alt="Original product" 
                  className="report-image"
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
            )}
            {heatmapImageUrl ? (
              <div className="report-image-container">
                <h3 className="image-label">AI Detection Heatmap</h3>
                <img 
                  src={heatmapImageUrl} 
                  alt="Defect heatmap" 
                  className="report-image"
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
            ) : (
              <div className="report-image-container">
                <h3 className="image-label">AI Detection Heatmap</h3>
                <div style={{ padding: '24px 16px', background: 'var(--color-hover-bg, #f5f5f5)', border: '1px solid var(--color-border, #e0e0e0)', borderRadius: '6px', textAlign: 'center' }}>
                  <p className="body-sm text-muted" style={{ margin: 0 }}>
                    Spatial heatmap localization unavailable. Quality decision is determined by the global anomaly score ({formatAnomalyScore(inspection.anomaly_score || inspection.anomalyScore)}).
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Technical Notes */}
        <div className="report-section">
          <h2 className="section-heading">Technical Notes</h2>
          <div className="notes-content">
            <p className="note-item">
              <strong>Anomaly Score Interpretation:</strong> The anomaly score represents the degree of visual 
              deviation from learned normal patterns. Higher scores indicate greater likelihood of manufacturing defects.
            </p>
            <p className="note-item">
              <strong>Decision Methodology:</strong> The final decision is determined by the AI model based on 
              anomaly score thresholds and confidence levels. Manual review is recommended for borderline cases 
              marked as "NEEDS REVIEW".
            </p>
            <p className="note-item">
              <strong>Model Information:</strong> This inspection was performed using Inspectra's PatchCore-based 
              anomaly detection model (version {inspection.model_version || inspection.modelVersion || 'N/A'}), trained on 
              industrial quality datasets.
            </p>
          </div>
        </div>

        {/* Report Footer */}
        <div className="report-footer">
          <div className="footer-line"></div>
          <p className="footer-text">
            This report was automatically generated by Inspectra 2.0 AI Inspection System.
            <br />
            For questions or concerns, please contact your quality assurance team.
          </p>
          <p className="footer-disclaimer">
            © 2026 Inspectra. All rights reserved. This report is confidential and intended solely 
            for internal quality control purposes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default InspectionReport;
