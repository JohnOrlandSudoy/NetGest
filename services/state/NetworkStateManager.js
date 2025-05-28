// NetworkStateManager.js
class NetworkStateManager {
  static STORAGE_KEYS = {
    MONITORING: 'network_monitoring_state',
    TSHARK: 'network_tshark_state',
    REALTIME: 'network_realtime_state',
    METRICS: 'network_metrics_bom',
    TRAFFIC: 'network_traffic_bom',
    HISTORY: 'network_history_bom',
    INTERFACE: 'network_selected_interface'
  };

  static BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);

  // Monitoring State Management
  static getMonitoringState() {
    if (typeof window === 'undefined') return false;
    const state = localStorage.getItem(this.STORAGE_KEYS.MONITORING);
    return state ? JSON.parse(state) : {
      isMonitoring: false,
      lastUpdate: null,
      metrics: null
    };
  }

  static setMonitoringState(state) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEYS.MONITORING, JSON.stringify({
      ...state,
      lastUpdate: new Date().toISOString()
    }));
  }

  // TShark State Management
  static getTSharkState() {
    if (typeof window === 'undefined') return false;
    const state = localStorage.getItem(this.STORAGE_KEYS.TSHARK);
    return state ? JSON.parse(state) : {
      isRunning: false,
      lastUpdate: null,
      results: null
    };
  }

  static setTSharkState(state) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEYS.TSHARK, JSON.stringify({
      ...state,
      lastUpdate: new Date().toISOString()
    }));
  }

  // Real-time Monitoring State Management
  static getRealtimeState() {
    if (typeof window === 'undefined') return false;
    const state = localStorage.getItem(this.STORAGE_KEYS.REALTIME);
    return state ? JSON.parse(state) : {
      isMonitoring: false,
      lastUpdate: null,
      metrics: null
    };
  }

  static setRealtimeState(state) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEYS.REALTIME, JSON.stringify({
      ...state,
      lastUpdate: new Date().toISOString()
    }));
  }

  // Interface State Management
  static getSelectedInterface() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.STORAGE_KEYS.INTERFACE) || 
           '\\Device\\NPF_{E8BF1646-750F-4476-9B15-3007F1F6711F}';
  }

  static setSelectedInterface(interfaceId) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEYS.INTERFACE, interfaceId);
  }

  // Metrics Storage with BOM
  static saveMetricsWithBOM(metrics) {
    if (typeof window === 'undefined') return;
    const data = JSON.stringify(metrics);
    const blob = new Blob([this.BOM, data], { type: 'application/json' });
    localStorage.setItem(this.STORAGE_KEYS.METRICS, blob);
  }

  static getMetricsWithBOM() {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(this.STORAGE_KEYS.METRICS);
    if (!data) return null;
    try {
      const cleanData = data.replace(/^\uFEFF/, '');
      return JSON.parse(cleanData);
    } catch (error) {
      console.error('Error parsing metrics data:', error);
      return null;
    }
  }

  // Traffic Data Storage with BOM
  static saveTrafficWithBOM(trafficData) {
    if (typeof window === 'undefined') return;
    const data = JSON.stringify(trafficData);
    const blob = new Blob([this.BOM, data], { type: 'application/json' });
    localStorage.setItem(this.STORAGE_KEYS.TRAFFIC, blob);
  }

  static getTrafficWithBOM() {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(this.STORAGE_KEYS.TRAFFIC);
    if (!data) return null;
    try {
      const cleanData = data.replace(/^\uFEFF/, '');
      return JSON.parse(cleanData);
    } catch (error) {
      console.error('Error parsing traffic data:', error);
      return null;
    }
  }

  // History Storage with BOM
  static saveHistoryWithBOM(history) {
    if (typeof window === 'undefined') return;
    const data = JSON.stringify(history);
    const blob = new Blob([this.BOM, data], { type: 'application/json' });
    localStorage.setItem(this.STORAGE_KEYS.HISTORY, blob);
  }

  static getHistoryWithBOM() {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(this.STORAGE_KEYS.HISTORY);
    if (!data) return [];
    try {
      const cleanData = data.replace(/^\uFEFF/, '');
      return JSON.parse(cleanData);
    } catch (error) {
      console.error('Error parsing history data:', error);
      return [];
    }
  }

  // Add to History
  static addToHistory(metrics, trafficData) {
    if (typeof window === 'undefined') return;
    const history = this.getHistoryWithBOM();
    
    // Add new metrics to history
    const newEntry = {
      timestamp: new Date().toISOString(),
      metrics: {
        ...metrics,
        trafficData
      }
    };

    history.push(newEntry);

    // Keep only last 24 hours of data
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const filteredHistory = history.filter(
      item => new Date(item.timestamp) > oneDayAgo
    );

    this.saveHistoryWithBOM(filteredHistory);
    return filteredHistory;
  }

  // Clear all data
  static clearAllData() {
    if (typeof window === 'undefined') return;
    Object.values(this.STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  // Export all data
  static exportAllData() {
    if (typeof window === 'undefined') return null;
    const exportData = {
      monitoring: this.getMonitoringState(),
      tshark: this.getTSharkState(),
      realtime: this.getRealtimeState(),
      metrics: this.getMetricsWithBOM(),
      traffic: this.getTrafficWithBOM(),
      history: this.getHistoryWithBOM(),
      interface: this.getSelectedInterface(),
      exportDate: new Date().toISOString()
    };

    return new Blob([this.BOM, JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
  }

  // Import data
  static importData(data) {
    if (typeof window === 'undefined') return false;
    try {
      const cleanData = data.replace(/^\uFEFF/, '');
      const parsedData = JSON.parse(cleanData);

      if (parsedData.monitoring) this.setMonitoringState(parsedData.monitoring);
      if (parsedData.tshark) this.setTSharkState(parsedData.tshark);
      if (parsedData.realtime) this.setRealtimeState(parsedData.realtime);
      if (parsedData.metrics) this.saveMetricsWithBOM(parsedData.metrics);
      if (parsedData.traffic) this.saveTrafficWithBOM(parsedData.traffic);
      if (parsedData.history) this.saveHistoryWithBOM(parsedData.history);
      if (parsedData.interface) this.setSelectedInterface(parsedData.interface);

      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
}

export default NetworkStateManager; 