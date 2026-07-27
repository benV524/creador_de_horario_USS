import { useMemo } from 'react'
import { DIAS, calcularColumnas, colorParaClave, claveEvento, detectarChoques } from '../lib/horario'

const PX_POR_MIN = 1.2
const ANCHO_HORA = 116

// getDay(): 0 domingo, 1 lunes… La grilla parte en lunes y no muestra domingo.
const LETRA_POR_DIA_JS = { 1: 'M', 2: 'T', 3: 'W', 4: 'R', 5: 'F', 6: 'S' }

export default function ScheduleGrid({ paquetes, franjas, topesAceptados, onSeleccionarRamo }) {
  const eventos = useMemo(() => paquetes.flatMap((p) => p.eventos), [paquetes])
  const clavesOrdenadas = useMemo(() => paquetes.map((p) => p.clave), [paquetes])
  const { idsEnChoque, idsAceptados } = useMemo(
    () => detectarChoques(eventos, topesAceptados),
    [eventos, topesAceptados],
  )

  // Marcar el día de hoy ayuda a leer "qué tengo ahora" sin contar columnas.
  const hoy = LETRA_POR_DIA_JS[new Date().getDay()] ?? null

  const inicioGrilla = franjas[0]?.inicioMin ?? 8 * 60

  const eventosPorDia = useMemo(() => {
    const mapa = new Map(DIAS.map((d) => [d.letra, []]))
    for (const ev of eventos) mapa.get(ev.dia)?.push(ev)
    const resultado = new Map()
    for (const [dia, lista] of mapa) resultado.set(dia, calcularColumnas(lista))
    return resultado
  }, [eventos])

  const altoFranja = (f) => (f.finMin - f.inicioMin) * PX_POR_MIN

  return (
    <div className="overflow-hidden rounded-2xl border border-linea bg-hoja tarjeta shadow-[0_1px_3px_rgba(26,31,28,0.06)]">
      <div
        className="grid"
        style={{ gridTemplateColumns: `${ANCHO_HORA}px repeat(6, minmax(0, 1fr))` }}
      >
        <div className="rotulo border-b border-r border-linea px-3 py-3 text-center">
          Hora
        </div>
        {DIAS.map((d, i) => (
          <div
            key={d.letra}
            className={`rotulo relative border-b border-linea px-2 py-3 text-center ${
              i < DIAS.length - 1 ? 'border-r' : ''
            } ${d.letra === hoy ? 'text-azul' : ''}`}
          >
            {d.nombre}
            {d.letra === hoy && (
              <span className="absolute inset-x-0 bottom-0 h-[2px] bg-azul" aria-hidden="true" />
            )}
          </div>
        ))}

        <div className="border-r border-linea">
          {franjas.map((f) => (
            <div
              key={f.inicioMin}
              className="tabular flex items-center justify-center border-b border-linea-suave px-2 text-center text-[13px] text-apagado"
              style={{ height: altoFranja(f) }}
            >
              {f.etiqueta}
            </div>
          ))}
        </div>

        {DIAS.map((d, iDia) => (
          <div
            key={d.letra}
            className={`relative ${iDia < DIAS.length - 1 ? 'border-r border-linea' : ''} ${
              d.letra === hoy ? 'bg-azul-suave/40' : ''
            }`}
          >
            {franjas.map((f) => (
              <div
                key={f.inicioMin}
                className="border-b border-linea-suave"
                style={{ height: altoFranja(f) }}
              />
            ))}

            <div className="absolute inset-0">
              {eventosPorDia.get(d.letra)?.map((ev) => {
                const clave = claveEvento(ev)
                const enChoque = idsEnChoque.has(clave)
                const aceptado = idsAceptados.has(clave)
                const anchoPct = 100 / ev.totalColumnas
                const alto = Math.max((ev.finMin - ev.inicioMin) * PX_POR_MIN - 4, 20)

                return (
                  <button
                    type="button"
                    key={clave}
                    onClick={() => onSeleccionarRamo?.(ev.clave)}
                    className={`absolute overflow-hidden rounded-lg px-2 py-1.5 text-left leading-tight text-white transition hover:brightness-110 ${
                      enChoque ? 'z-10 ring-2 ring-tope ring-offset-1' : ''
                    } ${aceptado ? 'ring-[1.5px] ring-dashed ring-tolerado ring-offset-1' : ''}`}
                    style={{
                      top: (ev.inicioMin - inicioGrilla) * PX_POR_MIN + 2,
                      height: alto,
                      left: `calc(${ev.colIdx * anchoPct}% + 3px)`,
                      width: `calc(${anchoPct}% - 6px)`,
                      background: enChoque ? 'var(--color-tope)' : colorParaClave(ev.clave, clavesOrdenadas),
                    }}
                    title={`${ev.ramo} · ${ev.componente} ${ev.seccion} · NRC ${ev.nrc}\n${ev.horaInicio}–${ev.horaFin}\n${ev.profesor}${aceptado ? '\n(tope aceptado)' : ''}`}
                  >
                    <p className="truncate text-[12px] font-semibold">{ev.ramo}</p>
                    {alto > 40 && (
                      <p className="tabular truncate text-[11px] opacity-95">
                        {ev.componente} {ev.seccion} · {ev.horaInicio}–{ev.horaFin}
                      </p>
                    )}
                    {alto > 62 && ev.profesor && (
                      <p className="truncate text-[11px] opacity-75">{ev.profesor}</p>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
