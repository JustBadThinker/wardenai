import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[RootErrorBoundary] Caught fatal render error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', background: '#0a0c14', color: '#f87171', fontFamily: 'monospace', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ maxWidth: '640px', width: '100%', background: '#121520', border: '1px solid #3b2038', borderRadius: '16px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#c084fc', marginBottom: '8px' }}>Application Encountered an Error</h2>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>Warden AI safely caught a render exception:</p>
            <div style={{ background: '#080a10', padding: '12px', borderRadius: '8px', border: '1px solid #222736', color: '#fca5a5', fontSize: '12px', marginBottom: '16px', wordBreak: 'break-word' }}>
              <strong>{this.state.error?.name}:</strong> {this.state.error?.message}
            </div>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '11px', color: '#64748b', maxHeight: '180px', overflowY: 'auto' }}>
              {this.state.error?.stack}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{ marginTop: '20px', padding: '10px 20px', background: 'linear-gradient(to right, #9333ea, #6366f1)', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
            >
              Refresh Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);
