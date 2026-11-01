import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import Button from '../components/common/Button';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { getOverviewAnalytics, getInspections } from '../api/endpoints';
import { formatDate, formatAnomalyScore, formatCategory } from '../utils/formatters';
import './Overview.css';

const Overview = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [recentInspections, setRecentInspections] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch analytics from backend
      const analyticsResponse = await getOverviewAnalytics();
      
      // Fetch recent inspections
      const inspectionsResponse = await getInspections({ limit: 5 });
      const inspectionsData = Array.isArray(inspectionsResponse) 
        ? inspectionsResponse 
        : (inspectionsResponse.inspections || inspectionsResponse.data || []);
      
      // Transform inspections data
      const transformedInspections = inspectionsData.slice(0, 5).map(item => ({
        id: item.inspection_id || item.id,
        category: item.category,
        status: item.decision || item.status,
        anomalyScore: item.anomaly_score || item.anomalyScore,
        defectCount: item.defect_count || item.defectCount || 0,
        timestamp: item.created_at || item.timestamp,
        processingTime: item.inference_time_ms || item.processingTime,
        modelVersion: item.model_version || item.modelVersion
      }));
      
      setAnalytics(analyticsResponse);
      setRecentInspections(transformedInspections);
    } catch (err) {
      console.error('Error loading overview data:', err);
      if (!err.response) {
        setError('backend_offline');
      } else if (err.response?.status === 404) {
        setError('endpoint_not_found');
      } else {
        setError('api_error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="large" message="Loading overview data..." />;
  }

  // Error states
  if (error === 'backend_offline') {
    return (
      <div className="overview-page">
        <EmptyState
          icon={RefreshCw}
          title="Backend Unavailable"
          message="Unable to connect to the Inspectra backend server. Please ensure the backend is running on port 8000."
          action={
            <Button variant="primary" icon={RefreshCw} onClick={loadData}>
              Retry Connection
            </Button>
          }
        />
      </div>
    );
  }

  if (error === 'endpoint_not_found') {
    return (
      <div className="overview-page">
        <EmptyState
          icon={AlertTriangle}
          title="Analytics Endpoint Not Implemented"
          message="The backend GET /api/analytics endpoint is not yet implemented. Please ask the backend team to implement this endpoint."
          action={
            <Button variant="secondary" onClick={() => navigate('/new-inspection')}>
              Run New Inspection
            </Button>
          }
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="overview-page">
        <EmptyState
          icon={AlertTriangle}
          title="Error Loading Dashboard"
          message="An unexpected error occurred while loading dashboard data."
          action={
            <Button variant="primary" icon={RefreshCw} onClick={loadData}>
              Try Again
            </Button>
          }
        />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="overview-page">
        <EmptyState
          icon={Package}
          title="No Data Available"
          message="No analytics data is available yet. Start by running your first inspection."
          action={
            <Button variant="primary" onClick={() => navigate('/new-inspection')}>
              New Inspection
            </Button>
          }
        />
      </div>
    );
  }

  const total = analytics.total_inspections || 0;
  const passedN = analytics.passed || 0;
  const rejectedN = analytics.rejected || 0;
  const reviewN = analytics.needs_review || 0;

  const defectRate = analytics.defect_rate !== undefined 
    ? analytics.defect_rate 
    : (total > 0 ? parseFloat(((rejectedN / total) * 100).toFixed(1)) : 0);

  const qualityData = [
    { name: 'PASS',         value: total > 0 ? parseFloat(((passedN / total) * 100).toFixed(1)) : 0,    count: passedN,   color: '#16A36A' },
    { name: 'REJECT',       value: total > 0 ? parseFloat(((rejectedN / total) * 100).toFixed(1)) : 0,  count: rejectedN, color: '#E5484D' },
    { name: 'NEEDS REVIEW', value: total > 0 ? parseFloat(((reviewN / total) * 100).toFixed(1)) : 0,    count: reviewN,   color: '#8957D5' },
  ].filter(item => item.count > 0);

  // Map backend defect_distribution { metal: 2, ... } to human-readable labels
  const rawDefectDist = analytics.defect_distribution || {};
  const defectCategories = Object.entries(rawDefectDist).map(([category, count]) => ({
    rawCategory: category,
    category: formatCategory(category),
    count: Number(count) || 0
  }));

  const hasAnomalies = defectCategories.some(d => d.count > 0);

  return (
    <div className="overview-page">
      <div className="page-header">
        <div>
          <h1 className="heading-lg">Industrial Quality Overview</h1>
          <p className="text-muted body-md">
            Monitor inspection activity, defect trends and production quality.
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <StatCard
          title="Total Inspections"
          value={total}
          icon={Package}
          format="number"
        />
        <StatCard
          title="Passed Products"
          value={passedN}
          icon={CheckCircle}
          format="number"
        />
        <StatCard
          title="Rejected Products"
          value={rejectedN}
          icon={XCircle}
          format="number"
        />
        <StatCard
          title="Defect Rate"
          value={defectRate}
          icon={AlertTriangle}
          format="percentage"
        />
      </div>

      {/* Charts Section: Quality Distribution & Defect Categories */}
      <div className="charts-grid">
        {/* Quality Distribution */}
        <div className="chart-card card">
          <div className="chart-header">
            <div>
              <h3 className="heading-sm">Quality Distribution</h3>
              <p className="text-muted body-sm">Overall inspection outcomes</p>
            </div>
          </div>
          <div className="chart-container">
            {qualityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={qualityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                    labelLine={{ stroke: 'var(--color-text-muted)' }}
                  >
                    {qualityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '12px'
                    }}
                    formatter={(value, name, props) => [
                      `${value}% (${props.payload.count} units)`,
                      name
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '240px' }}>
                <p className="text-muted body-sm">No inspection decisions recorded yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Defect Categories */}
        <div className="chart-card card">
          <div className="chart-header">
            <div>
              <h3 className="heading-sm">Defect Categories</h3>
              <p className="text-muted body-sm">Distribution of detected anomalies across product categories</p>
            </div>
          </div>
          <div className="chart-container">
            {hasAnomalies ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={defectCategories} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis 
                    type="number" 
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                    stroke="var(--color-border)"
                    allowDecimals={false}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="category"
                    width={140}
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                    stroke="var(--color-border)"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '12px'
                    }}
                    formatter={(value) => [
                      `${value} anomalies`,
                      'Detected'
                    ]}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="var(--color-primary-blue)" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '240px', textAlign: 'center', padding: '16px' }}>
                <p className="text-muted body-sm">
                  {total === 0 
                    ? "No inspections recorded yet." 
                    : "No anomalies detected yet across inspected product categories."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Inspections Table */}
      {recentInspections && recentInspections.length > 0 && (
        <div className="recent-inspections card">
          <div className="table-header">
            <h3 className="heading-sm">Recent Inspections</h3>
            <button 
              className="view-all-link"
              onClick={() => navigate('/history')}
            >
              View All →
            </button>
          </div>
          <div className="table-container">
            <table className="inspections-table">
              <thead>
                <tr>
                  <th>Inspection ID</th>
                  <th>Category</th>
                  <th>Timestamp</th>
                  <th>Anomaly Score</th>
                  <th>Defects</th>
                  <th>Decision</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentInspections.map((inspection) => (
                  <tr key={inspection.id}>
                    <td>
                      <span className="text-mono body-sm">{inspection.id}</span>
                    </td>
                    <td>{formatCategory(inspection.category)}</td>
                    <td className="text-muted body-sm">
                      {formatDate(inspection.timestamp)}
                    </td>
                    <td>
                      <span className="text-mono">{formatAnomalyScore(inspection.anomalyScore)}</span>
                    </td>
                    <td className="text-center">
                      <span className="defect-count">{inspection.defectCount}</span>
                    </td>
                    <td>
                      <StatusBadge status={inspection.status} size="small" />
                    </td>
                    <td>
                      <button 
                        className="table-action-btn"
                        onClick={() => navigate(`/history/${inspection.id}`)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No recent inspections message */}
      {(!recentInspections || recentInspections.length === 0) && !error && (
        <div className="recent-inspections card">
          <EmptyState
            icon={Package}
            title="No Recent Inspections"
            message="Start by running your first inspection to see results here."
            action={
              <Button variant="primary" onClick={() => navigate('/new-inspection')}>
                New Inspection
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
};

export default Overview;
