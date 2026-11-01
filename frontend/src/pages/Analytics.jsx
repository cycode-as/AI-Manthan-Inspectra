import React, { useState, useEffect } from 'react';
import { TrendingUp, Package, XCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import StatCard from '../components/common/StatCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  getMockOverviewAnalytics,
  getMockInspectionActivity,
  getMockQualityDistribution,
  getMockDefectCategories
} from '../api/mockData';
import './Analytics.css';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [activityData, setActivityData] = useState([]);
  const [qualityData, setQualityData] = useState([]);
  const [defectCategories, setDefectCategories] = useState([]);
  const [timeRange, setTimeRange] = useState('14days');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 700));
      setAnalytics(getMockOverviewAnalytics());
      setActivityData(getMockInspectionActivity());
      setQualityData(getMockQualityDistribution());
      setDefectCategories(getMockDefectCategories());
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="large" message="Loading analytics data..." />;
  }

  return (
    <div className="analytics-page">
      <div className="page-header">
        <div>
          <h1 className="heading-lg">Analytics Dashboard</h1>
          <p className="text-muted body-md">
            Comprehensive quality inspection metrics and trends analysis.
          </p>
        </div>
        
        <div className="time-range-selector">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="time-range-select"
          >
            <option value="7days">Last 7 Days</option>
            <option value="14days">Last 14 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <StatCard
          title="Total Inspections"
          value={analytics.totalInspections}
          icon={Package}
          trend={analytics.comparisonData.totalInspections.change}
          trendLabel={analytics.comparisonData.totalInspections.period}
          format="number"
        />
        <StatCard
          title="Pass Rate"
          value={((analytics.passedProducts / analytics.totalInspections) * 100).toFixed(1)}
          icon={CheckCircle}
          trend={analytics.comparisonData.passedProducts.change}
          trendLabel={analytics.comparisonData.passedProducts.period}
          format="percentage"
        />
        <StatCard
          title="Defect Rate"
          value={analytics.defectRate}
          icon={AlertTriangle}
          trend={analytics.comparisonData.defectRate.change}
          trendLabel={analytics.comparisonData.defectRate.period}
          format="percentage"
        />
        <StatCard
          title="Rejected Products"
          value={analytics.rejectedProducts}
          icon={XCircle}
          trend={analytics.comparisonData.rejectedProducts.change}
          trendLabel={analytics.comparisonData.rejectedProducts.period}
          format="number"
        />
      </div>

      {/* Inspection Volume Trend */}
      <div className="chart-card card">
        <div className="chart-header">
          <div>
            <h3 className="heading-sm">Inspection Volume Trend</h3>
            <p className="text-muted body-sm">Daily inspection activity and defect detection rate</p>
          </div>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={activityData}>
              <defs>
                <linearGradient id="colorInspections" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary-blue)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--color-primary-blue)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorDefects" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-danger)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--color-danger)" stopOpacity={0}/>
                </linearGradient>
              </defs>
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
              <Area
                type="monotone"
                dataKey="inspections"
                stroke="var(--color-primary-blue)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorInspections)"
                name="Total Inspections"
              />
              <Area
                type="monotone"
                dataKey="defects"
                stroke="var(--color-danger)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorDefects)"
                name="Defects Found"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quality and Defects Grid */}
      <div className="analytics-grid">
        {/* Quality Distribution */}
        <div className="chart-card card">
          <div className="chart-header">
            <div>
              <h3 className="heading-sm">Quality Distribution</h3>
              <p className="text-muted body-sm">Overall inspection outcomes breakdown</p>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={qualityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${value}%`}
                  labelLine={false}
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
            
            <div className="quality-legend">
              {qualityData.map((entry, index) => (
                <div key={index} className="legend-item">
                  <div className="legend-dot" style={{ backgroundColor: entry.color }}></div>
                  <div className="legend-info">
                    <span className="legend-name">{entry.name}</span>
                    <span className="legend-value text-mono">{entry.count} units</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Defect Categories */}
        <div className="chart-card card">
          <div className="chart-header">
            <div>
              <h3 className="heading-sm">Most Frequent Defect Types</h3>
              <p className="text-muted body-sm">Defect category distribution</p>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={defectCategories} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis 
                  type="number" 
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                  stroke="var(--color-border)"
                />
                <YAxis 
                  type="category" 
                  dataKey="category"
                  width={120}
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                  stroke="var(--color-border)"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '12px'
                  }}
                  formatter={(value) => [`${value} defects`, 'Count']}
                />
                <Bar 
                  dataKey="count" 
                  fill="var(--color-danger)" 
                  radius={[0, 4, 4, 0]}
                  label={{
                    position: 'right',
                    fill: 'var(--color-text-muted)',
                    fontSize: 11,
                    formatter: (value) => `${value}`
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="summary-card card">
        <h3 className="heading-sm">Performance Summary</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Average Anomaly Score</span>
            <span className="summary-value text-mono">34.7%</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Average Processing Time</span>
            <span className="summary-value text-mono">1,247ms</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total Defects Detected</span>
            <span className="summary-value text-mono">158</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Manual Reviews Required</span>
            <span className="summary-value text-mono">{analytics.needsReview}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
