'use client';

import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { FaSpinner } from 'react-icons/fa';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const NetworkHistoryChart = ({
  data = [],
  dataKey = 'value',
  labelKey = 'time',
  color = '#3b82f6',
  loading = false,
  yAxisLabel = '',
  tooltipLabel = 'Value',
  tooltipUnit = '',
  warningThreshold = null,
  criticalThreshold = null,
  thresholdCompare = 'above',
  secondaryThreshold = null,
  secondaryThresholdLabel = 'Target',
  secondaryThresholdColor = 'rgba(75, 192, 192, 0.8)',
}) => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [],
  });

  useEffect(() => {
    // Process data to handle empty, undefined or sparse datasets
    const processedData = data && data.length ? [...data].filter(item => 
      item && 
      item[dataKey] !== undefined && 
      item[dataKey] !== null && 
      !isNaN(item[dataKey]) && 
      isFinite(item[dataKey])
    ) : [];

    // Add initial dummy data points if we have no data
    if (processedData.length === 0) {
      // Create dummy data with zero values to ensure chart renders
      for (let i = 0; i < 5; i++) {
        const time = new Date();
        time.setMinutes(time.getMinutes() - (5 - i));
        processedData.push({
          [labelKey]: time.toLocaleTimeString(),
          [dataKey]: 0
        });
      }
    }

    // Format the labels (timestamps) for better display
    const formattedLabels = processedData.map(item => {
      const timestamp = item[labelKey];
      
      // Handle different timestamp formats
      let date;
      if (timestamp instanceof Date) {
        date = timestamp;
      } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      } else {
        // Fallback to current time if timestamp is invalid
        date = new Date();
      }
      
      // Format time as HH:MM
      return date.getHours().toString().padStart(2, '0') + ':' + 
             date.getMinutes().toString().padStart(2, '0');
    });

    // Extract the data values
    const dataValues = processedData.map(item => item[dataKey]);

    // Determine point colors based on thresholds
    const pointBackgroundColors = dataValues.map(value => {
      if (criticalThreshold !== null && 
          ((thresholdCompare === 'above' && value >= criticalThreshold) || 
           (thresholdCompare === 'below' && value <= criticalThreshold))) {
        return 'rgba(239, 68, 68, 0.8)'; // Red for critical
      }
      if (warningThreshold !== null && 
          ((thresholdCompare === 'above' && value >= warningThreshold) || 
           (thresholdCompare === 'below' && value <= warningThreshold))) {
        return 'rgba(245, 158, 11, 0.8)'; // Orange for warning
      }
      return 'rgba(16, 185, 129, 0.8)'; // Green for normal
    });

    // Create datasets array
    const datasets = [
      {
        label: tooltipLabel,
        data: dataValues,
        borderColor: color,
        backgroundColor: pointBackgroundColors,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.4, // Smooth curve
        fill: false
      }
    ];

    // Add threshold line if specified
    if (warningThreshold !== null) {
      datasets.push({
        label: 'Warning Threshold',
        data: Array(dataValues.length).fill(warningThreshold),
        borderColor: 'rgba(245, 158, 11, 0.5)',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false
      });
    }

    if (criticalThreshold !== null) {
      datasets.push({
        label: 'Critical Threshold',
        data: Array(dataValues.length).fill(criticalThreshold),
        borderColor: 'rgba(239, 68, 68, 0.5)',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false
      });
    }

    // Add secondary threshold if specified
    if (secondaryThreshold !== null) {
      datasets.push({
        label: secondaryThresholdLabel,
        data: Array(dataValues.length).fill(secondaryThreshold),
        borderColor: secondaryThresholdColor,
        borderWidth: 2,
        borderDash: [3, 3],
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 0,
      });
    }

    setChartData({
      labels: formattedLabels,
      datasets,
    });
  }, [data, dataKey, labelKey, color, warningThreshold, criticalThreshold, thresholdCompare, secondaryThreshold, secondaryThresholdLabel, secondaryThresholdColor, tooltipLabel]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 800, // Animation duration in milliseconds
      easing: 'easeOutQuart' // Easing function
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            
            const value = context.parsed.y;
            label += value;
            
            // Add unit if provided
            if (tooltipUnit) {
              label += ` ${tooltipUnit}`;
            }
            
            // Add threshold status if it's the main dataset
            if (context.datasetIndex === 0 && warningThreshold !== null && criticalThreshold !== null) {
              if (thresholdCompare === 'above') {
                if (value >= criticalThreshold) {
                  label += ' (Critical)';
                } else if (value >= warningThreshold) {
                  label += ' (Warning)';
                } else {
                  label += ' (Normal)';
                }
              } else {
                if (value <= criticalThreshold) {
                  label += ' (Critical)';
                } else if (value <= warningThreshold) {
                  label += ' (Warning)';
                } else {
                  label += ' (Normal)';
                }
              }
            }
            
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: !!yAxisLabel,
          text: yAxisLabel,
          font: {
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      }
    },
    elements: {
      line: {
        borderWidth: 2
      },
      point: {
        borderWidth: 1,
        pointHitRadius: 10,
      }
    },
    interaction: {
      mode: 'index',
      intersect: false
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 h-80 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chart data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 h-80 transition-all duration-300 hover:shadow-xl">
      {chartData.labels.length === 0 || (chartData.labels.length === 5 && chartData.datasets[0].data.every(value => value === 0)) ? (
        <div className="h-full flex items-center justify-center text-center text-gray-500">
          <p>No data available. Please ensure your network interface is selected.</p>
        </div>
      ) : (
        <>
          <Line options={options} data={chartData} />
          {warningThreshold !== null && criticalThreshold !== null && (
            <div className="flex justify-end gap-4 mt-2 text-xs text-gray-500">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                <span>Normal</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-yellow-500 mr-1"></div>
                <span>Warning</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
                <span>Critical</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NetworkHistoryChart;
