'use client';

/**
 * Socket.io Client Wrapper
 * This provides a socket.io-like interface but uses polling under the hood
 */

class SocketIOClientWrapper {
  constructor(url, options = {}) {
    this.url = url || '/api/socket';
    this.options = options;
    this.connected = false;
    this.eventHandlers = new Map();
    this.pollingInterval = null;
    this.lastPollTime = 0;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectDelay = options.reconnectDelay || 3000;
    this.autoConnect = options.autoConnect !== false;
    
    if (this.autoConnect) {
      this.connect();
    }
  }
  
  /**
   * Connect to the server (start polling)
   */
  connect() {
    if (this.connected || this.pollingInterval) {
      return;
    }
    
    this.startPolling();
    this.connected = true;
    this.emit('connect');
  }
  
  /**
   * Disconnect from the server (stop polling)
   */
  disconnect() {
    this.stopPolling();
    this.connected = false;
    this.emit('disconnect', { reason: 'client namespace disconnect' });
  }
  
  /**
   * Register an event handler
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
   * @returns {this} - For chaining
   */
  on(event, callback) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    
    this.eventHandlers.get(event).push(callback);
    return this;
  }
  
  /**
   * Remove an event handler
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
   * @returns {this} - For chaining
   */
  off(event, callback) {
    if (!this.eventHandlers.has(event)) {
      return this;
    }
    
    if (!callback) {
      this.eventHandlers.delete(event);
      return this;
    }
    
    const handlers = this.eventHandlers.get(event);
    const index = handlers.indexOf(callback);
    
    if (index !== -1) {
      handlers.splice(index, 1);
    }
    
    if (handlers.length === 0) {
      this.eventHandlers.delete(event);
    }
    
    return this;
  }
  
  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {...any} args - Event arguments
   */
  emit(event, ...args) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in socket event handler for ${event}:`, error);
        }
      });
    }
    
    return this;
  }
  
  /**
   * Start polling for updates
   */
  startPolling() {
    if (this.pollingInterval) {
      return;
    }
    
    // Poll immediately for initial data
    this.poll();
    
    // Set up interval for regular polling
    this.pollingInterval = setInterval(() => {
      this.poll();
    }, 2000);
  }
  
  /**
   * Stop polling for updates
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
  
  /**
   * Poll for updates
   */
  async poll() {
    try {
      // Add interface parameter if specified in options
      const interfaceParam = this.options.interface ? `&interface=${this.options.interface}` : '';
      
      // Add cache buster and last poll time
      const url = `${this.url}?lastPoll=${this.lastPollTime}${interfaceParam}&t=${Date.now()}`;
      
      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      // If status is 304, no new data
      if (response.status === 304) {
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        this.lastPollTime = Date.now();
        
        // Emit network metrics event
        this.emit('network_metrics', data);
        
        // Reset reconnect attempts on successful poll
        this.reconnectAttempts = 0;
      } else {
        throw new Error(`Server returned ${response.status}`);
      }
    } catch (error) {
      console.error('Socket polling error:', error);
      
      // Emit error event
      this.emit('error', { message: 'xhr poll error' });
      
      // Handle reconnection
      this.handleReconnect();
    }
  }
  
  /**
   * Handle reconnection logic
   */
  handleReconnect() {
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      // Stop current polling
      this.stopPolling();
      
      // Emit reconnecting event
      this.emit('reconnecting', this.reconnectAttempts);
      
      // Try to reconnect after delay
      setTimeout(() => {
        this.startPolling();
      }, this.reconnectDelay);
    } else {
      // Max reconnect attempts reached
      this.stopPolling();
      this.connected = false;
      
      // Emit disconnect event
      this.emit('disconnect', { reason: 'transport error' });
    }
  }
}

/**
 * Create a socket.io client instance
 * @param {string} url - Socket URL
 * @param {Object} options - Socket options
 * @returns {SocketIOClientWrapper} Socket client
 */
export const io = (url, options = {}) => {
  return new SocketIOClientWrapper(url, options);
};

export default { io };