/**
 * TypeScript declarations for Adobe PDF Embed API
 * 
 * Adobe PDF Embed API se carga vía script tag y no tiene tipos oficiales.
 * Este archivo proporciona las declaraciones de tipos necesarias.
 */

declare global {
  interface Window {
    AdobeDC?: {
      View: new (config: AdobeDCViewConfig) => AdobeDCView;
    };
  }
}

export interface AdobeDCViewConfig {
  clientId: string;
  divId: string;
}

export interface AdobeDCView {
  previewFile(
    fileConfig: AdobeDCFileConfig,
    viewerConfig?: AdobeDCViewerConfig
  ): Promise<void>;
  
  registerCallback(
    api: string,
    callback: (event: any) => void,
    options?: any
  ): void;
  
  getAPIs(): string[];
  
  getAnnotationManager(): AdobeDCAnnotationManager;
  
  downloadPDF(): void;
  
  printPDF(): void;
}

export interface AdobeDCFileConfig {
  content: {
    location: {
      url: string;
    };
  };
  metaData: {
    fileName: string;
  };
}

export interface AdobeDCViewerConfig {
  showAnnotationTools?: boolean;
  showLeftHandPanel?: boolean;
  showDownloadPDF?: boolean;
  showPrintPDF?: boolean;
  enableFormFilling?: boolean;
  showPageControls?: boolean;
  defaultViewMode?: 'FIT_PAGE' | 'FIT_WIDTH' | 'TWO_COLUMN' | 'ONE_COLUMN';
  embedMode?: 'FULL_WINDOW' | 'SIZED_CONTAINER' | 'IN_LINE';
  showZoomControls?: boolean;
  enableLinearization?: boolean;
}

export interface AdobeDCAnnotationManager {
  addEventListener(
    event: string,
    callback: (event: any) => void
  ): void;
  
  getAnnotations(): Promise<any[]>;
  
  addAnnotation(annotation: any): Promise<void>;
  
  updateAnnotation(annotation: any): Promise<void>;
  
  deleteAnnotation(annotationId: string): Promise<void>;
}

export {};

