'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ChunkLoadErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Detectar específicamente ChunkLoadError
    if (error.message.includes('Loading chunk') || 
        error.message.includes('ChunkLoadError')) {
      return { hasError: true, error };
    }
    return { hasError: false };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ChunkLoadError detected:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8">
          <h2 className="text-2xl font-bold mb-4">Error de Carga</h2>
          <p className="text-muted-foreground mb-6">
            Hubo un problema al cargar esta página. Esto suele resolverse recargando.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Recargar Página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
