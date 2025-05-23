import React, { useContext, useMemo, useRef, useEffect } from 'react';
import { NetworkMetricsContext } from '@/context/NetworkMetricsProvider';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { formatBytes, formatDate } from '@/utils/formatters';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const RealtimeInterfaceMonitor = () => {
  const { 
    selectedInterface,
    realtimeInterfaceData,
    loadingRealtimeData
  } = useContext(NetworkMetricsContext);
  
  // Format data for charts
  const formattedData = useMemo(() => {
    if (!realtimeInterfaceData || realtimeInterfaceData.length === 0) {
      return [];
    }
    
    return realtimeInterfaceData.map(item => ({
      time: new Date(item.timestamp).toISOString(),
      rxBytes: item.rx_bytes,
      txBytes: item.tx_bytes,
      rxPackets: item.rx_packets,
      txPackets: item.tx_packets,
      formattedTime: formatDate(new Date(item.timestamp))
    }));
  }, [realtimeInterfaceData]);
  
  // Calculate traffic rates between data points
  const trafficRates = useMemo(() => {
    if (formattedData.length < 2) {
      return [];
    }
    
    const rates = [];
    
    for (let i = 1; i < formattedData.length; i++) {
      const current = formattedData[i];
      const previous = formattedData[i-1];
      
      const timeDiff = new Date(current.time) - new Date(previous.time);
      const secondsDiff = timeDiff / 1000;
      
      if (secondsDiff <= 0) continue;
      
      rates.push({
        time: current.time,
        formattedTime: current.formattedTime,
        rxRate: (current.rxBytes - previous.rxBytes) / secondsDiff,
        txRate: (current.txBytes - previous.txBytes) / secondsDiff,
        rxPacketRate: (current.rxPackets - previous.rxPackets) / secondsDiff,
        txPacketRate: (current.txPackets - previous.txPackets) / secondsDiff
      });
    }
    
    return rates;
  }, [formattedData]);
  
  // Prepare chart data for traffic rates
  const trafficRateChartData = useMemo(() => {
    return {
      labels: trafficRates.map(item => item.formattedTime),
      datasets: [
        {
          label: 'Download',
          data: trafficRates.map(item => item.rxRate),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          tension: 0.1,
          pointRadius: 2,
          pointHoverRadius: 5
        },
        {
          label: 'Upload',
          data: trafficRates.map(item => item.txRate),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.5)',
          tension: 0.1,
          pointRadius: 2,
          pointHoverRadius: 5
        }
      ]
    };
  }, [trafficRates]);
  
  // Prepare chart data for packet rates
  const packetRateChartData = useMemo(() => {
    return {
      labels: trafficRates.map(item => item.formattedTime),
      datasets: [
        {
          label: 'Rx Packets',
          data: trafficRates.map(item => item.rxPacketRate),
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.5)',
          tension: 0.1,
          pointRadius: 2,
          pointHoverRadius: 5
        },
        {
          label: 'Tx Packets',
          data: trafficRates.map(item => item.txPacketRate),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.5)',
          tension: 0.1,
          pointRadius: 2,
          pointHoverRadius: 5
        }
      ]
    };
  }, [trafficRates]);
  
  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
              if (label.includes('Download') || label.includes('Upload')) {
                label += formatBytes(context.parsed.y) + '/s';
              } else {
                label += Math.round(context.parsed.y) + ' packets/s';
              }
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 10
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            if (this.chart.config._config.data.datasets[0].label.includes('Download') || 
                this.chart.config._config.data.datasets[0].label.includes('Upload')) {
              return formatBytes(value, 0) + '/s';
            }
            return value + '/s';
          }
        }
      }
    }
  };
  
  if (loadingRealtimeData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-64 bg-gray-100 rounded"></div>
      </div>
    );
  }
  
  if (!realtimeInterfaceData || realtimeInterfaceData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <h3 className="text-lg font-medium mb-4 text-gray-800">
          Real-time Interface Traffic
        </h3>
        <div className="text-center py-8 text-gray-500">
          No real-time data available for {selectedInterface}
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <h3 className="text-lg font-medium mb-4 text-gray-800">
        Real-time Interface Traffic
      </h3>
      
      <div className="mb-6">
        <h4 className="text-md font-medium mb-2 text-gray-700">Traffic Rate</h4>
        <div className="h-64">
          <Line data={trafficRateChartData} options={chartOptions} />
        </div>
      </div>
      
      <div>
        <h4 className="text-md font-medium mb-2 text-gray-700">Packet Rate</h4>
        <div className="h-64">
          <Line data={packetRateChartData} options={chartOptions} />
        </div>
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="bg-gray-50 p-3 rounded-md">
          <h5 className="text-sm font-medium text-gray-700 mb-1">Latest RX</h5>
          <p className="text-lg font-semibold text-blue-600">
            {formatBytes(realtimeInterfaceData[realtimeInterfaceData.length - 1]?.rx_bytes || 0)}
          </p>
        </div>
        <div className="bg-gray-50 p-3 rounded-md">
          <h5 className="text-sm font-medium text-gray-700 mb-1">Latest TX</h5>
          <p className="text-lg font-semibold text-green-600">
            {formatBytes(realtimeInterfaceData[realtimeInterfaceData.length - 1]?.tx_bytes || 0)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RealtimeInterfaceMonitor;
