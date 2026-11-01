import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, Maximize2, RefreshCw } from 'lucide-react';
import { DEFECT_COLORS } from '../../utils/constants';
import './DefectVisualization.css';

const DefectVisualization = ({ imageUrl, defects = [], showHeatmap = false }) => {
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (imageRef.current) {
        setDimensions({
          width: imageRef.current.offsetWidth,
          height: imageRef.current.offsetHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, [imageUrl]);

  const handleImageLoad = () => {
    if (imageRef.current) {
      setDimensions({
        width: imageRef.current.offsetWidth,
        height: imageRef.current.offsetHeight
      });
    }
  };

  const toggleOverlay = () => {
    setOverlayVisible(!overlayVisible);
  };

  const getBoundingBoxStyle = (bbox) => {
    return {
      left: `${bbox.x * 100}%`,
      top: `${bbox.y * 100}%`,
      width: `${bbox.width * 100}%`,
      height: `${bbox.height * 100}%`
    };
  };

  const getDefectColor = (severity) => {
    return DEFECT_COLORS[severity] || DEFECT_COLORS.MEDIUM;
  };

  return (
    <div className="defect-visualization">
      <div className="visualization-controls">
        <button
          className="control-btn"
          onClick={toggleOverlay}
          title={overlayVisible ? 'Hide overlay' : 'Show overlay'}
        >
          {overlayVisible ? <EyeOff size={18} /> : <Eye size={18} />}
          {overlayVisible ? 'Hide Overlay' : 'Show Overlay'}
        </button>
        
        <div className="defect-count-badge">
          <span className="text-mono">{defects.length} Defect{defects.length !== 1 ? 's' : ''} Detected</span>
        </div>
      </div>

      <div className="visualization-container" ref={containerRef}>
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Inspection target"
          className="inspection-image"
          onLoad={handleImageLoad}
        />

        {overlayVisible && defects.length > 0 && (
          <svg className="defect-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
            {defects.map((defect, index) => {
              const { x, y, width, height } = defect.boundingBox;
              const color = getDefectColor(defect.severity);
              
              return (
                <g key={defect.id || index}>
                  {/* Bounding box rectangle */}
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

        {overlayVisible && defects.length > 0 && (
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

      {/* Legend */}
      {defects.length > 0 && (
        <div className="visualization-legend">
          <div className="legend-title">Defect Severity Legend:</div>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: DEFECT_COLORS.HIGH }}></div>
              <span>High-severity anomaly</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: DEFECT_COLORS.MEDIUM }}></div>
              <span>Suspicious region</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: DEFECT_COLORS.LOW }}></div>
              <span>Low-confidence detection</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DefectVisualization;
