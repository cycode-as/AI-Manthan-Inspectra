import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import './StatCard.css';

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendLabel,
  format = 'number'
}) => {
  const getTrendColor = () => {
    if (!trend) return null;
    return trend > 0 ? 'positive' : 'negative';
  };

  const formatValue = () => {
    if (format === 'percentage') {
      return `${value}%`;
    }
    if (format === 'number' && typeof value === 'number') {
      return value.toLocaleString();
    }
    return value;
  };

  return (
    <div className="stat-card card">
      <div className="stat-card-content">
        <div className="stat-card-header">
          <span className="stat-card-title">{title}</span>
          {Icon && (
            <div className="stat-card-icon">
              <Icon size={20} strokeWidth={2} />
            </div>
          )}
        </div>
        
        <div className="stat-card-value text-mono">
          {formatValue()}
        </div>

        {trend !== undefined && trend !== null && (
          <div className={`stat-card-trend ${getTrendColor()}`}>
            {trend > 0 ? (
              <TrendingUp size={14} />
            ) : (
              <TrendingDown size={14} />
            )}
            <span className="trend-value">
              {Math.abs(trend)}%
            </span>
            {trendLabel && (
              <span className="trend-label">{trendLabel}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
