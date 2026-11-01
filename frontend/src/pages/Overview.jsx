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
import { formatDate, formatAnomalyScore } from '../utils/formatters';
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

  // Calculate derived data from analytics
  const activityData = analytics.inspection_activity || analytics.activity || [];
  const qualityData = analytics.quality_distribution || [
    { name: 'PASS', value: analytics.pass_rate || 0, count: analytics.passed || 0, color: '#16A36A' },
    { name: 'REJECT', value: analytics.reject_rate || 0, count: analytics.rejected || 0, color: '#E5484D' },
    { name: 'NEEDS REVIEW', value: analytics.review_rate || 0, count: analytics.needs_review || 0, color: '#8957D5' }
  ].filter(item => item.value > 0);
  
  const defectCategories = analytics.defect_distribution || analytics.defect_categories || [];

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
          value={analytics.total_inspections || analytics.totalInspections || 0}
          icon={Package}
          trend={analytics.trends?.total_inspections}
          trendLabel="vs last week"
          format="number"
        />
        <StatCard
          title="Passed Products"
          value={analytics.passed || analytics.passedProducts || 0}
          icon={CheckCircle}
          trend={analytics.trends?.passed}
          trendLabel="vs last week"
          format="number"
        />
        <StatCard
          title="Rejected Products"
          value={analytics.rejected || analytics.rejectedProducts || 0}
          icon={XCircle}
          trend={analytics.trends?.rejected}
          trendLabel="vs last week"
          format="number"
        />
        <StatCard
          title="Defect Rate"
          value={analytics.defect_rate || analytics.defectRate || 0}
          icon={AlertTriangle}
          trend={analytics.trends?.defect_rate}
          trendLabel="vs last week"
          format="percentage"
        />
      </div>

      {/* Charts Section - Only show if data is available */}
      {activityData && activityData.length > 0 && (
        <div className="charts-grid">
          {/* Inspection Activity */}
          <div className="chart-card card">
            <div className="chart-header">
              <div>
                <h3 className="heading-sm">Inspection Activity</h3>
                <p className="text-muted body-sm">Daily inspection volume</p>
              </div>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                    stroke="var(--color-border)"
                  />
                  <YAxis 
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
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="inspections"
                    stroke="var(--color-primary-blue)"
                    strokeWidth={2}
                    dot={{ fill: 'var(--color-primary-blue)', r: 4 }}
                    name="Total Inspections"
                  />
                  {activityData[0]?.defects !== undefined && (
                    <Line
                      type="monotone"
                      dataKey="defects"
                      stroke="var(--color-danger)"
                      strokeWidth={2}
                      dot={{ fill: 'var(--color-danger)', r: 4 }}
                      name="Defects Found"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quality Distribution */}
          {qualityData && qualityData.length > 0 && (
            <div className="chart-card card">
              <div className="chart-header">
                <div>
                  <h3 className="heading-sm">Quality Distribution</h3>
                  <p className="text-muted body-sm">Overall inspection outcomes</p>
                </div>
              </div>
              <div className="chart-container">
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
              </div>
            </div>
          )}
        </div>
      )}

      {/* Defect Categories */}
      {defectCategories && defectCategories.length > 0 && (
        <div className="chart-card card">
          <div className="chart-header">
            <div>
              <h3 className="heading-sm">Defect Categories</h3>
              <p className="text-muted body-sm">Distribution of detected defect types</p>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={defectCategories} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis 
                  type="number" 
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                  stroke="var(--color-border)"
                />
                <YAxis 
                  type="category" 
                  dataKey="category"
                  width={150}
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
                  formatter={(value, name) => [
                    `${value} defects`,
                    'Count'
                  ]}
                />
                <Bar 
                  dataKey="count" 
                  fill="var(--color-primary-blue)" 
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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
                    <td>{inspection.category}</td>
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
