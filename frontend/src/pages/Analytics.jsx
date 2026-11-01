import React, { useState, useEffect } from 'react';
import {
  Package,
  XCircle,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Layers,
  FileCheck,
} from 'lucide-react';

import StatCard from '../components/common/StatCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import Button from '../components/common/Button';

import {
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
} from 'recharts';

import { getOverviewAnalytics } from '../api/endpoints';
import { formatCategory, formatPercentage } from '../utils/formatters';

import './Analytics.css';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getOverviewAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Error loading analytics:', err);

      if (!err.response) {
        setError('backend_offline');
      } else {
        setError('api_error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <LoadingSpinner
        size="large"
        message="Loading analytics data..."
      />
    );
  }

  // Backend unavailable state
  if (error === 'backend_offline') {
    return (
      <div className="analytics-page">
        <EmptyState
          icon={RefreshCw}
          title="Backend Unavailable"
          message="Cannot connect to the Inspectra backend. Ensure it is running on port 8000."
          action={
            <Button
              variant="primary"
              icon={RefreshCw}
              onClick={loadAnalytics}
            >
              Retry Connection
            </Button>
          }
        />
      </div>
    );
  }

  // API error state
  if (error) {
    return (
      <div className="analytics-page">
        <EmptyState
          icon={AlertTriangle}
          title="Error Loading Analytics"
          message="Failed to load analytics data from the backend."
          action={
            <Button
              variant="primary"
              icon={RefreshCw}
              onClick={loadAnalytics}
            >
              Try Again
            </Button>
          }
        />
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  // Backend metrics
  const total = analytics.total_inspections || 0;
  const passed = analytics.passed || 0;
  const rejected = analytics.rejected || 0;
  const needsReview = analytics.needs_review || 0;

  const passRate =
    analytics.pass_rate !== undefined
      ? analytics.pass_rate
      : (total > 0 ? parseFloat(((passed / total) * 100).toFixed(1)) : 0.0);

  const defectRate =
    analytics.defect_rate !== undefined
      ? analytics.defect_rate
      : (total > 0 ? parseFloat(((rejected / total) * 100).toFixed(1)) : 0.0);

  // Quality distribution pie chart data (Inspection Decisions: PASS, REJECT, NEEDS REVIEW)
  const qualityData = [
    {
      name: 'PASS',
      value: passed,
      color: '#16A36A',
    },
    {
      name: 'REJECT',
      value: rejected,
      color: '#E5484D',
    },
    {
      name: 'NEEDS REVIEW',
      value: needsReview,
      color: '#8957D5',
    },
  ].filter((item) => item.value > 0);

  // Product categories breakdown:
  // Derived from backend category_breakdown or fallback to defect_distribution
  let categoryBreakdown = analytics.category_breakdown;
  if (!categoryBreakdown || categoryBreakdown.length === 0) {
    const rawDefectDist = analytics.defect_distribution || {};
    categoryBreakdown = Object.entries(rawDefectDist).map(([cat, count]) => ({
      category: cat,
      total_inspections: count,
      anomalies_detected: count,
      normal_count: 0,
      passed: 0,
      rejected: count,
      needs_review: 0,
      anomaly_rate: 100.0,
    }));
  }

  // Anomalies by Category bar chart data
  // Strictly product categories (e.g., Metal Components, Electronics, etc.)
  // Never confused with decision classes (PASS, REJECT, NEEDS REVIEW)
  const anomaliesBarData = categoryBreakdown.map((item) => ({
    rawCategory: item.category,
    category: formatCategory(item.category),
    anomalies: item.anomalies_detected || 0,
    total: item.total_inspections || 0,
  }));

  const hasAnyAnomalies = anomaliesBarData.some((d) => d.anomalies > 0);

  return (
    <div className="analytics-page">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="heading-lg">
            Analytics Dashboard
          </h1>
          <p className="text-muted body-md">
            Verifiable quality inspection metrics calculated directly from persisted inspection records.
          </p>
        </div>

        <Button
          variant="secondary"
          icon={RefreshCw}
          size="medium"
          onClick={loadAnalytics}
        >
          Refresh
        </Button>
      </div>

      {/* Key metrics */}
      <div className="metrics-grid">
        <StatCard
          title="Total Inspections"
          value={total}
          icon={Package}
          format="number"
        />

        <StatCard
          title="Pass Rate"
          value={passRate}
          icon={CheckCircle}
          format="percentage"
        />

        <StatCard
          title="Defect Rate"
          value={defectRate}
          icon={AlertTriangle}
          format="percentage"
        />

        <StatCard
          title="Rejected Products"
          value={rejected}
          icon={XCircle}
          format="number"
        />
      </div>

      {/* No inspections state */}
      {total === 0 ? (
        <div
          className="card"
          style={{
            padding: '48px',
            textAlign: 'center',
            marginTop: '24px',
          }}
        >
          <EmptyState
            icon={Package}
            title="No Inspections Recorded"
            message="No inspections recorded yet. Run your first inspection to generate analytics."
          />
        </div>
      ) : (
        <>
          <div className="analytics-grid" style={{ marginTop: '24px' }}>
            {/* Quality distribution (Inspection Decisions) */}
            <div className="chart-card card">
              <div className="chart-header">
                <div>
                  <h3 className="heading-sm">
                    Quality Distribution (Decisions)
                  </h3>
                  <p className="text-muted body-sm">
                    Overall inspection outcomes (PASS / REJECT / NEEDS REVIEW)
                  </p>
                </div>
              </div>

              <div className="chart-container">
                {qualityData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={qualityData}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={100}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                          labelLine={false}
                        >
                          {qualityData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.color}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--color-card)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '12px',
                          }}
                          formatter={(value, name) => [
                            `${value} inspections (${((value / total) * 100).toFixed(1)}%)`,
                            name,
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Quality legend */}
                    <div className="quality-legend" style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '10px' }}>
                      {qualityData.map((entry, index) => (
                        <div
                          key={index}
                          className="legend-item"
                          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          <div
                            className="legend-dot"
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: entry.color,
                            }}
                          />
                          <span className="legend-name body-sm" style={{ fontWeight: 600 }}>
                            {entry.name}: {entry.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '240px' }}>
                    <p className="text-muted body-sm">No inspection decisions recorded.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Anomalies by Category */}
            <div className="chart-card card">
              <div className="chart-header">
                <div>
                  <h3 className="heading-sm">
                    Anomalies by Product Category
                  </h3>
                  <p className="text-muted body-sm">
                    AI-detected ANOMALY predictions per product category
                  </p>
                </div>
              </div>

              <div className="chart-container">
                {anomaliesBarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={anomaliesBarData}
                      layout="vertical"
                      margin={{ left: 10, right: 30, top: 10, bottom: 10 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--color-border)"
                      />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{
                          fill: 'var(--color-text-muted)',
                          fontSize: 12,
                        }}
                        stroke="var(--color-border)"
                      />
                      <YAxis
                        type="category"
                        dataKey="category"
                        width={130}
                        tick={{
                          fill: 'var(--color-text-muted)',
                          fontSize: 12,
                        }}
                        stroke="var(--color-border)"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-card)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '12px',
                        }}
                        formatter={(value, name, props) => [
                          `${value} anomalies (out of ${props.payload.total} inspected)`,
                          'Anomalies'
                        ]}
                      />
                      <Bar
                        dataKey="anomalies"
                        fill="#E5484D"
                        radius={[0, 4, 4, 0]}
                        label={{
                          position: 'right',
                          fill: 'var(--color-text-muted)',
                          fontSize: 11,
                          formatter: (val) => `${val}`,
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '240px', textAlign: 'center', padding: '16px' }}>
                    <p className="text-muted body-sm">
                      No anomalies detected yet across product categories.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Category Metrics Breakdown */}
          <div className="card" style={{ marginTop: '24px', padding: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 className="heading-sm">Category Inspection Breakdown</h3>
              <p className="text-muted body-sm">
                Distinction between Total Inspections, Anomalous Predictions, and Final Quality Decisions (PASS / REJECT / NEEDS REVIEW).
              </p>
            </div>

            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="inspections-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '12px' }}>Product Category</th>
                    <th style={{ textAlign: 'center', padding: '12px' }}>Total Inspected</th>
                    <th style={{ textAlign: 'center', padding: '12px' }}>Normal Predictions</th>
                    <th style={{ textAlign: 'center', padding: '12px' }}>Anomalous Predictions</th>
                    <th style={{ textAlign: 'center', padding: '12px' }}>Passed</th>
                    <th style={{ textAlign: 'center', padding: '12px' }}>Needs Review</th>
                    <th style={{ textAlign: 'center', padding: '12px' }}>Rejected</th>
                    <th style={{ textAlign: 'right', padding: '12px' }}>Anomaly Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryBreakdown.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px', fontWeight: 600 }}>
                        {formatCategory(item.category)}
                      </td>
                      <td style={{ textAlign: 'center', padding: '12px' }}>
                        <span className="text-mono">{item.total_inspections}</span>
                      </td>
                      <td style={{ textAlign: 'center', padding: '12px', color: 'var(--color-success)' }}>
                        <span className="text-mono">{item.normal_count}</span>
                      </td>
                      <td style={{ textAlign: 'center', padding: '12px', color: item.anomalies_detected > 0 ? 'var(--color-danger)' : 'inherit' }}>
                        <span className="text-mono">{item.anomalies_detected}</span>
                      </td>
                      <td style={{ textAlign: 'center', padding: '12px' }}>
                        <span className="text-mono">{item.passed}</span>
                      </td>
                      <td style={{ textAlign: 'center', padding: '12px' }}>
                        <span className="text-mono">{item.needs_review}</span>
                      </td>
                      <td style={{ textAlign: 'center', padding: '12px' }}>
                        <span className="text-mono">{item.rejected}</span>
                      </td>
                      <td style={{ textAlign: 'right', padding: '12px', fontWeight: 600 }}>
                        <span className="text-mono">{item.anomaly_rate}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
