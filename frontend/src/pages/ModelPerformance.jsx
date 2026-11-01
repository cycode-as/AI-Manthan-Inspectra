import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Activity,
  Clock,
  Target,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Database,
  Layers,
  ShieldAlert,
  Info,
} from 'lucide-react';

import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import Button from '../components/common/Button';
import { getModelPerformance } from '../api/endpoints';
import { formatCategory, formatProcessingTime } from '../utils/formatters';

import './ModelPerformance.css';

const ModelPerformance = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);

  useEffect(() => {
    loadPerformanceData();
  }, []);

  const loadPerformanceData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getModelPerformance();
      setPerformanceData(data);
    } catch (err) {
      console.error('Error loading model performance data:', err);
      if (!err.response) {
        setError('backend_offline');
      } else {
        setError('api_error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <LoadingSpinner
        size="large"
        message="Loading verifiable model metrics..."
      />
    );
  }

  if (error === 'backend_offline') {
    return (
      <div className="model-performance-page">
        <EmptyState
          icon={RefreshCw}
          title="Backend Unavailable"
          message="Cannot connect to the Inspectra backend server. Ensure it is running on port 8000."
          action={
            <Button variant="primary" icon={RefreshCw} onClick={loadPerformanceData}>
              Retry Connection
            </Button>
          }
        />
      </div>
    );
  }

  if (error || !performanceData) {
    return (
      <div className="model-performance-page">
        <EmptyState
          icon={AlertCircle}
          title="Error Loading Model Data"
          message="Failed to retrieve authentic model performance metrics from the server."
          action={
            <Button variant="primary" icon={RefreshCw} onClick={loadPerformanceData}>
              Try Again
            </Button>
          }
        />
      </div>
    );
  }

  const {
    model_info: modelInfo = {},
    inference_performance: inferencePerf = {},
    inspection_performance: inspectionPerf = {},
    evaluation_metrics: evalMetrics = {},
  } = performanceData;

  const isOperational = modelInfo.status === 'ready' || modelInfo.status === 'operational';

  return (
    <div className="model-performance-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="heading-lg">Model Performance & Telemetry</h1>
          <p className="text-muted body-md">
            Verifiable technical specifications, runtime inference latencies, and inspection distribution from live database records.
          </p>
        </div>

        <Button
          variant="secondary"
          icon={RefreshCw}
          size="medium"
          onClick={loadPerformanceData}
        >
          Refresh Telemetry
        </Button>
      </div>

      {/* Model Status Banner */}
      <div className="status-banner card">
        <div className="status-content">
          <div className="status-icon-container" style={{
            background: isOperational
              ? 'linear-gradient(135deg, var(--color-success), #0d8a57)'
              : 'linear-gradient(135deg, #d97706, #b45309)'
          }}>
            {isOperational ? (
              <CheckCircle2 size={40} strokeWidth={2} className="status-icon" />
            ) : (
              <ShieldAlert size={40} strokeWidth={2} className="status-icon" />
            )}
          </div>
          <div className="status-info">
            <h3 className="heading-md">
              {isOperational ? 'Model Operational & Ready' : 'AI Engine In Fallback Mode'}
            </h3>
            <p className="text-muted body-sm">
              Architecture: <strong style={{ color: 'var(--color-primary-navy)' }}>{modelInfo.architecture || 'PatchCore'}</strong> (Backbone: <span className="text-mono">{modelInfo.backbone || 'Wide ResNet-50-2'}</span>)
            </p>
            <p className="text-muted body-sm">
              Active model version: <span className="text-mono model-version">{modelInfo.model_version || 'patchcore-v1'}</span> | Engine: <span className="text-mono">{modelInfo.active_engine || 'real'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Section 1: Measured Runtime Inference Performance */}
      <div className="section-header">
        <h2 className="heading-md">Measured Inference Latency</h2>
        <p className="text-muted body-sm">
          Actual wall-clock latencies measured during model inference across persisted inspection records.
        </p>
      </div>

      <div className="metrics-grid">
        <div className="metric-card card">
          <div className="metric-icon">
            <Clock size={24} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Average Latency</span>
            <span className="metric-value text-mono">
              {inferencePerf.average_inference_time_ms !== null
                ? `${inferencePerf.average_inference_time_ms} ms`
                : 'N/A'}
            </span>
            <span className="metric-description">
              Mean wall-clock time per image inference
            </span>
          </div>
        </div>

        <div className="metric-card card">
          <div className="metric-icon">
            <Activity size={24} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Min / Max Latency</span>
            <span className="metric-value text-mono" style={{ fontSize: '20px' }}>
              {inferencePerf.min_inference_time_ms !== null
                ? `${inferencePerf.min_inference_time_ms} / ${inferencePerf.max_inference_time_ms} ms`
                : 'N/A'}
            </span>
            <span className="metric-description">
              Fastest vs longest recorded inference
            </span>
          </div>
        </div>

        <div className="metric-card card">
          <div className="metric-icon">
            <Database size={24} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Total Inferences</span>
            <span className="metric-value text-mono">
              {inferencePerf.total_recorded_inferences || 0}
            </span>
            <span className="metric-description">
              Recorded in SQLite database
            </span>
          </div>
        </div>
      </div>

      {/* Section 2: Production Inspection Distribution */}
      <div className="section-header">
        <h2 className="heading-md">Inspection & Classification Distribution</h2>
        <p className="text-muted body-sm">
          Live counts aggregated from production records in the SQLite inspection database.
        </p>
      </div>

      <div className="metrics-grid">
        <div className="metric-card card">
          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
            <Layers size={24} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Total Images Processed</span>
            <span className="metric-value text-mono">
              {inspectionPerf.total_images_processed || 0}
            </span>
            <span className="metric-description">
              All processed inspection requests
            </span>
          </div>
        </div>

        <div className="metric-card card">
          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
            <CheckCircle2 size={24} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Normal vs Anomalous</span>
            <span className="metric-value text-mono" style={{ fontSize: '20px' }}>
              {inspectionPerf.normal_predictions || 0} Normal / {inspectionPerf.anomalous_predictions || 0} Anomaly
            </span>
            <span className="metric-description">
              AI model classification predictions
            </span>
          </div>
        </div>

        <div className="metric-card card">
          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #8957D5, #6b21a8)' }}>
            <Target size={24} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Decisions (Pass / Rev / Rej)</span>
            <span className="metric-value text-mono" style={{ fontSize: '20px' }}>
              {inspectionPerf.passed_decisions || 0}P / {inspectionPerf.needs_review_decisions || 0}R / {inspectionPerf.rejected_decisions || 0}X
            </span>
            <span className="metric-description">
              Final quality control decisions
            </span>
          </div>
        </div>
      </div>

      {/* Section 3: Ground-Truth Evaluation Metrics Status */}
      <div className="section-card card" style={{ borderLeft: '4px solid var(--color-primary-teal)' }}>
        <div className="section-header" style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={20} color="var(--color-primary-teal)" />
            <h3 className="heading-sm">Ground-Truth Benchmark Evaluation Status</h3>
          </div>
          <p className="text-muted body-sm">
            Adhering to strict scientific and industrial validation standards.
          </p>
        </div>

        <div style={{
          background: 'var(--color-hover-bg)',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          border: '1px solid var(--color-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{
              display: 'inline-block',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: '#fef3c7',
              color: '#92400e',
            }}>
              Evaluation Dataset Unavailable
            </span>
            <span className="text-muted body-sm" style={{ fontWeight: 600 }}>
              Benchmarking requires ground-truth pixel defect annotations
            </span>
          </div>
          <p className="body-sm text-muted" style={{ margin: 0, lineHeight: 1.6 }}>
            Formal model evaluation metrics (Image-level AUROC, Pixel-level AUROC, Precision, Recall, and F1)
            require a labelled test benchmark with pixel-level ground-truth defect masks. In compliance with data
            integrity rules, Inspectra never fabricates accuracy or AUROC percentages from operational PASS/REJECT counts.
          </p>
        </div>

        <div className="metrics-grid" style={{ marginBottom: 0 }}>
          <div className="metric-card" style={{ background: 'var(--color-card)', border: '1px dashed var(--color-border)' }}>
            <div className="metric-content">
              <span className="metric-label">Image-Level AUROC</span>
              <span className="metric-value text-muted" style={{ fontSize: '20px' }}>Not Evaluated</span>
              <span className="metric-description">Requires labelled normal/anomaly test split</span>
            </div>
          </div>

          <div className="metric-card" style={{ background: 'var(--color-card)', border: '1px dashed var(--color-border)' }}>
            <div className="metric-content">
              <span className="metric-label">Pixel-Level AUROC</span>
              <span className="metric-value text-muted" style={{ fontSize: '20px' }}>Not Evaluated</span>
              <span className="metric-description">Requires ground-truth pixel defect masks</span>
            </div>
          </div>

          <div className="metric-card" style={{ background: 'var(--color-card)', border: '1px dashed var(--color-border)' }}>
            <div className="metric-content">
              <span className="metric-label">Precision / Recall / F1</span>
              <span className="metric-value text-muted" style={{ fontSize: '20px' }}>Not Evaluated</span>
              <span className="metric-description">Requires ground-truth validation set</span>
            </div>
          </div>
        </div>
      </div>

      {/* Supported Categories */}
      <div className="section-card card">
        <div className="section-header">
          <h3 className="heading-sm">Supported Product Categories</h3>
          <p className="text-muted body-sm">
            Product categories recognized and handled by the PatchCore inference pipeline
          </p>
        </div>
        
        <div className="categories-grid">
          {(modelInfo.supported_categories || []).map((category, index) => (
            <div key={index} className="category-item">
              <div className="category-icon">
                <Cpu size={20} />
              </div>
              <span className="category-label">{formatCategory(category)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Technical Specifications */}
      <div className="section-card card">
        <div className="section-header">
          <h3 className="heading-sm">Technical Specifications & Architecture</h3>
          <p className="text-muted body-sm">
            Core PatchCore implementation details and inference pipeline characteristics
          </p>
        </div>

        <div className="technical-grid">
          <div className="tech-detail">
            <span className="tech-label">Architecture</span>
            <span className="tech-value text-mono">{modelInfo.architecture || 'PatchCore Anomaly Detection'}</span>
          </div>
          <div className="tech-detail">
            <span className="tech-label">Backbone Network</span>
            <span className="tech-value text-mono">{modelInfo.backbone || 'Wide ResNet-50-2'}</span>
          </div>
          <div className="tech-detail">
            <span className="tech-label">Input Resolution</span>
            <span className="tech-value text-mono">{modelInfo.input_resolution || '224 × 224 pixels'}</span>
          </div>
          <div className="tech-detail">
            <span className="tech-label">Feature Layers</span>
            <span className="tech-value text-mono">{modelInfo.feature_layers || 'Layer 2 & Layer 3 patch embeddings'}</span>
          </div>
          <div className="tech-detail">
            <span className="tech-label">Anomaly Memory Bank</span>
            <span className="tech-value text-mono">{modelInfo.memory_bank || 'Neighborhood coreset subsampling'}</span>
          </div>
          <div className="tech-detail">
            <span className="tech-label">Heatmap Generation</span>
            <span className="tech-value text-mono">Genuine Bilinear Interpolation + Jet Colormap</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelPerformance;
