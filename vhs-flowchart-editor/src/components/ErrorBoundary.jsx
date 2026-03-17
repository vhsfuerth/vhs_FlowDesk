import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center max-w-md mx-auto p-8">
            <AlertTriangle className="w-16 h-16 text-[#e1000f] mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-800 mb-2">
              Ein unerwarteter Fehler ist aufgetreten
            </h1>
            <p className="text-sm text-gray-600 mb-6">
              Die Anwendung konnte nicht korrekt geladen werden.
            </p>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center px-5 py-2 bg-[#00285a] text-white rounded-md font-bold hover:bg-opacity-90 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Seite neu laden
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
