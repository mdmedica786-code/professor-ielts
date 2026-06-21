/**
 * Chart utility functions for validating and converting chart data.
 * Accepts a simple JSON schema and converts it to Chart.js configuration.
 */

/**
 * Pre-built color palette for charts (accessible, vibrant, distinct).
 */
const CHART_COLORS = [
  '#6366f1', // indigo
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ef4444', // red
  '#10b981', // emerald
  '#f97316', // orange
  '#3b82f6', // blue
];

/**
 * Supported chart types.
 */
const CHART_TYPES = ['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea'];

/**
 * Validate chart data JSON. Returns { valid: boolean, errors: string[] }.
 */
export function validateChartData(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Data must be a JSON object.'] };
  }

  if (!data.type || !CHART_TYPES.includes(data.type)) {
    errors.push(`"type" must be one of: ${CHART_TYPES.join(', ')}. Got: "${data.type}".`);
  }

  if (!data.labels || !Array.isArray(data.labels) || data.labels.length === 0) {
    errors.push('"labels" must be a non-empty array of strings.');
  }

  if (!data.datasets || !Array.isArray(data.datasets) || data.datasets.length === 0) {
    errors.push('"datasets" must be a non-empty array.');
  } else {
    data.datasets.forEach((ds, i) => {
      if (!ds.label || typeof ds.label !== 'string') {
        errors.push(`Dataset ${i + 1}: "label" is required and must be a string.`);
      }
      if (!ds.data || !Array.isArray(ds.data)) {
        errors.push(`Dataset ${i + 1}: "data" must be an array of numbers.`);
      } else if (data.labels && ds.data.length !== data.labels.length) {
        errors.push(`Dataset ${i + 1}: "data" length (${ds.data.length}) must match "labels" length (${data.labels.length}).`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Convert our simple schema to a Chart.js-compatible configuration object.
 */
export function chartDataToChartJS(data) {
  const isCircular = ['pie', 'doughnut', 'polarArea'].includes(data.type);

  const datasets = data.datasets.map((ds, i) => {
    const color = ds.color || CHART_COLORS[i % CHART_COLORS.length];
    
    if (isCircular) {
      // Circular charts need an array of colors (one per label)
      const colors = data.labels.map((_, j) => CHART_COLORS[j % CHART_COLORS.length]);
      return {
        label: ds.label,
        data: ds.data,
        backgroundColor: colors.map(c => c + 'cc'), // Add some transparency
        borderColor: colors,
        borderWidth: 2,
      };
    }

    return {
      label: ds.label,
      data: ds.data,
      backgroundColor: data.type === 'bar' ? color + 'cc' : color + '33',
      borderColor: color,
      borderWidth: 2,
      fill: data.type === 'line' || data.type === 'radar',
      tension: data.type === 'line' ? 0.3 : undefined,
      pointBackgroundColor: color,
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: data.type === 'line' ? 4 : undefined,
    };
  });

  return {
    type: data.type,
    data: {
      labels: data.labels,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        title: {
          display: !!data.title,
          text: data.title || '',
          font: { size: 16, weight: 'bold' },
          color: '#1e293b',
          padding: { bottom: 16 },
        },
        legend: {
          position: isCircular ? 'bottom' : 'top',
          labels: {
            usePointStyle: true,
            padding: 16,
            font: { size: 12 },
            color: '#475569',
          },
        },
        tooltip: {
          backgroundColor: '#1e293b',
          titleFont: { size: 13 },
          bodyFont: { size: 12 },
          cornerRadius: 8,
          padding: 10,
        },
      },
      scales: isCircular ? {} : {
        x: {
          grid: { color: '#f1f5f9' },
          ticks: { color: '#64748b', font: { size: 11 } },
        },
        y: {
          grid: { color: '#f1f5f9' },
          ticks: { color: '#64748b', font: { size: 11 } },
          beginAtZero: true,
        },
      },
    },
  };
}

/**
 * Sample chart data templates for each chart type.
 */
export const SAMPLE_CHARTS = {
  bar: {
    type: 'bar',
    title: 'Population by Country (millions)',
    labels: ['China', 'India', 'USA', 'Indonesia', 'Pakistan', 'Brazil'],
    datasets: [
      {
        label: '2020',
        data: [1439, 1380, 331, 273, 220, 212],
        color: '#6366f1',
      },
      {
        label: '2025',
        data: [1426, 1441, 340, 279, 239, 216],
        color: '#ec4899',
      },
    ],
  },
  line: {
    type: 'line',
    title: 'Global Temperature Anomaly (°C)',
    labels: ['1990', '1995', '2000', '2005', '2010', '2015', '2020', '2025'],
    datasets: [
      {
        label: 'Temperature Anomaly',
        data: [0.45, 0.46, 0.42, 0.67, 0.72, 0.90, 1.02, 1.15],
        color: '#ef4444',
      },
    ],
  },
  pie: {
    type: 'pie',
    title: 'Energy Sources (%)',
    labels: ['Coal', 'Natural Gas', 'Nuclear', 'Renewables', 'Oil'],
    datasets: [
      {
        label: 'Share',
        data: [27, 24, 10, 29, 10],
      },
    ],
  },
  doughnut: {
    type: 'doughnut',
    title: 'Student Score Distribution',
    labels: ['Band 5-5.5', 'Band 6-6.5', 'Band 7-7.5', 'Band 8-9'],
    datasets: [
      {
        label: 'Students',
        data: [15, 40, 30, 15],
      },
    ],
  },
  radar: {
    type: 'radar',
    title: 'IELTS Score Comparison',
    labels: ['Listening', 'Reading', 'Writing', 'Speaking'],
    datasets: [
      {
        label: 'Student A',
        data: [7.5, 8.0, 6.5, 7.0],
        color: '#6366f1',
      },
      {
        label: 'Student B',
        data: [6.0, 6.5, 7.0, 7.5],
        color: '#ec4899',
      },
    ],
  },
  polarArea: {
    type: 'polarArea',
    title: 'Time Spent per Study Area (hours/week)',
    labels: ['Grammar', 'Vocabulary', 'Speaking', 'Listening', 'Writing', 'Reading'],
    datasets: [
      {
        label: 'Hours',
        data: [5, 8, 3, 6, 4, 7],
      },
    ],
  },
};

export { CHART_TYPES, CHART_COLORS };
