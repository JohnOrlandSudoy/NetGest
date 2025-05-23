'use client';

/**
 * Mock implementation of Laravel Echo with socket.io
 */
class MockEcho {
  constructor() {
    this.channels = new Map();
    console.log('Mock Echo initialized');
  }
  
  channel(name) {
    if (!this.channels.has(name)) {
      this.channels.set(name, new MockChannel(name));
    }
    
    return this.channels.get(name);
  }
  
  private(name) {
    return this.channel(`private-${name}`);
  }
  
  join(name) {
    return this.channel(name);
  }
  
  leave(name) {
    this.channels.delete(name);
  }
  
  disconnect() {
    this.channels.clear();
  }
}

class MockChannel {
  constructor(name) {
    this.name = name;
    this.listeners = new Map();
    console.log(`Mock channel created: ${name}`);
  }
  
  listen(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    this.listeners.get(event).push(callback);
    console.log(`Listener added for ${event} on channel ${this.name}`);
    
    return this;
  }
  
  stopListening(event) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
    
    return this;
  }
  
  whisper(event, data) {
    this.trigger(event, data);
    return this;
  }
  
  trigger(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in listener for ${event}:`, error);
        }
      });
    }
    
    return this;
  }
}

// Create a singleton instance
const echo = typeof window !== 'undefined' ? new MockEcho() : null;

// You can delete this file after updating all imports
