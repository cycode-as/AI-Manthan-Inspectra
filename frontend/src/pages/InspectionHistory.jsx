import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Calendar, Download, RefreshCw } from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import Button from '../components/common/Button';
import { getInspections } from '../api/endpoints';
import { formatDate, formatAnomalyScore, formatCategory } from '../utils/formatters';
import { PRODUCT_CATEGORIES, INSPECTION_STATUS } from '../utils/constants';
import './InspectionHistory.css';

const InspectionHistory = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [filteredInspections, setFilteredInspections] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadInspections();
  }, []);

  useEffect(() => {
    filterInspections();
  }, [searchQuery, categoryFilter, statusFilter, inspections]);

  const loadInspections = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Try to fetch from backend
      const response = await getInspections();
      
      // Handle different response formats
      const data = Array.isArray(response) ? response : (response.inspections || response.data || []);
      
      // Transform backend data to frontend format if needed
      const transformedData = data.map(item => ({
        id: item.inspection_id || item.id,
        category: item.category,
        status: item.decision || item.status,
        anomalyScore: item.anomaly_score || item.anomalyScore,
        defectCount: item.defect_count || item.defectCount || 0,
        timestamp: item.created_at || item.timestamp,
        processingTime: item.inference_time_ms || item.processingTime,
        imageUrl: item.original_image_url || item.imageUrl,
        modelVersion: item.model_version || item.modelVersion
      }));
      
      setInspections(transformedData);
      setFilteredInspections(transformedData);
    } catch (err) {
      console.error('Error loading inspections:', err);
      if (!err.response) {
        setError('backend_offline');
      } else {
        setError('api_error');
      }
      setInspections([]);
      setFilteredInspections([]);
    } finally {
      setLoading(false);
    }
  };

  const filterInspections = () => {
    let filtered = [...inspections];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(inspection =>
        inspection.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(inspection => inspection.category === categoryFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(inspection => inspection.status === statusFilter);
    }

    setFilteredInspections(filtered);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setStatusFilter('all');
  };

  // Pagination
  const totalPages = Math.ceil(filteredInspections.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentInspections = filteredInspections.slice(startIndex, endIndex);

  if (loading) {
    return <LoadingSpinner size="large" message="Loading inspection history..." />;
  }

  // Error states
  if (error === 'backend_offline') {
    return (
      <div className="history-page">
        <div className="error-container card">
          <RefreshCw size={48} className="error-icon" />
          <h2 className="heading-md">Backend Unavailable</h2>
          <p className="text-muted body-md">
            Unable to connect to the Inspectra backend server. Please ensure the backend is running on port 8000.
          </p>
          <div className="error-actions">
            <Button variant="primary" icon={RefreshCw} onClick={loadInspections}>
              Retry Connection
            </Button>
            <Button variant="secondary" onClick={() => navigate('/new-inspection')}>
              New Inspection
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (error === 'api_error') {
    return (
      <div className="history-page">
        <div className="error-container card">
          <RefreshCw size={48} className="error-icon" />
          <h2 className="heading-md">Error Loading History</h2>
          <p className="text-muted body-md">
            An error occurred while loading inspection history. The backend may not have implemented the GET /api/history endpoint yet.
          </p>
          <div className="error-actions">
            <Button variant="primary" icon={RefreshCw} onClick={loadInspections}>
              Try Again
            </Button>
            <Button variant="secondary" onClick={() => navigate('/new-inspection')}>
              New Inspection
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="history-page">
      <div className="page-header">
        <div>
          <h1 className="heading-lg">Inspection History</h1>
          <p className="text-muted body-md">
            View and analyze past quality inspection results.
          </p>
        </div>
        <Button variant="secondary" icon={Download} size="medium">
          Export Data
        </Button>
      </div>

      {/* Filters Section */}
      <div className="filters-section card">
        <div className="filters-row">
          {/* Search */}
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by Inspection ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Category Filter */}
          <div className="filter-group">
            <Filter size={16} className="filter-icon" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Categories</option>
              {PRODUCT_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="filter-group">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Statuses</option>
              <option value={INSPECTION_STATUS.PASS}>Pass</option>
              <option value={INSPECTION_STATUS.REJECT}>Reject</option>
              <option value={INSPECTION_STATUS.NEEDS_REVIEW}>Needs Review</option>
            </select>
          </div>

          {/* Clear Filters */}
          {(searchQuery || categoryFilter !== 'all' || statusFilter !== 'all') && (
            <button className="clear-filters-btn" onClick={handleClearFilters}>
              Clear Filters
            </button>
          )}
        </div>

        <div className="results-count">
          <span className="text-mono">
            {filteredInspections.length} inspection{filteredInspections.length !== 1 ? 's' : ''} found
          </span>
        </div>
      </div>

      {/* Inspections Table */}
      {error || filteredInspections.length === 0 ? (
        <EmptyState
          title={error ? "Unable to load inspections" : "No inspections found"}
          message={error ? "Check your connection and try again." : "Try adjusting your filters or run a new inspection."}
          action={
            error ? (
              <Button variant="primary" icon={RefreshCw} onClick={loadInspections}>
                Retry
              </Button>
            ) : (
              <Button variant="primary" onClick={() => navigate('/new-inspection')}>
                New Inspection
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="history-table card">
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
                    <th>Processing Time</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentInspections.map((inspection) => (
                    <tr key={inspection.id}>
                      <td>
                        <span className="text-mono body-sm inspection-id">
                          {inspection.id}
                        </span>
                      </td>
                      <td>{formatCategory(inspection.category)}</td>
                      <td className="text-muted body-sm">
                        {formatDate(inspection.timestamp)}
                      </td>
                      <td>
                        <span className="text-mono">
                          {formatAnomalyScore(inspection.anomalyScore)}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="defect-count">
                          {inspection.defectCount}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={inspection.status} size="small" />
                      </td>
                      <td className="text-mono body-sm">
                        {inspection.processingTime}ms
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              
              <div className="pagination-info">
                <span className="text-mono">
                  Page {currentPage} of {totalPages}
                </span>
              </div>

              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InspectionHistory;
