import React, { createContext, useState, useEffect, useCallback } from 'react';
import NetworkStateManager from '@/services/state/NetworkStateManager';

export const NetworkMetricsContext = createContext();

export const NetworkMetricsProvider = ({ children }) => {
  const [metrics, setMetrics] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [selectedInterface, setSelectedInterface] = useState(null);
  const [interfaces, setInterfaces] = useState([]);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState({
    metricsHistory: [],
    lastUpdate: null
  });

  // Load initial data from NetworkStateManager
  useEffect(() => {
    const loadStoredData = () => {
      const storedMetrics = NetworkStateManager.getMetricsWithBOM();
      const storedHistory = NetworkStateManager.getHistoryWithBOM();

      if (storedMetrics) {
        setMetrics(storedMetrics);
      }
      if (storedHistory && storedHistory.length > 0) {
        setHistory(prev => ({
          ...prev,
          metricsHistory: storedHistory,
          lastUpdate: new Date().toISOString()
        }));
      }
    };

    loadStoredData();
  }, []);

  // Save history changes to NetworkStateManager
  useEffect(() => {
    if (history.metricsHistory.length > 0) {
      NetworkStateManager.saveHistoryWithBOM(history.metricsHistory);
    }
  }, [history.metricsHistory]);

  // Add test data function
  const addTestData = useCallback(() => {
    const testData = Array.from({ length: 14 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        date: date.toISOString().split('T')[0],
        interface: selectedInterface || 'eth0',
        metrics: {
          avgLatency: Math.round(20 + Math.random() * 30),
          avgPacketLoss: parseFloat((Math.random() * 2).toFixed(2)),
          downloadSpeed: Math.round(50 + Math.random() * 50),
          uploadSpeed: Math.round(10 + Math.random() * 20)
        },
        timestamp: date.toISOString()
      };
    });

    setHistory(prev => ({
      metricsHistory: [...testData, ...prev.metricsHistory],
      lastUpdate: new Date().toISOString()
    }));

    // Save to NetworkStateManager
    NetworkStateManager.saveHistoryWithBOM([...testData, ...history.metricsHistory]);
  }, [selectedInterface, history.metricsHistory]);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Start monitoring function
  const startMonitoring = useCallback(async () => {
    try {
      setIsMonitoring(true);
      setError(null);
    } catch (err) {
      setError({
        context: 'Start Monitoring',
        message: err.message,
        timestamp: new Date().toISOString()
      });
    }
  }, []);

  // Stop monitoring function
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  // Fetch interfaces function
  const fetchInterfaces = useCallback(async () => {
    try {
      const response = await fetch('/api/network/interfaces');
      if (!response.ok) throw new Error('Failed to fetch interfaces');
      const data = await response.json();
      setInterfaces(data.interfaces || []);
    } catch (err) {
      setError({
        context: 'Fetch Interfaces',
        message: err.message,
        timestamp: new Date().toISOString()
      });
    }
  }, []);

  // Refresh metrics function
  const refreshMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/network/metrics');
      if (!response.ok) throw new Error('Failed to fetch metrics');
      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setError({
        context: 'Refresh Metrics',
        message: err.message,
        timestamp: new Date().toISOString()
      });
    }
  }, []);

  return (
    <NetworkMetricsContext.Provider value={{
      metrics,
      isMonitoring,
      selectedInterface,
      setSelectedInterface,
      interfaces,
      error,
      clearError,
      startMonitoring,
      stopMonitoring,
      fetchInterfaces,
      refreshMetrics,
      history,
      addTestData
    }}>
      {children}
    </NetworkMetricsContext.Provider>
  );
};

export function useNetworkMetrics() {
  const context = useContext(NetworkMetricsContext);
  if (!context) {
    throw new Error('useNetworkMetrics must be used within a NetworkMetricsProvider');
  }
  return context;
} 