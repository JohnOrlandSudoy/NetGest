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
      'Error in fetchPacketCount'
    ];
    
    // Override console.error to completely suppress all errors
    console.error = function() {
      // Don't output anything to the console
      // This completely silences all errors
      return;
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
      // Prevent the error from being shown
      return true;
    };
    
    // Intercept unhandled promise rejections
    const originalOnUnhandledRejection = window.onunhandledrejection;
    window.onunhandledrejection = function(event) {
      // Prevent the rejection from being shown
      event.preventDefault();
      return true;
    };
    
    // Also try to intercept React's error boundary
    if (typeof window !== 'undefined' && window.React) {
      const originalConsoleError = console.error;
      console.error = function(...args) {
        // Check if this is a React error boundary error
        if (
          args.length > 0 &&
          typeof args[0] === 'string' &&
          args[0].includes('React will try to recreate this component tree')
        ) {
          // Suppress React error boundary errors
          return;
        }
        
        // Otherwise, call the original
        originalConsoleError.apply(console, args);
      };
    }
    
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
