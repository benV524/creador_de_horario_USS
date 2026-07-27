// Iconos de línea en un cuadrito tintado, como los títulos de sección del portal USS.

const TRAZOS = {
  horario: (
    <>
      <rect x="3" y="4.5" width="14" height="12.5" rx="2.5" />
      <path d="M3 8.5h14M7 3v3M13 3v3" />
    </>
  ),
  buscar: (
    <>
      <circle cx="9" cy="9" r="5.5" />
      <path d="M13 13l4 4" />
    </>
  ),
  auto: (
    <>
      <path d="M10 2.5l1.6 3.9 3.9 1.6-3.9 1.6L10 13.5 8.4 9.6 4.5 8l3.9-1.6z" />
      <path d="M15.5 13.5l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8z" />
    </>
  ),
  guardados: (
    <>
      <path d="M5 3.5h10a1 1 0 011 1v12.2a.5.5 0 01-.77.42L10 13.8l-5.23 3.32A.5.5 0 014 16.7V4.5a1 1 0 011-1z" />
    </>
  ),
}

export default function Icono({ nombre, tono = 'azul', className = '' }) {
  const fondos = {
    azul: 'bg-azul-suave text-azul',
    tenue: 'bg-fondo text-apagado',
  }
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${fondos[tono]} ${className}`}
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[18px] w-[18px]"
      >
        {TRAZOS[nombre]}
      </svg>
    </span>
  )
}
