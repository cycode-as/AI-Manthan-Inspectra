import React, { useState, useEffect } from 'react';
import { Cpu, Activity, Clock, Target, TrendingUp, CheckCircle2 } from 'lucide-react';
import StatCard from '../components/common/StatCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { getMockModelPerformance } from '../api/mockData';
import './ModelPerformance.css';

const ModelPerformance = () => {
  const [loading, setLoading] = useState(true);
  const [modelData, setModelData] = useState(null);

  useEffect(() => {
    loadModelData();
  }, []);

  const loadModelData = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      const data = getMockModelPerformance();
      setModelData(data);
    } catch (error) {
      console.error('Error loading model data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="large" message="Loading model performance data..." />;
  }

  const formatAUROC = (value) => (value * 100).toFixed(1) + '%';
  const formatMetric = (value) => (value * 100).toFixed(1) + '%';

  return (
    <div className="model-performance-page">
      <div className="page-header">
        <div>
          <h1 className="heading-lg">Model Performance</h1>
          <p className="text-muted body-md">
            Technical specifications and evaluation metrics for the active AI inspection model.
          </p>
        </div>
      </div>

      {/* Model Status Card */}
      <div className="status-banner card">
        <div className="status-content">
          <div className="status-icon-container">
            <CheckCircle2 size={40} strokeWidth={2} className="status-icon" />
          </div>
          <div className="status-info">
            <h3 className="heading-md">Model Operational</h3>
            <p className="text-muted body-sm">
              Active model version: <span className="text-mono model-version">{modelData.modelVersion}</span>
            </p>
            <p className="text-muted body-sm">
              Last updated: {new Date(modelData.lastUpdated).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="section-header">
        <h2 className="heading-md">Performance Metrics</h2>
        <p className="text-muted body-sm">Model evaluation scores from validation dataset</p>
      </div>

      <div className="metrics-grid">
        <div className="metric-card card">
          <div className="metric-icon">
            <Target size={24} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Image-Level AUROC</span>
            <span className="metric-value text-mono">
              {formatAUROC(modelData.metrics.imageLevelAUROC)}
            </span>
            <span className="metric-description">
              Classification accuracy at image level
            </span>
          </div>
        </div>

        <div className="metric-card card">
          <div className="metric-icon">
            <Activity size={24} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Pixel-Level AUROC</span>
            <span className="metric-value text-mono">
              {formatAUROC(modelData.metrics.pixelLevelAUROC)}
            </span>
            <span className="metric-description">
              Defect localization precision
            </span>
          </div>
        </div>

        <div className="metric-card card">
          <div className="metric-icon">
            <CheckCircle2 size={24} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Precision</span>
            <span className="metric-value text-mono">
              {formatMetric(modelData.metrics.precision)}
            </span>
            <span className="metric-description">
              True positive accuracy rate
            </span>
          </div>
        </div>

        <div className="metric-card card">
          <div className="metric-icon">
            <TrendingUp size={24} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Recall</span>
            <span className="metric-value text-mono">
              {formatMetric(modelData.metrics.recall)}
            </span>
            <span className="metric-description">
              Defect detection coverage
            </span>
          </div>
        </div>

        <div className="metric-card card">
          <div className="metric-icon">
            <Target size={24} />
          </div>
          <div className="metric-content">
            <span className="metric-label">F1 Score</span>
            <span className="metric-value text-mono">
              {formatMetric(modelData.metrics.f1Score)}
            </span>
            <span className="metric-description">
              Harmonic mean of precision & recall
            </span>
          </div>
        </div>

        <div className="metric-card card">
          <div className="metric-icon">
            <Clock size={24} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Avg Inference Time</span>
            <span className="metric-value text-mono">
              {modelData.metrics.averageInferenceTime}ms
            </span>
            <span className="metric-description">
              Per-image processing latency
            </span>
          </div>
        </div>
      </div>

      {/* Supported Categories */}
      <div className="section-card card">
        <div className="section-header">
          <h3 className="heading-sm">Supported Product Categories</h3>
          <p className="text-muted body-sm">
            Product types validated for inspection
          </p>
        </div>
        
        <div className="categories-grid">
          {modelData.supportedCategories.map((category, index) => (
            <div key={index} className="category-item">
              <div className="category-icon">
                <Cpu size={20} />
              </div>
              <span className="category-label">{category}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Technical Details */}
      <div className="section-card card">
        <div className="section-header">
          <h3 className="heading-sm">Technical Specifications</h3>
          <p className="text-muted body-sm">
            Model architecture and configuration details
          </p>
        </div>

        <div className="technical-grid">
          <div className="tech-detail">
            <span className="tech-label">Model Architecture</span>
            <span className="tech-value text-mono">PatchCore with Wide ResNet-50</span>
          </div>
          <div className="tech-detail">
            <span className="tech-label">Training Dataset</span>
            <span className="tech-value text-mono">MVTec AD + Custom Industrial</span>
          </div>
          <div className="tech-detail">
            <span className="tech-label">Input Resolution</span>
            <span className="tech-value text-mono">224 × 224 pixels</span>
          </div>
          <div className="tech-detail">
            <span className="tech-label">Feature Extraction</span>
            <span className="tech-value text-mono">Multi-scale patch embeddings</span>
          </div>
          <div className="tech-detail">
            <span className="tech-label">Anomaly Detection</span>
            <span className="tech-value text-mono">k-NN memory bank matching</span>
          </div>
          <div className="tech-detail">
            <span className="tech-label">Deployment Platform</span>
            <span className="tech-value text-mono">ONNX Runtime (CPU optimized)</span>
          </div>
        </div>
      </div>

      {/* Performance Notes */}
      <div className="notes-card card">
        <h3 className="heading-sm">Evaluation Notes</h3>
        <ul className="notes-list">
          <li>
            <strong>AUROC (Area Under ROC Curve):</strong> Measures the model's ability to distinguish 
            between defective and non-defective samples. Values above 95% indicate excellent performance.
          </li>
          <li>
            <strong>Pixel-Level AUROC:</strong> Evaluates defect localization accuracy at the pixel level. 
            Higher scores indicate more precise defect boundary detection.
          </li>
          <li>
            <strong>Precision & Recall:</strong> Precision measures false positive rate, while recall 
            measures false negative rate. The F1 score balances both metrics.
          </li>
          <li>
            <strong>Inference Time:</strong> Measured on standard CPU hardware. GPU acceleration can 
            reduce latency by 3-5x for high-throughput production lines.
          </li>
          <li>
            <strong>Important:</strong> These metrics reflect performance on the validation dataset. 
            Real-world accuracy may vary based on lighting conditions, image quality, and product variability.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ModelPerformance;
