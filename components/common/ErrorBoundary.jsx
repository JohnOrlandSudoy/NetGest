'use client';

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can log the error to an error reporting service
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="p-4 border border-red-200 rounded-md bg-red-50">
          <h3 className="text-lg font-medium text-red-800 mb-2">
            {this.props.fallbackTitle || "Something went wrong"}
          </h3>
          <p className="text-sm text-red-600">
            {this.props.fallbackMessage || "An error occurred while rendering this component."}
          </p>
          {this.props.showResetButton && (
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-3 px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-colors"
            >
              Try Again
            </button>
          )}
          {this.props.children && !this.props.hideChildrenOnError && (
            <div className="mt-4 opacity-50">
              {this.props.children}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

