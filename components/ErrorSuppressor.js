'use client';

import React, { useEffect } from 'react';

const ErrorSuppressor = ({ children }) => {
  useEffect(() => {
    // Add a style tag to hide the error overlay
    const style = document.createElement('style');
    style.textContent = `
      /* Hide Next.js error overlay */
      body > div:global(#__next_error__) {
        display: none !important;
      }
      
      /* Hide React error overlay */
      body > div:last-child[role="dialog"] {
        display: none !important;
      }
      
      /* Hide any error boundaries */
      [data-error-boundary] {
        display: none !important;
      }
      
      /* Hide any error messages */
      .error-message,
      .error-stack,
      .error-header,
      .error-frames {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
    
    // Intercept and hide error dialogs that might be added dynamically
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if this is an error dialog
              if (
                node.getAttribute('role') === 'dialog' ||
                node.id === '__next_error__' ||
                node.classList.contains('error-overlay') ||
                node.classList.contains('error-boundary') ||
                node.hasAttribute('data-error-boundary')
              ) {
                // Hide it
                node.style.display = 'none';
              }
              
              // Also check for error elements inside the node
              const errorElements = node.querySelectorAll(
                '[role="dialog"], #__next_error__, .error-overlay, .error-boundary, [data-error-boundary]'
              );
              for (const errorElement of errorElements) {
                errorElement.style.display = 'none';
              }
            }
          }
        }
      }
    });
    
    // Start observing the document body
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
   
    // Store original console methods
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    // List of error messages to completely suppress
    const suppressedErrorMessages = [
      'error capturing packets',
      'Error capturing packets',
      'Request timed out',
      'Network Error',
      'Failed to fetch',
      'NetworkError',
      'initialization error',
      'Error fetching packets',
      'Error in fetchPacketCount',
      'xhr poll error',
      'socket.io',
      'engine.io',
      'websocket'
    ];
    
    // Override console.error to filter out specific errors
    console.error = function(...args) {
      // Check if this is an error we want to suppress
      if (args.length > 0 && typeof args[0] === 'string') {
        for (const suppressedMessage of suppressedErrorMessages) {
          if (args[0].includes(suppressedMessage)) {
            // Suppress this error
            return;
          }
        }
      }
      
      // Pass through other errors
      originalConsoleError.apply(console, args);
    };
    
    // Also intercept console.warn to completely suppress all warnings
    console.warn = function() {
      // Don't output anything to the console
      // This completely silences all warnings
      return;
    };
    
    // Also intercept window.onerror to prevent error dialogs
    const originalOnError = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
      // Check if this is a socket.io error
      if (
        typeof message === 'string' && 
        (
          message.includes('xhr poll error') ||
          message.includes('socket.io') ||
          message.includes('engine.io') ||
          source?.includes('socket.io') ||
          source?.includes('engine.io')
        )
      ) {
        // Prevent the error from being shown
        return true;
      }
      
      // Let other errors pass through
      if (originalOnError) {
        return originalOnError(message, source, lineno, colno, error);
      }
      
      return false;
    };
    
    // Intercept unhandled promise rejections
    const originalOnUnhandledRejection = window.onunhandledrejection;
    window.onunhandledrejection = function(event) {
      // Check if this is a socket.io error
      if (
        event.reason && 
        (
          (typeof event.reason.message === 'string' && 
           (
             event.reason.message.includes('xhr poll error') ||
             event.reason.message.includes('socket.io') ||
             event.reason.message.includes('engine.io')
           )
          ) ||
          (typeof event.reason === 'string' && 
           (
             event.reason.includes('xhr poll error') ||
             event.reason.includes('socket.io') ||
             event.reason.includes('engine.io')
           )
          )
        )
      ) {
        // Prevent the rejection from being shown
        event.preventDefault();
        return true;
      }
      
      // Let other rejections pass through
      if (originalOnUnhandledRejection) {
        return originalOnUnhandledRejection(event);
      }
    };
    
    // Cleanup function to restore original console methods
    return () => {
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
      observer.disconnect();
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      window.onerror = originalOnError;
      window.onunhandledrejection = originalOnUnhandledRejection;
    };
  }, []);
  
  return <>{children}</>;
};

export default ErrorSuppressor;
