export default function Loading() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] grid place-items-center bg-background/40 backdrop-blur-[1px] transition-opacity">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
        <span className="sr-only">Cargando…</span>
      </div>
    </div>
  );
}


