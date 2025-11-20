'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

// Renombrar internamente para claridad
export class ChunkLoadErrorBoundaryInternal extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Actualizar el state para mostrar la UI de error
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log del error para debugging
    console.error('ChunkLoadErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Opcional: Intentar recargar una vez automáticamente
      // const attemptReload = () => {
      //   if (!sessionStorage.getItem('reloaded_after_error')) {
      //     sessionStorage.setItem('reloaded_after_error', 'true');
      //     window.location.reload();
      //   }
      // };
      // useEffect(() => { attemptReload(); }, []); // Necesitaría ser componente funcional o usar componentDidMount

      const errorMessage = this.state.error?.name === 'ChunkLoadError'
          ? "Hubo un problema cargando partes de la aplicación. Esto puede ocurrir durante actualizaciones."
          : "Ocurrió un error inesperado.";

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Error de Aplicación
            </h2>
            <p className="text-gray-600 mb-4">{errorMessage}</p>
            <p className="text-gray-600 mb-4">Por favor, intenta recargar la página.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Recargar Página
            </button>
          </div>
        </div>
      );
    }
    // Eliminar sessionStorage flag al cargar correctamente
    // if (sessionStorage.getItem('reloaded_after_error')) {
    //     sessionStorage.removeItem('reloaded_after_error');
    // }
    return <>{this.props.children}</>;
  }
}

// Exportación default clara
export default ChunkLoadErrorBoundaryInternal;
