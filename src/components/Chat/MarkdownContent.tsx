"use client";

import React, { useMemo, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, AlertTriangle, Info, CheckCircle, Lightbulb } from "lucide-react";
import type { Components } from "react-markdown";

/**
 * Props para el componente MarkdownContent
 * 
 * @param content - Contenido en formato string (puede contener Markdown)
 * @param onPdfReferenceClick - Callback cuando el usuario hace clic en una referencia a PDF
 * @param className - Clases CSS adicionales
 */
export interface MarkdownContentProps {
  content: string;
  onPdfReferenceClick?: (field: string, page: number, analysisId?: string) => void;
  className?: string;
}

/**
 * Componente para renderizar contenido Markdown con extensiones personalizadas
 * 
 * Características:
 * - Renderizado de Markdown estándar (headings, listas, énfasis, código)
 * - Soporte para GitHub Flavored Markdown (tablas, strikethrough, autolinks)
 * - Sanitización automática para prevenir XSS
 * - Detección y renderizado de referencias a PDF como botones interactivos
 * - Conversión de blockquotes con emojis a Alerts visuales
 * - Estilos integrados con Tailwind CSS
 * 
 * Las referencias a PDF usan el formato Markdown estándar de links:
 * [Ver en PDF](#ref:FIELD_NAME:PAGE_NUMBER:ANALYSIS_ID)
 * 
 * @example
 * ```tsx
 * <MarkdownContent 
 *   content="**Negrita** y [Ver en PDF](#ref:premium:3:uuid)" 
 *   onPdfReferenceClick={(field, page, id) => console.log(field, page, id)}
 * />
 * ```
 */
export const MarkdownContent = React.memo<MarkdownContentProps>(function MarkdownContent({
  content,
  onPdfReferenceClick,
  className
}) {
  // Callback memoizado para manejar clics en referencias PDF
  const handlePdfClick = useCallback((field: string, page: number, analysisId?: string) => {
    if (onPdfReferenceClick) {
      onPdfReferenceClick(field, page, analysisId);
    }
  }, [onPdfReferenceClick]);

  // Componentes personalizados para react-markdown
  const components: Components = useMemo(() => ({
    // Tablas con estilos Tailwind
    table: ({ children, ...props }) => (
      <div className="my-4 overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full divide-y divide-border" {...props}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }) => (
      <thead className="bg-muted/50" {...props}>
        {children}
      </thead>
    ),
    th: ({ children, ...props }) => (
      <th 
        className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-foreground/80" 
        {...props}
      >
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td 
        className="px-4 py-2.5 text-sm border-t border-border/50" 
        {...props}
      >
        {children}
      </td>
    ),
    tr: ({ children, ...props }) => (
      <tr className="hover:bg-muted/30 transition-colors" {...props}>
        {children}
      </tr>
    ),
    tbody: ({ children, ...props }) => (
      <tbody className="divide-y divide-border/50" {...props}>
        {children}
      </tbody>
    ),

    // Blockquotes convertidos a Alerts según emoji
    blockquote: ({ children }) => {
      // Extraer texto del children para detectar emoji
      const textContent = React.Children.toArray(children)
        .map(child => {
          if (typeof child === 'string') return child;
          if (React.isValidElement(child)) {
            const childProps = child.props as { children?: React.ReactNode };
            if (childProps.children) {
              return String(childProps.children);
            }
          }
          return '';
        })
        .join('');

      // Detectar tipo de alerta por emoji
      const isWarning = textContent.includes('⚠️') || textContent.includes('❌');
      const isInfo = textContent.includes('💡') || textContent.includes('ℹ️');
      const isSuccess = textContent.includes('✅') || textContent.includes('✔️');

      const Icon = isWarning ? AlertTriangle : isSuccess ? CheckCircle : isInfo ? Lightbulb : Info;
      const variant = isWarning ? 'destructive' : 'default';

      return (
        <Alert variant={variant} className="my-4">
          <Icon className="h-4 w-4" />
          <AlertDescription className="ml-2">
            {children}
          </AlertDescription>
        </Alert>
      );
    },

    // Código inline con estilo
    code: ({ children, className: codeClassName, ...props }) => {
      // Detectar si es un bloque de código (tiene className con language-)
      const isCodeBlock = codeClassName && codeClassName.includes('language-');
      
      if (isCodeBlock) {
        return (
          <code 
            className={cn(
              "block p-4 bg-muted rounded-lg overflow-x-auto text-sm font-mono",
              codeClassName
            )} 
            {...props}
          >
            {children}
          </code>
        );
      }
      
      // Código inline
      return (
        <code 
          className="px-1.5 py-0.5 bg-muted rounded text-sm font-mono text-foreground/90" 
          {...props}
        >
          {children}
        </code>
      );
    },

    // Pre para bloques de código
    pre: ({ children, ...props }) => (
      <pre className="my-4 overflow-hidden rounded-lg" {...props}>
        {children}
      </pre>
    ),

    // Headings con estilos
    h1: ({ children, ...props }) => (
      <h1 className="text-xl font-bold mt-6 mb-3 text-foreground" {...props}>
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2 className="text-lg font-semibold mt-5 mb-2 text-foreground" {...props}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3 className="text-base font-semibold mt-4 mb-2 text-foreground" {...props}>
        {children}
      </h3>
    ),

    // Listas con mejor espaciado
    ul: ({ children, ...props }) => (
      <ul className="my-2 ml-4 list-disc space-y-1" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className="my-2 ml-4 list-decimal space-y-1" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li className="text-foreground/90" {...props}>
        {children}
      </li>
    ),

    // Párrafos con espaciado (simplificado - sin procesamiento extra)
    p: ({ children, ...props }) => (
      <p className="my-2 leading-relaxed" {...props}>
        {children}
      </p>
    ),

    // Énfasis (negrita/cursiva)
    strong: ({ children, ...props }) => (
      <strong className="font-semibold text-foreground" {...props}>
        {children}
      </strong>
    ),
    em: ({ children, ...props }) => (
      <em className="italic" {...props}>
        {children}
      </em>
    ),

    // Separadores horizontales
    hr: (props) => (
      <hr className="my-4 border-border" {...props} />
    ),

    // Links - Detectar si es referencia a PDF
    // Este es el componente clave: ReactMarkdown procesa [texto](#ref:...) como link
    // y lo pasa por aquí, donde lo convertimos en un botón interactivo
    a: ({ href, children, ...props }) => {
      // ✅ CORRECCIÓN CRÍTICA: Si es referencia a PDF, SIEMPRE renderizar botón
      // Esto previene que referencias malformadas causen page refresh
      if (href && href.startsWith('#ref:')) {
        const parts = href.substring(5).split(':');
        const field = parts[0] || '';
        const page = parseInt(parts[1] || '0', 10);
        const analysisId = parts[2];

        // ✅ SIEMPRE renderizar botón para #ref:, incluso si datos están incompletos
        return (
          <Button
            variant="secondary"
            size="sm"
            className="mx-1 h-6 px-2 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200 inline-flex items-center"
            onClick={(e) => {
              e.preventDefault(); // ✅ CRÍTICO: Prevenir navegación por defecto
              e.stopPropagation(); // ✅ CRÍTICO: Evitar propagación del evento
              
              if (field && page > 0) {
                handlePdfClick(field, page, analysisId);
              } else {
                // Referencia malformada - no hacer nada (sin refresh)
                console.warn('⚠️ [MarkdownContent] Referencia PDF malformada ignorada:', { href, field, page, analysisId });
              }
            }}
          >
            <Search className="mr-1 h-3 w-3" />
            {children}
          </Button>
        );
      }

      // Links externos normales (NO son #ref:)
      return (
        <a 
          href={href} 
          className="text-primary underline hover:text-primary/80" 
          target="_blank" 
          rel="noopener noreferrer"
          {...props}
        >
          {children}
        </a>
      );
    },
  }), [handlePdfClick]);

  // Si el contenido está vacío, no renderizar nada
  if (!content || content.trim() === '') {
    return null;
  }

  return (
    <div className={cn("markdown-content", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

export default MarkdownContent;
