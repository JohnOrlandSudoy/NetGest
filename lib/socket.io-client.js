'use client';

/**
 * Mock implementation of socket.io-client
 */

class MockSocket {
  constructor(url, options = {}) {
    this.url = url;
    this.options = options;
    this.connected = false;
    this.id = `mock-socket-${Math.random().toString(36).substring(2, 9)}`;
    this.listeners = new Map();
    
    // Auto connect if not disabled
    if (options.autoConnect !== false) {
      this.connect();
    }
    
    console.log(`Mock socket created for ${url}`);
  }
  
  connect() {
    if (this.connected) return;
    
    // Simulate connection delay
    setTimeout(() => {
      this.connected = true;
      this.emit('connect');
    }, 100);
    
    return this;
  }
  
  disconnect() {
    if (!this.connected) return;
    
    this.connected = false;
    this.emit('disconnect', { reason: 'io client disconnect' });
    
    return this;
  }
  
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    this.listeners.get(event).push(callback);
    
    return this;
  }
  
  once(event, callback) {
    const onceCallback = (...args) => {
      this.off(event, onceCallback);
      callback(...args);
    };
    
    return this.on(event, onceCallback);
  }
  
  off(event, callback) {
    if (!this.listeners.has(event)) return this;
    
    if (!callback) {
      this.listeners.delete(event);
    } else {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
      
      if (callbacks.length === 0) {
        this.listeners.delete(event);
      }
    }
    
    return this;
  }
  
  emit(event, ...args) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      
      callbacks.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in socket event handler for ${event}:`, error);
        }
      });
    }
    
    return this;
  }
}

// Export io function
export function io(url, options = {}) {
  return new MockSocket(url, options);
}

// Default export
export default { io };