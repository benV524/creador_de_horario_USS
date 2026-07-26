const ESTILOS = {
  ok: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200',
  aviso: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/80 dark:text-amber-200',
  error: 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/80 dark:text-red-200',
}

export default function Avisos({ avisos }) {
  if (avisos.length === 0) return null
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-80 flex-col gap-2">
      {avisos.map((a) => (
        <div
          key={a.id}
          className={`rounded-lg border px-3 py-2 text-sm shadow-lg ${ESTILOS[a.tono] ?? ESTILOS.ok}`}
        >
          {a.texto}
        </div>
      ))}
    </div>
  )
}
