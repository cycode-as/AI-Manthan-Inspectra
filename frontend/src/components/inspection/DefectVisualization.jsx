import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, Info, AlertTriangle } from 'lucide-react';
import { DEFECT_COLORS } from '../../utils/constants';
import './DefectVisualization.css';

/**
 * DefectVisualization
 *
 * Displays:
 * 1. AI-generated heatmap when heatmapUrl is available.
 * 2. Original image with bounding-box overlays when defects are available.
 * 3. Graceful informative messaging when spatial localization is unavailable.
 *
 * Props:
 * imageUrl     - URL of the original inspection image.
 * heatmapUrl   - URL of the AI-generated heatmap (optional).
 * defects      - Array of defect objects containing boundingBox data (optional).
 * anomalyScore - Numerical anomaly score from the inspection (optional).
 */
const DefectVisualization = ({
  imageUrl,
  heatmapUrl,
  defects = [],
  anomalyScore,
}) => {
  const [showHeatmap, setShowHeatmap] = useState(!!heatmapUrl);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [heatmapLoadError, setHeatmapLoadError] = useState(false);

  const imageRef = useRef(null);

  // Sync heatmap state when a new inspection result arrives.
  useEffect(() => {
    setShowHeatmap(!!heatmapUrl);
    setHeatmapLoadError(false);
  }, [heatmapUrl]);

  const handleImageLoad = () => {
    if (imageRef.current) {
      imageRef.current.style.opacity = '1';
    }
  };

  const handleImageError = () => {
    if (showHeatmap) {
      console.warn('Defect heatmap failed to load, falling back to original image.');
      setHeatmapLoadError(true);
      setShowHeatmap(false);
    }
  };

  const getDefectColor = (severity) => {
    return DEFECT_COLORS[severity] || DEFECT_COLORS.MEDIUM;
  };

  const hasValidHeatmap = !!heatmapUrl && !heatmapLoadError;
  const activeUrl = showHeatmap && hasValidHeatmap ? heatmapUrl : imageUrl;

  return (
    <div className="defect-visualization">
      {/* Visualization controls */}
      <div className="visualization-controls">
        {hasValidHeatmap ? (
          <button
            className="control-btn"
            onClick={() => setShowHeatmap((previous) => !previous)}
            title={
              showHeatmap
                ? 'Show original image'
                : 'Show AI heatmap'
            }
          >
            {showHeatmap ? (
              <EyeOff size={18} />
            ) : (
              <Eye size={18} />
            )}

            {showHeatmap ? 'Show Original' : 'Show Heatmap'}
          </button>
        ) : defects.length > 0 ? (
          <button
            className="control-btn"
            onClick={() =>
              setOverlayVisible((previous) => !previous)
            }
            title={
              overlayVisible ? 'Hide overlay' : 'Show overlay'
            }
          >
            {overlayVisible ? (
              <EyeOff size={18} />
            ) : (
              <Eye size={18} />
            )}

            {overlayVisible ? 'Hide Overlay' : 'Show Overlay'}
          </button>
        ) : null}

        <div className="defect-count-badge">
          {hasValidHeatmap ? (
            <span className="text-mono">
              {showHeatmap ? 'AI Heatmap' : 'Original Image'}
            </span>
          ) : defects.length > 0 ? (
            <span className="text-mono">
              {defects.length} Defect
              {defects.length !== 1 ? 's' : ''} Detected
            </span>
          ) : (
            <span className="text-mono">
              Original Target Image
            </span>
          )}
        </div>
      </div>

      {/* Main visualization */}
      <div className="visualization-container">
        <img
          ref={imageRef}
          src={activeUrl}
          alt={
            showHeatmap && hasValidHeatmap
              ? 'AI defect heatmap'
              : 'Inspection target'
          }
          className="inspection-image"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />

        {/* Bounding-box overlays */}
        {!showHeatmap &&
          overlayVisible &&
          defects.length > 0 && (
            <svg
              className="defect-overlay"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {defects.map((defect, index) => {
                const {
                  x,
                  y,
                  width,
                  height,
                } = defect.boundingBox;

                const color = getDefectColor(defect.severity);

                return (
                  <g key={defect.id || index}>
                    <rect
                      x={x * 100}
                      y={y * 100}
                      width={width * 100}
                      height={height * 100}
                      fill={`${color}20`}
                      stroke={color}
                      strokeWidth="0.5"
                      vectorEffect="non-scaling-stroke"
                    />

                    {/* Corner markers */}
                    <rect
                      x={x * 100}
                      y={y * 100}
                      width="1.5"
                      height="1.5"
                      fill={color}
                    />

                    <rect
                      x={(x + width) * 100 - 1.5}
                      y={y * 100}
                      width="1.5"
                      height="1.5"
                      fill={color}
                    />

                    <rect
                      x={x * 100}
                      y={(y + height) * 100 - 1.5}
                      width="1.5"
                      height="1.5"
                      fill={color}
                    />

                    <rect
                      x={(x + width) * 100 - 1.5}
                      y={(y + height) * 100 - 1.5}
                      width="1.5"
                      height="1.5"
                      fill={color}
                    />
                  </g>
                );
              })}
            </svg>
          )}

        {/* Defect labels */}
        {!showHeatmap &&
          overlayVisible &&
          defects.length > 0 && (
            <div className="defect-labels">
              {defects.map((defect, index) => {
                const { x, y } = defect.boundingBox;

                const color = getDefectColor(defect.severity);

                return (
                  <div
                    key={defect.id || index}
                    className="defect-label"
                    style={{
                      left: `${x * 100}%`,
                      top: `${y * 100}%`,
                      backgroundColor: color,
                    }}
                  >
                    <span className="label-text">
                      {defect.type} | {defect.severity}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
      </div>

      {/* Informative banner when heatmap localization is unavailable */}
      {!hasValidHeatmap && (
        <div className="heatmap-info-banner">
          <Info size={16} />
          <span>
            {heatmapLoadError
              ? 'Heatmap visualization could not be loaded. Displaying original image.'
              : `Spatial heatmap localization is not available for this inspection. Quality decision is determined by the global anomaly score${
                  anomalyScore !== undefined ? ` (${(Number(anomalyScore) * 100).toFixed(1)}%)` : ''
                }.`}
          </span>
        </div>
      )}

      {/* Bounding-box severity legend */}
      {!hasValidHeatmap && defects.length > 0 && (
        <div className="visualization-legend">
          <div className="legend-title">
            Defect Severity Legend:
          </div>

          <div className="legend-items">
            <div className="legend-item">
              <div
                className="legend-color"
                style={{
                  backgroundColor: DEFECT_COLORS.HIGH,
                }}
              />
              <span>High-severity anomaly</span>
            </div>

            <div className="legend-item">
              <div
                className="legend-color"
                style={{
                  backgroundColor: DEFECT_COLORS.MEDIUM,
                }}
              />
              <span>Suspicious region</span>
            </div>

            <div className="legend-item">
              <div
                className="legend-color"
                style={{
                  backgroundColor: DEFECT_COLORS.LOW,
                }}
              />
              <span>Low-confidence detection</span>
            </div>
          </div>
        </div>
      )}

      {/* Heatmap legend */}
      {hasValidHeatmap && showHeatmap && (
        <div className="visualization-legend">
          <div className="legend-title">
            Heatmap Key:
          </div>

          <div className="legend-items">
            <div className="legend-item">
              <div
                className="legend-color"
                style={{ backgroundColor: '#E5484D' }}
              />
              <span>High anomaly region (Peak Defect)</span>
            </div>

            <div className="legend-item">
              <div
                className="legend-color"
                style={{ backgroundColor: '#E99A21' }}
              />
              <span>Medium anomaly region</span>
            </div>

            <div className="legend-item">
              <div
                className="legend-color"
                style={{ backgroundColor: '#16A36A' }}
              />
              <span>Normal surface (Low Anomaly)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DefectVisualization;
