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
    <div className="mt-1.5 flex flex-wrap gap-1">
      {bloques.map((b, i) => (
        <span key={i} className="tabular rounded-[3px] bg-papel px-1.5 py-0.5 text-[10px] text-apagado">
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
    <section className="rounded border border-linea bg-hoja">
      <div className="flex items-start justify-between gap-2 border-b border-linea px-3 py-2.5">
        <div className="min-w-0">
          <p className="rotulo">
            Otras secciones {esIndependiente && '(suelta)'}
          </p>
          <h2 className="mt-0.5 truncate text-[13px] font-semibold" title={ramo}>{ramo}</h2>
          <p className="mt-0.5 text-[12px] text-apagado">
            <span className="tabular">{opciones.length}</span>{' '}
            {esIndependiente
              ? (opciones.length === 1 ? 'sección' : 'secciones')
              : (opciones.length === 1 ? 'combinación' : 'combinaciones')}
            {' · '}
            <span className={libres > 0 ? 'text-verde' : 'text-tolerado'}>
              <span className="tabular">{libres}</span> sin topes
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          className="shrink-0 text-[13px] leading-none text-tenue transition-colors hover:text-tinta"
          title="Cerrar"
        >
          ✕
        </button>
      </div>

      <div className="max-h-[34rem] divide-y divide-linea-suave overflow-y-auto">
        {opciones.map(({ paquete, choques, prohibidos, total }) => {
          const esActual = paquete.id === paqueteActual?.id
          const choquesUnicos = [...new Map(
            choques.map((c) => [`${c.con}|${c.dia}|${c.hora}`, c]),
          ).values()]

          return (
            <div key={paquete.id} className={`px-3 py-2.5 ${esActual ? 'bg-verde-suave' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-semibold">{describirPaquete(paquete)}</p>
                {total === 0 ? (
                  <span className="rotulo shrink-0 text-[9px] text-verde">libre</span>
                ) : (
                  <span className={`rotulo shrink-0 text-[9px] ${prohibidos > 0 ? 'text-tope' : 'text-tolerado'}`}>
                    {total} tope{total === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              <Horario paquete={paquete} />

              <p className="mt-1 truncate text-[11px] text-apagado">
                {[...new Set(paquete.secciones.map((s) => s.profesorDisplay).filter(Boolean))].join(' · ') || 'Profesor no informado'}
              </p>

              {choquesUnicos.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {choquesUnicos.map((c, i) => (
                    <li
                      key={i}
                      className={`text-[11px] ${c.permitido ? 'text-tolerado' : 'text-tope'}`}
                    >
                      Se pisa con {c.con} (<span className="tabular">{c.dia} {c.hora}</span>)
                      {!c.permitido && ' — mismo tipo'}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-2 flex items-center gap-2">
                <span className="tabular flex-1 text-[10px] text-tenue">
                  {paquete.nrcs.join(' · ')}
                </span>
                {esActual ? (
                  <span className="rotulo text-[9px] text-verde">en uso</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onElegir(paquete)}
                    className="rounded bg-verde px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-verde-fuerte"
                  >
                    Usar esta
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {opciones.length === 0 && (
          <p className="px-3 py-10 text-center text-[12px] text-apagado">
            Este ramo no tiene otras combinaciones en el archivo.
          </p>
        )}
      </div>
    </section>
  )
}
