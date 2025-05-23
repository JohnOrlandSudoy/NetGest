import React, { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { NetworkMetricsContext } from '@/context/NetworkMetricsProvider';
import { format, subDays, parseISO } from 'date-fns';
import { FaCalendarAlt, FaDownload, FaFilter, FaExclamationTriangle } from 'react-icons/fa';

// Simple date range component
const SimpleDateRangePicker = ({ startDate, endDate, onChange, onClose }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Select Date Range</h3>
        <button onClick={onClose} className="text-gray-500">×</button>
      </div>
      
      <div className="grid grid-cols-1 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input 
            type="date" 
            value={format(startDate, 'yyyy-MM-dd')}
            onChange={(e) => onChange({ 
              startDate: new Date(e.target.value), 
              endDate 
            })}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input 
            type="date"
            value={format(endDate, 'yyyy-MM-dd')}
            onChange={(e) => onChange({ 
              startDate, 
              endDate: new Date(e.target.value) 
            })}
            className="w-full p-2 border rounded"
          />
        </div>
      </div>
      
      <div className="flex justify-end">
        <button 
          onClick={onClose}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Apply
        </button>
      </div>
    </div>
  );
};

// Use the simple date picker directly
const DateRangePicker = SimpleDateRangePicker;

const DailySummaryList = () => {
  const router = useRouter();
  const { selectedInterface } = useContext(NetworkMetricsContext);
  const [dailySummaries, setDailySummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: subDays(new Date(), 14),
    endDate: new Date()
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dataSource, setDataSource] = useState('loading');
  const [interfaceFilter, setInterfaceFilter] = useState(selectedInterface || 'all');
  const [downloadingDates, setDownloadingDates] = useState({});
  
  // Generate mock daily summaries for fallback
  const generateMockDailySummaries = (days, interfaceFilter) => {
    const summaries = [];
    const now = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      summaries.push({
        date: format(date, 'yyyy-MM-dd'),
        interface: interfaceFilter === 'all' ? (i % 2 === 0 ? 'eth0' : 'wlan0') : interfaceFilter,
        metrics: {
          avgLatency: 20 + Math.random() * 30,
          avgPacketLoss: 0.5 + Math.random() * 1.5,
          downloadSpeed: 50 + Math.random() * 50,
          uploadSpeed: 10 + Math.random() * 20,
          totalPackets: Math.floor(10000 + Math.random() * 50000),
          errorRate: Math.random() * 2
        }
      });
    }
    
    return summaries;
  };
  
  // Process API data into daily summaries format
  const convertApiDataToDailySummaries = (apiData, interfaceFilter) => {
    if (!apiData || !apiData.history) return [];
    
    // Group by date
    const groupedByDate = {};
    
    apiData.history.forEach(item => {
      const date = format(parseISO(item.timestamp), 'yyyy-MM-dd');
      
      if (!groupedByDate[date]) {
        groupedByDate[date] = {
          date,
          interface: item.interface || interfaceFilter,
          metrics: {
            avgLatency: 0,
            avgPacketLoss: 0,
            downloadSpeed: 0,
            uploadSpeed: 0,
            totalPackets: 0,
            errorRate: 0,
            count: 0
          }
        };
      }
      
      groupedByDate[date].metrics.avgLatency += item.latency || 0;
      groupedByDate[date].metrics.avgPacketLoss += item.packet_loss || 0;
      groupedByDate[date].metrics.downloadSpeed += item.download_speed || 0;
      groupedByDate[date].metrics.uploadSpeed += item.upload_speed || 0;
      groupedByDate[date].metrics.totalPackets += item.total_packets || 0;
      groupedByDate[date].metrics.errorRate += item.error_rate || 0;
      groupedByDate[date].metrics.count++;
    });
    
    // Calculate averages
    return Object.values(groupedByDate).map(summary => {
      const count = summary.metrics.count || 1;
      
      return {
        ...summary,
        metrics: {
          ...summary.metrics,
          avgLatency: summary.metrics.avgLatency / count,
          avgPacketLoss: summary.metrics.avgPacketLoss / count,
          downloadSpeed: summary.metrics.downloadSpeed / count,
          uploadSpeed: summary.metrics.uploadSpeed / count,
          errorRate: summary.metrics.errorRate / count
        }
      };
    }).sort((a, b) => b.date.localeCompare(a.date)); // Sort by date (newest first)
  };
  
  // Process Supabase data into daily summaries
  const processDailySummaries = (data, interfaceFilter) => {
    // Group by date
    const groupedByDate = {};
    
    data.forEach(item => {
      // Skip if interface filter is applied and doesn't match
      if (interfaceFilter !== 'all' && item.interface_name !== interfaceFilter) {
        return;
      }
      
      const date = format(parseISO(item.timestamp), 'yyyy-MM-dd');
      
      if (!groupedByDate[date]) {
        groupedByDate[date] = {
          date,
          interface: item.interface_name,
          metrics: {
            avgLatency: 0,
            avgPacketLoss: 0,
            downloadSpeed: 0,
            uploadSpeed: 0,
            totalPackets: 0,
            errorRate: 0,
            count: 0
          }
        };
      }
      
      groupedByDate[date].metrics.avgLatency += item.latency || 0;
      groupedByDate[date].metrics.avgPacketLoss += item.packet_loss || 0;
      groupedByDate[date].metrics.downloadSpeed += item.download_speed || 0;
      groupedByDate[date].metrics.uploadSpeed += item.upload_speed || 0;
      groupedByDate[date].metrics.count++;
    });
    
    // Calculate averages
    return Object.values(groupedByDate).map(summary => {
      const count = summary.metrics.count || 1;
      
      return {
        ...summary,
        metrics: {
          ...summary.metrics,
          avgLatency: summary.metrics.avgLatency / count,
          avgPacketLoss: summary.metrics.avgPacketLoss / count,
          downloadSpeed: summary.metrics.downloadSpeed / count,
          uploadSpeed: summary.metrics.uploadSpeed / count
        }
      };
    }).sort((a, b) => b.date.localeCompare(a.date)); // Sort by date (newest first)
  };
  
  // Effect to fetch daily summaries for the list display
  useEffect(() => {
    const fetchSummaries = async () => {
      try {
        setLoading(true);
        
        // Generate mock data for now
        const mockSummaries = generateMockDailySummaries(14, interfaceFilter);
        setDailySummaries(mockSummaries);
        setDataSource('mock');
        
      } catch (err) {
        console.error("[HISTORY] Failed to fetch daily summaries:", err);
        setError("Failed to load data. Please try again later.");
        setDataSource('error');
        
        // Generate mock data as fallback
        const mockSummaries = generateMockDailySummaries(14, interfaceFilter);
        setDailySummaries(mockSummaries);
      } finally {
        setLoading(false);
      }
    };

    fetchSummaries();
  }, [dateRange, interfaceFilter]);

  // Handle date range change
  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange);
    setShowDatePicker(false);
  };

  // Handle interface filter change
  const handleInterfaceFilterChange = (e) => {
    setInterfaceFilter(e.target.value);
  };

  // Handle view details click
  const handleViewDetails = (date) => {
    router.push(`/network-data/details?date=${date}&interface=${interfaceFilter}`);
  };

  // Handle download data
  const handleDownload = async (date) => {
    try {
      setDownloadingDates(prev => ({ ...prev, [date]: true }));
      
      // Mock download for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create a mock CSV content
      const csvContent = `Date,Interface,Latency (ms),Packet Loss (%),Download Speed (Mbps),Upload Speed (Mbps)\n${date},${interfaceFilter},45.2,1.2,95.6,25.3`;
      
      // Create a blob and download it
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `network-data-${date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error("Error downloading data:", err);
    } finally {
      setDownloadingDates(prev => ({ ...prev, [date]: false }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 md:mb-0">Network Data History</h2>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Date Range Selector */}
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md flex items-center text-gray-700 hover:bg-gray-50"
            >
              <FaCalendarAlt className="mr-2 text-gray-500" />
              <span>
                {format(dateRange.startDate, 'MMM d, yyyy')} - {format(dateRange.endDate, 'MMM d, yyyy')}
              </span>
            </button>
            
            {showDatePicker && (
              <div className="absolute right-0 mt-2 z-10">
                <DateRangePicker
                  startDate={dateRange.startDate}
                  endDate={dateRange.endDate}
                  onChange={handleDateRangeChange}
                  onClose={() => setShowDatePicker(false)}
                />
              </div>
            )}
          </div>
          
          {/* Interface Filter */}
          <div className="relative">
            <div className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700">
              <FaFilter className="mr-2 text-gray-500" />
              <select
                value={interfaceFilter}
                onChange={handleInterfaceFilterChange}
                className="bg-transparent border-none focus:ring-0 w-full"
              >
                <option value="all">All Interfaces</option>
                <option value="eth0">eth0</option>
                <option value="wlan0">wlan0</option>
                <option value="lo">lo</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Data Source Indicator */}
      <div className="mb-4">
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">
          {dataSource === 'supabase' && 'Data from database'}
          {dataSource === 'api' && 'Data from system API'}
          {dataSource === 'mock' && 'Sample data (not connected to database)'}
          {dataSource === 'loading' && 'Loading data...'}
          {dataSource === 'error' && 'Error loading data'}
        </span>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 flex items-center">
          <FaExclamationTriangle className="mr-2" />
          {error}
        </div>
      )}
      
      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        /* Data List */
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Interface
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg. Latency
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Packet Loss
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Download Speed
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Upload Speed
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dailySummaries.map((summary, index) => (
                <tr key={`${summary.date}-${summary.interface}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {summary.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {summary.interface}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {summary.metrics.avgLatency.toFixed(1)} ms
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {summary.metrics.avgPacketLoss.toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {summary.metrics.downloadSpeed.toFixed(1)} Mbps
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {summary.metrics.uploadSpeed.toFixed(1)} Mbps
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleViewDetails(summary.date)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleDownload(summary.date)}
                      className="text-green-600 hover:text-green-900 inline-flex items-center"
                      disabled={downloadingDates[summary.date]}
                    >
                      {downloadingDates[summary.date] ? (
                        <>
                          <span className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-green-600 rounded-full"></span>
                          Downloading...
                        </>
                      ) : (
                        <>
                          <FaDownload className="mr-1" /> Download
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
              
              {dailySummaries.length === 0 && !loading && (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    No data available for the selected date range and interface.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DailySummaryList;

