import React from 'react';
import { FileQuestion } from 'lucide-react';
import './EmptyState.css';

const EmptyState = ({ 
  icon: Icon = FileQuestion, 
  title = 'No data available', 
  message = 'There is no data to display at the moment.',
  action 
}) => {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon size={48} strokeWidth={1.5} />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-message">{message}</p>
      {action && (
        <div className="empty-state-action">
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
