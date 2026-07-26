const ESTILOS = {
  ok: 'border-l-verde bg-hoja text-tinta',
  aviso: 'border-l-tolerado bg-hoja text-tinta',
  error: 'border-l-tope bg-hoja text-tinta',
}

export default function Avisos({ avisos }) {
  if (avisos.length === 0) return null
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-5 top-5 z-50 flex w-80 flex-col gap-2"
    >
      {avisos.map((a) => (
        <div
          key={a.id}
          className={`rounded border border-linea border-l-[3px] px-3 py-2 text-[13px] shadow-[0_2px_8px_rgba(26,31,28,0.10)] ${
            ESTILOS[a.tono] ?? ESTILOS.ok
          }`}
        >
          {a.texto}
        </div>
      ))}
    </div>
  )
}
