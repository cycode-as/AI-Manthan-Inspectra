import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Printer, AlertCircle } from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';
import { getInspectionById } from '../api/endpoints';
import { formatDate, formatAnomalyScore, formatProcessingTime, formatCategory } from '../utils/formatters';
import { API_BASE_URL } from '../utils/constants';
import './InspectionDetails.css';

const InspectionDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inspection, setInspection] = useState(null);

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
      } else if (err.response?.status === 500) {
        setError('Server error occurred');
      } else if (!err.response) {
        setError('Unable to connect to server. Please check if the backend is running.');
      } else {
        setError('Failed to load inspection details');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = () => {
    navigate(`/report/${id}`);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <LoadingSpinner size="large" message="Loading inspection details..." />;
  }

  if (error) {
    return (
      <div className="inspection-details-page">
        <div className="error-container card">
          <AlertCircle size={48} className="error-icon" />
          <h2 className="heading-md">Error Loading Inspection</h2>
          <p className="text-muted body-md">{error}</p>
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

  if (!inspection) {
    return (
      <div className="inspection-details-page">
        <div className="error-container card">
          <AlertCircle size={48} className="error-icon" />
          <h2 className="heading-md">Inspection Not Found</h2>
          <p className="text-muted body-md">
            The requested inspection (ID: {id}) could not be found.
          </p>
          <Button variant="secondary" onClick={() => navigate('/history')}>
            <ArrowLeft size={18} />
            Back to History
          </Button>
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
    <div className="inspection-details-page">
      {/* Header */}
      <div className="details-header">
        <Button 
          variant="ghost" 
          icon={ArrowLeft}
          onClick={() => navigate('/history')}
        >
          Back to History
        </Button>
        
        <div className="header-actions">
          <Button 
            variant="secondary" 
            icon={Printer}
            size="medium"
            onClick={handlePrint}
          >
            Print Report
          </Button>
          <Button 
            variant="primary" 
            icon={Download}
            size="medium"
            onClick={handleDownloadReport}
          >
            Download PDF
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="details-content">
        {/* Title and Status */}
        <div className="details-title-section card">
          <div className="title-row">
            <div>
              <h1 className="heading-lg">Inspection Report</h1>
              <p className="inspection-id text-mono">ID: {inspection.inspection_id || inspection.id}</p>
            </div>
            <StatusBadge status={inspection.decision || inspection.status} size="large" />
          </div>
        </div>

        {/* Key Information */}
        <div className="info-section card">
          <h2 className="section-title heading-sm">Inspection Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Filename</span>
              <span className="info-value text-mono">
                {inspection.filename || 'N/A'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Product Category</span>
              <span className="info-value">
                {formatCategory(inspection.category)}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Prediction</span>
              <span className="info-value text-mono">
                {inspection.prediction || 'N/A'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Anomaly Score</span>
              <span className="info-value text-mono">
                {formatAnomalyScore(inspection.anomaly_score || inspection.anomalyScore)}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Inference Time</span>
              <span className="info-value text-mono">
                {formatProcessingTime(inspection.inference_time_ms || inspection.processingTime)}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Model Version</span>
              <span className="info-value text-mono">
                {inspection.model_version || inspection.modelVersion || 'N/A'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Inspection Date</span>
              <span className="info-value">
                {formatDate(inspection.created_at || inspection.timestamp)}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Final Decision</span>
              <StatusBadge status={inspection.decision || inspection.status} />
            </div>
          </div>
        </div>

        {/* Image Comparison */}
        <div className="images-section card">
          <h2 className="section-title heading-sm">Visual Analysis</h2>
          <div className="images-grid">
            {/* Original Image */}
            <div className="image-container">
              <div className="image-header">
                <h3 className="image-title">Original Image</h3>
              </div>
              {originalImageUrl ? (
                <div className="image-wrapper">
                  <img 
                    src={originalImageUrl} 
                    alt="Original product" 
                    className="inspection-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="image-unavailable" style={{ display: 'none' }}>
                    <AlertCircle size={32} />
                    <span>Image unavailable</span>
                  </div>
                </div>
              ) : (
                <div className="image-unavailable">
                  <AlertCircle size={32} />
                  <span>No image available</span>
                </div>
              )}
            </div>

            {/* Heatmap */}
            <div className="image-container">
              <div className="image-header">
                <h3 className="image-title">AI Detection Heatmap</h3>
              </div>
              {heatmapImageUrl ? (
                <div className="image-wrapper">
                  <img 
                    src={heatmapImageUrl} 
                    alt="Defect heatmap" 
                    className="inspection-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="image-unavailable" style={{ display: 'none' }}>
                    <AlertCircle size={32} />
                    <span>Heatmap localization unavailable</span>
                    <p className="body-sm text-muted" style={{ marginTop: '6px' }}>
                      Evaluation based on image-level anomaly score ({formatAnomalyScore(inspection.anomaly_score || inspection.anomalyScore)}).
                    </p>
                  </div>
                </div>
              ) : (
                <div className="image-unavailable" style={{ padding: '24px 16px', textAlign: 'center' }}>
                  <AlertCircle size={32} />
                  <span>Spatial Heatmap Unavailable</span>
                  <p className="body-sm text-muted" style={{ marginTop: '6px' }}>
                    Defect classification is based on image-level anomaly score ({formatAnomalyScore(inspection.anomaly_score || inspection.anomalyScore)}).
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="technical-section card">
          <h2 className="section-title heading-sm">Technical Details</h2>
          <div className="technical-note">
            <p className="body-sm text-muted">
              <strong>Anomaly Score:</strong> Represents the degree of visual deviation from learned normal patterns. 
              Higher scores indicate greater likelihood of defects.
            </p>
            <p className="body-sm text-muted">
              <strong>Final Decision:</strong> Determined by the AI model based on anomaly score thresholds 
              and confidence levels. Manual review is recommended for borderline cases.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InspectionDetails;
