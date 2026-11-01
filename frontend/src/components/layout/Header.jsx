import React from 'react';
import { useLocation } from 'react-router-dom';
import { Search, ChevronRight, CheckCircle2 } from 'lucide-react';
import './Header.css';

const Header = () => {
  const location = useLocation();

  const getBreadcrumb = () => {
    const path = location.pathname;
    const breadcrumbMap = {
      '/overview': 'Overview',
      '/new-inspection': 'New Inspection',
      '/history': 'Inspection History',
      '/analytics': 'Analytics',
      '/model-performance': 'Model Performance',
      '/settings': 'Settings'
    };
    return breadcrumbMap[path] || 'Dashboard';
  };

  // Get current date
  const getCurrentDate = () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
  };

  return (
    <header className="header">
      <div className="header-left">
        <div className="breadcrumb">
          <span className="breadcrumb-home">Inspectra</span>
          <ChevronRight size={16} className="breadcrumb-separator" />
          <span className="breadcrumb-current">{getBreadcrumb()}</span>
        </div>
        <div className="header-date">
          {getCurrentDate()}
        </div>
      </div>

      <div className="header-center">
        <div className="search-container">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search inspections, reports..."
          />
        </div>
      </div>

      <div className="header-right">
        <div className="system-status-indicator">
          <CheckCircle2 size={18} strokeWidth={2} className="status-icon" />
          <span className="status-text">SYSTEM OPERATIONAL</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
