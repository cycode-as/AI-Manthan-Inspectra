import React, { useState } from 'react';
import { ScanSearch } from 'lucide-react';
import ImageUploader from '../components/inspection/ImageUploader';
import DefectVisualization from '../components/inspection/DefectVisualization';
import InspectionResult from '../components/inspection/InspectionResult';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';
import { PRODUCT_CATEGORIES, MODEL_VERSION, INSPECTION_MODE } from '../utils/constants';
import { getMockInspectionResult } from '../api/mockData';
import './NewInspection.css';

const NewInspection = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('metal');
  const [inspecting, setInspecting] = useState(false);
  const [inspectionResult, setInspectionResult] = useState(null);

  const handleImageSelect = (imageData) => {
    setSelectedImage(imageData);
    setInspectionResult(null);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setInspectionResult(null);
  };

  const handleRunInspection = async () => {
    if (!selectedImage) return;

    setInspecting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate mock result with the selected image
      const result = getMockInspectionResult(selectedCategory);
      result.imageUrl = selectedImage.preview;
      
      setInspectionResult(result);
    } catch (error) {
      console.error('Inspection failed:', error);
    } finally {
      setInspecting(false);
    }
  };

  const handleNewInspection = () => {
    setSelectedImage(null);
    setInspectionResult(null);
    setSelectedCategory('metal');
  };

  const getImageDimensions = () => {
    if (!selectedImage) return 'N/A';
    // In real app, would extract from image metadata
    return '1920 × 1080';
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
                        </option>
                      ))}
                    </select>
                  </div>

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
                    <span className="info-label">Image Dimensions</span>
                    <span className="info-value text-mono">
                      {selectedImage ? getImageDimensions() : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="info-item">
                    <span className="info-label">Model Version</span>
                    <span className="info-value text-mono">{MODEL_VERSION}</span>
                  </div>
                  
                  <div className="info-item">
                    <span className="info-label">Inspection Mode</span>
                    <span className="info-value">{INSPECTION_MODE}</span>
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
                      <span className="step-label">Preprocessing image</span>
                    </div>
                    <div className="processing-step">
                      <div className="step-indicator active"></div>
                      <span className="step-label">Running anomaly detection</span>
                    </div>
                    <div className="processing-step">
                      <div className="step-indicator"></div>
                      <span className="step-label">Localizing defects</span>
                    </div>
                    <div className="processing-step">
                      <div className="step-indicator"></div>
                      <span className="step-label">Generating report</span>
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
                  defects={inspectionResult.defects}
                  showHeatmap={false}
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
