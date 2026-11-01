import React, { useState } from 'react';
import { Save, Bell, Eye, Database, Shield } from 'lucide-react';
import Button from '../components/common/Button';
import './Settings.css';

const Settings = () => {
  const [settings, setSettings] = useState({
    notifications: true,
    autoSave: true,
    emailAlerts: false,
    defectThreshold: 0.7,
    confidenceThreshold: 0.85
  });

  const [saved, setSaved] = useState(false);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    // Simulate save
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h1 className="heading-lg">Settings</h1>
          <p className="text-muted body-md">
            System configuration and preferences.
          </p>
        </div>
        <Button
          variant={saved ? 'secondary' : 'primary'}
          icon={saved ? null : Save}
          size="medium"
          onClick={handleSave}
        >
          {saved ? 'Settings Saved ✓' : 'Save Changes'}
        </Button>
      </div>

      {/* Notification Settings */}
      <div className="settings-section card">
        <div className="section-header">
          <Bell size={24} className="section-icon" />
          <div>
            <h3 className="heading-sm">Notifications</h3>
            <p className="text-muted body-sm">Manage inspection alerts and notifications</p>
          </div>
        </div>
        
        <div className="settings-list">
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Enable Notifications</span>
              <span className="setting-description">Receive real-time inspection alerts</span>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={(e) => handleChange('notifications', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Email Alerts</span>
              <span className="setting-description">Send inspection reports via email</span>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.emailAlerts}
                onChange={(e) => handleChange('emailAlerts', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      {/* Inspection Settings */}
      <div className="settings-section card">
        <div className="section-header">
          <Eye size={24} className="section-icon" />
          <div>
            <h3 className="heading-sm">Inspection Configuration</h3>
            <p className="text-muted body-sm">Configure detection thresholds and parameters</p>
          </div>
        </div>
        
        <div className="settings-list">
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Auto-Save Results</span>
              <span className="setting-description">Automatically save inspection results</span>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.autoSave}
                onChange={(e) => handleChange('autoSave', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Defect Threshold</span>
              <span className="setting-description">
                Anomaly score threshold for reject decision (Current: {(settings.defectThreshold * 100).toFixed(0)}%)
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="0.9"
              step="0.05"
              value={settings.defectThreshold}
              onChange={(e) => handleChange('defectThreshold', parseFloat(e.target.value))}
              className="threshold-slider"
            />
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Confidence Threshold</span>
              <span className="setting-description">
                Minimum confidence for automatic decisions (Current: {(settings.confidenceThreshold * 100).toFixed(0)}%)
              </span>
            </div>
            <input
              type="range"
              min="0.7"
              max="0.95"
              step="0.05"
              value={settings.confidenceThreshold}
              onChange={(e) => handleChange('confidenceThreshold', parseFloat(e.target.value))}
              className="threshold-slider"
            />
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="settings-section card">
        <div className="section-header">
          <Database size={24} className="section-icon" />
          <div>
            <h3 className="heading-sm">System Information</h3>
            <p className="text-muted body-sm">Platform details and version information</p>
          </div>
        </div>
        
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Platform Version</span>
            <span className="info-value text-mono">Inspectra 2.0.0</span>
          </div>
          <div className="info-item">
            <span className="info-label">Model Version</span>
            <span className="info-value text-mono">v2.3.1</span>
          </div>
          <div className="info-item">
            <span className="info-label">Backend Status</span>
            <span className="info-value">Connected</span>
          </div>
          <div className="info-item">
            <span className="info-label">Database</span>
            <span className="info-value text-mono">SQLite</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
