import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ScanSearch, 
  History, 
  BarChart3, 
  Cpu, 
  Settings 
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
  const navItems = [
    { path: '/overview', icon: LayoutDashboard, label: 'Overview' },
    { path: '/new-inspection', icon: ScanSearch, label: 'New Inspection' },
    { path: '/history', icon: History, label: 'Inspection History' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/model-performance', icon: Cpu, label: 'Model Performance' },
    { path: '/settings', icon: Settings, label: 'Settings' }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-container">
          <div className="logo-text">
            <span className="logo-title">INSPECTRA</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={20} strokeWidth={2} />
              <span className="nav-label">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="system-status">
          <div className="status-indicator operational"></div>
          <span className="status-label">System Operational</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
