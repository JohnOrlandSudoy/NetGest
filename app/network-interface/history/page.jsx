"use client";

import React, { useState, useEffect, useContext } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Authenticated from "@/components/layouts/Authenticated";
import { NetworkMetricsContext } from '@/context/NetworkMetricsProvider';
import { format, parseISO, subDays } from 'date-fns';
import { FaNetworkWired, FaHistory, FaChartLine, FaArrowLeft, FaDownload, FaFilter } from 'react-icons/fa';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

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

const NetworkInterfaceHistory = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { interfaces, selectedInterface, setSelectedInterface } = useContext(NetworkMetricsContext);
  
  const [interfaceHistory, setInterfaceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(7);
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: []
  });
  
  // Get interface from URL or context
  const interfaceParam = searchParams.get('interface');
  const currentInterface = interfaceParam || selectedInterface || (interfaces.length > 0 ? interfaces[0] : 'eth0');
  
  // Fetch interface history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/network/interfaces/history?interface=${encodeURIComponent(currentInterface)}&days=${days}`);
        
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.history && data.history.length > 0) {
          setInterfaceHistory(data.history);
          
          // Prepare chart data
          prepareChartData(data.history);
        } else {
          setInterfaceHistory([]);
          setError('No history data available');
        }
      } catch (err) {
        console.error('Error fetching interface history:', err);
        setError('Failed to load interface history');
      } finally {
        setLoading(false);
      }
    };
    
    if (currentInterface) {
      fetchHistory();
      
      // Update selected interface in context
      if (setSelectedInterface && currentInterface !== selectedInterface) {
        setSelectedInterface(currentInterface);
      }
    }
  }, [currentInterface, days, setSelectedInterface, selectedInterface]);
  
  // Prepare chart data from history
  const prepareChartData = (history) => {
    // Group by day and calculate daily totals
    const dailyData = history.reduce((acc, item) => {
      const day = format(parseISO(item.timestamp), 'yyyy-MM-dd');
      
      if (!acc[day]) {
        acc[day] = {
          day,
          txBytes: 0,
          rxBytes: 0,
          txPackets: 0,
          rxPackets: 0,
          count: 0
        };
      }
      
      acc[day].txBytes += item.tx_bytes || 0;
      acc[day].rxBytes += item.rx_bytes || 0;
      acc[day].txPackets += item.tx_packets || 0;
      acc[day].rxPackets += item.rx_packets || 0;
      acc[day].count++;
      
      return acc;
    }, {});
    
    // Convert to arrays and sort by date
    const sortedData = Object.values(dailyData).sort((a, b) => a.day.localeCompare(b.day));
    
    // Prepare chart data
    const labels = sortedData.map(item => item.day);
    
    const datasets = [
      {
        label: 'Transmitted (GB)',
        data: sortedData.map(item => (item.txBytes / (1024 * 1024 * 1024)).toFixed(2)),
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0.4
      },
      {
        label: 'Received (GB)',
        data: sortedData.map(item => (item.rxBytes / (1024 * 1024 * 1024)).toFixed(2)),
        borderColor: '