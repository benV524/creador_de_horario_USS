import { useMemo } from 'react'
import { seSuperponen, topePermitido, describirPaquete } from '../lib/armador'
import { DIAS } from '../lib/parseExcel'

const ORDEN_DIA = Object.fromEntries(DIAS.map((d, i) => [d.letra, i]))

function evaluar(paquete, eventosDeOtrosRamos) {
  const choques = []
  for (const ev of paquete.eventos) {
    for (const otro of eventosDeOtrosRamos) {
      if (!seSuperponen(ev, otro)) continue
      choques.push({ con: otro.ramo, dia: ev.dia, hora: ev.horaInicio, permitido: topePermitido(ev, otro) })
    }
  }
  const prohibidos = choques.filter((c) => !c.permitido).length
  return { choques, prohibidos, total: choques.length }
}

function Horario({ paquete }) {
  const bloques = [...paquete.eventos].sort(
    (a, b) => (ORDEN_DIA[a.dia] - ORDEN_DIA[b.dia]) || (a.inicioMin - b.inicioMin),
  )
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {bloques.map((b, i) => (
        <span
          key={i}
          className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          {b.dia} {b.horaInicio}–{b.horaFin}
        </span>
      ))}
    </div>
  )
}

export default function AlternativasPanel({
  ramo, esIndependiente, paquetesDelRamo, paqueteActual, otrosPaquetes, onElegir, onCerrar,
}) {
  const eventosDeOtrosRamos = useMemo(
    () => otrosPaquetes.flatMap((p) => p.eventos),
    [otrosPaquetes],
  )

  const opciones = useMemo(() => {
    return paquetesDelRamo
      .map((p) => ({ paquete: p, ...evaluar(p, eventosDeOtrosRamos) }))
      .sort((a, b) => {
        if (a.prohibidos !== b.prohibidos) return a.prohibidos - b.prohibidos
        if (a.total !== b.total) return a.total - b.total
        return a.paquete.id.localeCompare(b.paquete.id)
      })
  }, [paquetesDelRamo, eventosDeOtrosRamos])

  const libres = opciones.filter((o) => o.total === 0).length

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-2 border-b border-gray-100 p-3 dark:border-gray-800">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-gray-400">
            Otras secciones de {esIndependiente && '(independiente)'}
          </p>
          <h2 className="truncate text-sm font-semibold" title={ramo}>{ramo}</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {opciones.length}{' '}
            {esIndependiente
              ? (opciones.length === 1 ? 'sección' : 'secciones')
              : (opciones.length === 1 ? 'combinación' : 'combinaciones')} ·{' '}
            <span className={libres > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
              {libres} sin topes
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          title="Cerrar"
        >
          ✕
        </button>
      </div>

      <div className="max-h-[34rem] space-y-2 overflow-y-auto p-2">
        {opciones.map(({ paquete, choques, prohibidos, total }) => {
          const esActual = paquete.id === paqueteActual?.id
          const choquesUnicos = [...new Map(
            choques.map((c) => [`${c.con}|${c.dia}|${c.hora}`, c]),
          ).values()]

          return (
            <div
              key={paquete.id}
              className={`rounded-lg border p-2 ${
                esActual
                  ? 'border-purple-400 bg-purple-50 dark:border-purple-600 dark:bg-purple-950/30'
                  : 'border-gray-200 dark:border-gray-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold">{describirPaquete(paquete)}</p>
                {total === 0 ? (
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    Sin topes
                  </span>
                ) : (
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    prohibidos > 0
                      ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {total} tope{total === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              <Horario paquete={paquete} />

              <p className="mt-1 truncate text-[10px] text-gray-500 dark:text-gray-400">
                {[...new Set(paquete.secciones.map((s) => s.profesorDisplay).filter(Boolean))].join(' · ') || 'Profesor no informado'}
              </p>

              {choquesUnicos.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {choquesUnicos.map((c, i) => (
                    <li
                      key={i}
                      className={`text-[10px] ${
                        c.permitido
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      Choca con {c.con} ({c.dia} {c.hora})
                      {!c.permitido && ' — mismo tipo'}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-2 flex items-center gap-2">
                <span className="flex-1 font-mono text-[10px] text-gray-400">
                  {paquete.nrcs.join(' · ')}
                </span>
                {esActual ? (
                  <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400">En uso</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onElegir(paquete)}
                    className="rounded-md bg-purple-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-purple-700"
                  >
                    Usar esta
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {opciones.length === 0 && (
          <p className="py-8 text-center text-xs text-gray-400">
            Este ramo no tiene combinaciones alternativas en el archivo.
          </p>
        )}
      </div>
    </div>
  )
}
