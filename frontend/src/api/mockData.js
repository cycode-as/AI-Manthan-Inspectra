// ===================================
// INSPECTRA 2.0 - MOCK DATA
// Used when backend is not available
// ===================================

import { generateInspectionId } from '../utils/formatters';

/**
 * Generate mock inspection history
 */
export function getMockInspections(count = 20) {
  const categories = ['metal', 'textiles', 'electronics', 'other'];
  const statuses = ['PASS', 'REJECT', 'NEEDS_REVIEW'];
  const inspections = [];
  
  for (let i = 0; i < count; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const anomalyScore = status === 'PASS' 
      ? Math.random() * 0.3 
      : status === 'REJECT' 
      ? 0.7 + Math.random() * 0.3 
      : 0.3 + Math.random() * 0.4;
    
    inspections.push({
      id: generateInspectionId(),
      category,
      status,
      anomalyScore,
      defectCount: status === 'PASS' ? 0 : Math.floor(Math.random() * 5) + 1,
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      processingTime: Math.floor(Math.random() * 2000) + 500,
      imageUrl: null,
      modelVersion: 'v2.3.1'
    });
  }
  
  return inspections.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * Generate mock overview analytics
 */
export function getMockOverviewAnalytics() {
  const totalInspections = 1247;
  const passedProducts = 1089;
  const rejectedProducts = 98;
  const needsReview = 60;
  
  return {
    totalInspections,
    passedProducts,
    rejectedProducts,
    needsReview,
    defectRate: ((rejectedProducts / totalInspections) * 100).toFixed(2),
    comparisonData: {
      totalInspections: { change: 12.5, period: 'vs last week' },
      passedProducts: { change: 8.3, period: 'vs last week' },
      rejectedProducts: { change: -5.2, period: 'vs last week' },
      defectRate: { change: -2.1, period: 'vs last week' }
    }
  };
}

/**
 * Generate mock inspection activity chart data
 */
export function getMockInspectionActivity() {
  const days = 14;
  const data = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      inspections: Math.floor(Math.random() * 100) + 50,
      defects: Math.floor(Math.random() * 20) + 5
    });
  }
  
  return data;
}

/**
 * Generate mock quality distribution
 */
export function getMockQualityDistribution() {
  return [
    { name: 'PASS', value: 87.3, count: 1089, color: '#16A36A' },
    { name: 'REJECT', value: 7.9, count: 98, color: '#E5484D' },
    { name: 'NEEDS REVIEW', value: 4.8, count: 60, color: '#8957D5' }
  ];
}

/**
 * Generate mock defect categories
 */
export function getMockDefectCategories() {
  return [
    { category: 'Surface Scratches', count: 45, percentage: 38.5 },
    { category: 'Cracks', count: 32, percentage: 27.4 },
    { category: 'Discoloration', count: 18, percentage: 15.4 },
    { category: 'Deformation', count: 14, percentage: 12.0 },
    { category: 'Contamination', count: 8, percentage: 6.7 }
  ];
}

/**
 * Generate mock model performance
 */
export function getMockModelPerformance() {
  return {
    modelVersion: 'v2.3.1',
    status: 'OPERATIONAL',
    supportedCategories: ['Metal Components', 'Textiles', 'Electronics', 'Other'],
    metrics: {
      imageLevelAUROC: 0.967,
      pixelLevelAUROC: 0.984,
      precision: 0.943,
      recall: 0.921,
      f1Score: 0.932,
      averageInferenceTime: 847
    },
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Generate mock inspection result with defects
 */
export function getMockInspectionResult(category = 'metal') {
  const hasDefects = Math.random() > 0.3;
  const defectCount = hasDefects ? Math.floor(Math.random() * 3) + 1 : 0;
  const anomalyScore = hasDefects ? 0.6 + Math.random() * 0.4 : Math.random() * 0.3;
  
  const defects = [];
  
  if (hasDefects) {
    for (let i = 0; i < defectCount; i++) {
      const x = Math.random() * 0.7 + 0.1;
      const y = Math.random() * 0.7 + 0.1;
      const width = Math.random() * 0.15 + 0.1;
      const height = Math.random() * 0.15 + 0.1;
      
      defects.push({
        id: `defect-${i + 1}`,
        type: ['Scratch', 'Crack', 'Discoloration', 'Deformation'][Math.floor(Math.random() * 4)],
        severity: anomalyScore > 0.8 ? 'HIGH' : anomalyScore > 0.5 ? 'MEDIUM' : 'LOW',
        confidence: 0.85 + Math.random() * 0.14,
        boundingBox: {
          x,
          y,
          width,
          height
        }
      });
    }
  }
  
  const status = anomalyScore > 0.7 ? 'REJECT' : anomalyScore > 0.4 ? 'NEEDS_REVIEW' : 'PASS';
  
  return {
    id: generateInspectionId(),
    category,
    status,
    anomalyScore,
    defectCount,
    defects,
    processingTime: Math.floor(Math.random() * 1500) + 500,
    modelVersion: 'v2.3.1',
    timestamp: new Date().toISOString(),
    imageUrl: null,
    heatmapUrl: null
  };
}
