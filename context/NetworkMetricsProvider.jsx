'use client';

import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { subscribeToNetworkMetrics, getCurrentNetworkMetrics, cleanup } from '@/services/networkMetricsService';

export const NetworkMetricsContext = createContext({});

export const NetworkMetricsProvider = ({ children }) => {
  // Network interfaces state
  const [selectedInterface, setSelectedInterface] = useState('');
  const [interfaces, setInterfaces] = useState([]);
  const [avgPacketLoss, setAvgPacketLoss] = useState(0);
  const [avgLatency, setAvgLatency] = useState(0);
  const [internetSpeed, setInternetSpeed] = useState({ download: 0, upload: 0 });
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [packetLossHistory, setPacketLossHistory] = useState([]);
  const [latencyHistory, setLatencyHistory] = useState([]);
  const [speedHistory, setSpeedHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState(null);

  // Generate mock interfaces
  const generateMockInterfaces = useCallback(() => {
    return [
      { name: 'eth0', description: 'Ethernet Adapter', type:
