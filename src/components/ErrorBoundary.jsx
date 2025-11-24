import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import logger from '../utils/logger';

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in child component tree
 * Logs errors and displays fallback UI
 */

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console and remote logger
    console.error('🚨 React Error Boundary caught an error:', error, errorInfo);
    
    // Log to our custom logger (with remote reporting)
    logger.critical('React Component Error', error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: this.props.name || 'Unknown'
    });

    // Update state with error details
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Call optional onError callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    // Call optional onReset callback
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          errorInfo: this.state.errorInfo,
          resetError: this.handleReset
        });
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
          <div className="max-w-2xl w-full bg-[#1a1a1a] border border-red-500/30 rounded-2xl p-8 shadow-2xl">
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-red-500/10 rounded-full">
                <AlertTriangle className="w-12 h-12 text-red-500" />
              </div>
            </div>

            {/* Error Title */}
            <h1 className="text-3xl font-bold text-white text-center mb-3">
              Oops! Something Went Wrong
            </h1>

            {/* Error Description */}
            <p className="text-gray-400 text-center mb-6">
              {this.props.name || 'The application'} encountered an unexpected error. 
              Don't worry, your data is safe.
            </p>

            {/* Error Details (in development) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 p-4 bg-black/40 rounded-lg border border-red-900/50 max-h-60 overflow-auto">
                <div className="text-red-400 text-sm font-mono mb-2">
                  <strong>Error:</strong> {this.state.error.toString()}
                </div>
                {this.state.errorInfo && (
                  <div className="text-gray-500 text-xs font-mono whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>

              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-semibold rounded-lg transition-colors"
              >
                <Home className="w-4 h-4" />
                Go Home
              </button>
            </div>

            {/* Error Count Warning */}
            {this.state.errorCount > 1 && (
              <div className="mt-6 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400 text-sm text-center">
                  ⚠️ This error has occurred {this.state.errorCount} times. 
                  Consider reloading the page or contacting support.
                </p>
              </div>
            )}

            {/* Help Text */}
            <p className="text-gray-500 text-xs text-center mt-6">
              If this problem persists, please contact our support team with the error details above.
            </p>
          </div>
        </div>
      );
    }

    // Normal render - no error
    return this.props.children;
  }
}

export default ErrorBoundary;
