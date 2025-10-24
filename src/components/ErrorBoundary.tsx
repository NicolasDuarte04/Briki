'use client';

import React, { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

// Implementación funcional simple que no causa problemas de renderizado
function ChunkLoadErrorBoundary({ children }: Props) {
  return <>{children}</>;
}

export default ChunkLoadErrorBoundary;
