import React, { useState } from 'react';
import { ScanSearch, AlertCircle } from 'lucide-react';
import ImageUploader from '../components/inspection/ImageUploader';
import DefectVisualization from '../components/inspection/DefectVisualization';
import InspectionResult from '../components/inspection/InspectionResult';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';
import { PRODUCT_CATEGORIES } from '../utils/constants';
import { createInspection } from '../api/endpoints';
import { API_BASE_URL } from '../utils/constants';
import { normalizeStatus } from '../utils/constants';
import './NewInspection.css';

const NewInspection = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('metal');
  const [inspecting, setInspecting] = useState(false);
  const [inspectionResult, setInspectionResult] = useState(null);
  const [inspectionError, setInspectionError] = useState(null);

  const handleImageSelect = (imageData) => {
    setSelectedImage(imageData);
    setInspectionResult(null);
    setInspectionError(null);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setInspectionResult(null);
    setInspectionError(null);
  };

  const handleRunInspection = async () => {
    if (!selectedImage) return;

    setInspecting(true);
    setInspectionError(null);

    try {
      // Build multipart/form-data — do NOT set Content-Type manually
      const formData = new FormData();
      formData.append('image', selectedImage.file);
      formData.append('category', selectedCategory);

      const raw = await createInspection(formData);

      // Normalize the backend response to the shape InspectionResult expects
      const normalized = {
        // Identity
        inspection_id: raw.inspection_id,
        id:            raw.inspection_id,
        filename:      raw.filename,
        category:      raw.category,

        // AI result fields — keep both snake_case (for report/details pages)
        // and camelCase aliases (for InspectionResult component)
        prediction:       raw.prediction,
        anomaly_score:    raw.anomaly_score,
        anomalyScore:     raw.anomaly_score,
        decision:         normalizeStatus(raw.decision),
        status:           normalizeStatus(raw.decision),  // InspectionResult reads .status

        // Image URLs — convert relative paths to absolute
        original_image_url: raw.original_image_url,
        heatmap_url:        raw.heatmap_url,
        imageUrl: raw.original_image_url
          ? `${API_BASE_URL}${raw.original_image_url}`
          : selectedImage.preview,
        heatmapUrl: raw.heatmap_url
          ? `${API_BASE_URL}${raw.heatmap_url}`
          : null,

        // Timing / model
        inference_time_ms: raw.inference_time_ms,
        processingTime:    raw.inference_time_ms,
        model_version:     raw.model_version,
        modelVersion:      raw.model_version,

        // Timestamps
        created_at: raw.created_at,
        timestamp:  raw.created_at,

        // The backend doesn't return bounding-box defects; defectCount is 0
        defectCount: 0,
        defects: [],
      };

      setInspectionResult(normalized);
    } catch (error) {
      console.error('Inspection failed:', error);
      const msg = error?.response?.data?.error?.message
        || error?.message
        || 'Inspection failed. Please try again.';
      setInspectionError(msg);
    } finally {
      setInspecting(false);
    }
  };

  const handleNewInspection = () => {
    setSelectedImage(null);
    setInspectionResult(null);
    setInspectionError(null);
    setSelectedCategory('metal');
  };

  const getImageDimensions = () => {
    if (!selectedImage) return 'N/A';
    return 'N/A';
  };

  return (
    <div className="new-inspection-page">
      <div className="page-header">
        <div>
          <h1 className="heading-lg">New Quality Inspection</h1>
          <p className="text-muted body-md">
            Upload a product image to identify and localize potential manufacturing defects.
          </p>
        </div>
      </div>

      {!inspectionResult ? (
        <div className="inspection-setup">
          <div className="setup-grid">
            {/* Left Column - Image Input */}
            <div className="setup-column">
              <div className="section-card card">
                <h3 className="section-title heading-sm">Image Upload</h3>
                <p className="section-subtitle text-muted body-sm">
                  Select a clear, well-lit product image for analysis
                </p>
                
                <ImageUploader
                  onImageSelect={handleImageSelect}
                  selectedImage={selectedImage}
                  onRemoveImage={handleRemoveImage}
                />
              </div>

              {selectedImage && (
                <div className="config-card card">
                  <h3 className="section-title heading-sm">Inspection Configuration</h3>
                  
                  <div className="form-group">
                    <label htmlFor="category" className="form-label">
                      Product Category
                    </label>
                    <select
                      id="category"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="form-select"
                    >
                      {PRODUCT_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                          {cat.value !== 'metal' ? ' (not yet supported)' : ''}
                        </option>
                      ))}
                    </select>
                    {selectedCategory !== 'metal' && (
                      <p className="form-hint text-muted body-sm" style={{ color: 'var(--color-warning)', marginTop: '4px' }}>
                        Only "Metal Components" is currently supported by the AI engine.
                      </p>
                    )}
                  </div>

                  {/* Inspection error */}
                  {inspectionError && (
                    <div className="inspection-error" style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      padding: '12px',
                      backgroundColor: 'var(--color-badge-reject-bg)',
                      border: '1px solid var(--color-badge-reject-border)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '12px',
                    }}>
                      <AlertCircle size={16} style={{ color: 'var(--color-danger)', flexShrink: 0, marginTop: '2px' }} />
                      <p className="body-sm" style={{ color: 'var(--color-danger)', margin: 0 }}>
                        {inspectionError}
                      </p>
                    </div>
                  )}

                  <Button
                    variant="primary"
                    size="large"
                    icon={ScanSearch}
                    fullWidth
                    onClick={handleRunInspection}
                    loading={inspecting}
                    disabled={!selectedImage || inspecting}
                  >
                    {inspecting ? 'Processing...' : 'Run Inspection'}
                  </Button>
                </div>
              )}
            </div>

            {/* Right Column - Configuration & Info */}
            <div className="setup-column">
              <div className="info-card card">
                <h3 className="section-title heading-sm">Inspection Details</h3>
                
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Selected Category</span>
                    <span className="info-value text-mono">
                      {PRODUCT_CATEGORIES.find(c => c.value === selectedCategory)?.label || 'N/A'}
                    </span>
                  </div>
                  
                  <div className="info-item">
                    <span className="info-label">Image Filename</span>
                    <span className="info-value text-mono">
                      {selectedImage ? selectedImage.name : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="info-item">
                    <span className="info-label">Inspection Mode</span>
                    <span className="info-value">Automated AI Detection</span>
                  </div>

                  <div className="info-item">
                    <span className="info-label">AI Engine</span>
                    <span className="info-value text-mono" style={{ color: 'var(--color-primary-blue)' }}>
                      PatchCore Anomaly Detection
                    </span>
                  </div>
                </div>

                <div className="info-note">
                  <p className="body-sm text-muted">
                    The AI system compares visual patterns against learned normal reference samples
                    to detect anomalies, surface defects, and manufacturing irregularities.
                  </p>
                </div>
              </div>

              {inspecting && (
                <div className="processing-card card">
                  <LoadingSpinner size="medium" message="Analyzing image for defects..." />
                  <div className="processing-steps">
                    <div className="processing-step">
                      <div className="step-indicator active"></div>
                      <span className="step-label">Uploading image</span>
                    </div>
                    <div className="processing-step">
                      <div className="step-indicator active"></div>
                      <span className="step-label">Running anomaly detection</span>
                    </div>
                    <div className="processing-step">
                      <div className="step-indicator"></div>
                      <span className="step-label">Evaluating localization</span>
                    </div>
                    <div className="processing-step">
                      <div className="step-indicator"></div>
                      <span className="step-label">Saving result</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="inspection-results">
          <div className="results-grid">
            {/* Visualization Panel */}
            <div className="visualization-panel">
              <div className="panel-card card">
                <h3 className="section-title heading-sm">AI Detection Visualization</h3>
                <DefectVisualization
                  imageUrl={inspectionResult.imageUrl}
                  heatmapUrl={inspectionResult.heatmapUrl}
                  defects={inspectionResult.defects}
                  anomalyScore={inspectionResult.anomaly_score}
                />
              </div>
            </div>

            {/* Results Panel */}
            <div className="results-panel">
              <InspectionResult
                result={inspectionResult}
                onNewInspection={handleNewInspection}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewInspection;
