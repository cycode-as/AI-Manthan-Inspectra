import React from 'react';
import { Loader2 } from 'lucide-react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'medium', message = 'Loading...' }) => {
  const sizeMap = {
    small: 20,
    medium: 32,
    large: 48
  };

  return (
    <div className={`loading-spinner ${size}`}>
      <Loader2 size={sizeMap[size]} className="spinner-icon" strokeWidth={2} />
      {message && <p className="spinner-message">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;
