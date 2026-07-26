import { useMemo } from 'react'
import { DIAS, calcularColumnas, colorParaClave, claveEvento, detectarChoques } from '../lib/horario'

const PX_POR_MIN = 1.2
const ANCHO_HORA = 132

// La grilla se mantiene clara en ambos temas: es una "hoja" de horario y así se ve
// idéntica a la imagen que se exporta.
export default function ScheduleGrid({ paquetes, franjas, topesAceptados, onSeleccionarRamo }) {
  const eventos = useMemo(() => paquetes.flatMap((p) => p.eventos), [paquetes])
  const clavesOrdenadas = useMemo(() => paquetes.map((p) => p.clave), [paquetes])
  const { idsEnChoque, idsAceptados } = useMemo(
    () => detectarChoques(eventos, topesAceptados),
    [eventos, topesAceptados],
  )

  const inicioGrilla = franjas[0]?.inicioMin ?? 8 * 60
  const finGrilla = franjas[franjas.length - 1]?.finMin ?? 20 * 60

  const eventosPorDia = useMemo(() => {
    const mapa = new Map(DIAS.map((d) => [d.letra, []]))
    for (const ev of eventos) mapa.get(ev.dia)?.push(ev)
    const resultado = new Map()
    for (const [dia, lista] of mapa) resultado.set(dia, calcularColumnas(lista))
    return resultado
  }, [eventos])

  const altoFranja = (f) => (f.finMin - f.inicioMin) * PX_POR_MIN

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div
        className="grid"
        style={{ gridTemplateColumns: `${ANCHO_HORA}px repeat(6, minmax(0, 1fr))` }}
      >
        <div className="border-b border-r border-slate-200 bg-slate-50 px-3 py-3.5 text-center text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Hora
        </div>
        {DIAS.map((d, i) => (
          <div
            key={d.letra}
            className={`border-b border-slate-200 bg-slate-50 px-2 py-3.5 text-center text-[11px] font-semibold uppercase tracking-widest text-slate-500 ${
              i < DIAS.length - 1 ? 'border-r' : ''
            }`}
          >
            {d.nombre}
          </div>
        ))}

        <div className="border-r border-slate-200">
          {franjas.map((f, i) => (
            <div
              key={f.inicioMin}
              className={`flex items-center justify-center border-b border-slate-100 px-2 text-center text-[13px] font-medium tracking-tight text-slate-600 ${
                i % 2 === 1 ? 'bg-slate-50/70' : ''
              }`}
              style={{ height: altoFranja(f) }}
            >
              {f.etiqueta}
            </div>
          ))}
        </div>

        {DIAS.map((d, iDia) => (
          <div
            key={d.letra}
            className={`relative ${iDia < DIAS.length - 1 ? 'border-r border-slate-200' : ''}`}
          >
            {franjas.map((f, i) => (
              <div
                key={f.inicioMin}
                className={`border-b border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/70' : ''}`}
                style={{ height: altoFranja(f) }}
              />
            ))}

            <div className="absolute inset-0">
              {eventosPorDia.get(d.letra)?.map((ev) => {
                const clave = claveEvento(ev)
                const enChoque = idsEnChoque.has(clave)
                const aceptado = idsAceptados.has(clave)
                const color = colorParaClave(ev.clave, clavesOrdenadas)
                const anchoPct = 100 / ev.totalColumnas
                const alto = Math.max((ev.finMin - ev.inicioMin) * PX_POR_MIN - 4, 20)

                return (
                  <button
                    type="button"
                    key={clave}
                    onClick={() => onSeleccionarRamo?.(ev.clave)}
                    className={`absolute overflow-hidden rounded-lg px-2 py-1.5 text-left leading-tight text-white shadow-sm transition hover:brightness-110 ${
                      enChoque ? 'z-10 ring-2 ring-red-600' : ''
                    } ${aceptado ? 'ring-2 ring-dashed ring-amber-400' : ''}`}
                    style={{
                      top: (ev.inicioMin - inicioGrilla) * PX_POR_MIN + 2,
                      height: alto,
                      left: `calc(${ev.colIdx * anchoPct}% + 3px)`,
                      width: `calc(${anchoPct}% - 6px)`,
                      background: enChoque ? '#dc2626' : color,
                    }}
                    title={`${ev.ramo} · ${ev.componente} ${ev.seccion} · NRC ${ev.nrc}\n${ev.horaInicio}–${ev.horaFin}\n${ev.profesor}${aceptado ? '\n(tope aceptado)' : ''}`}
                  >
                    <p className="truncate text-[11px] font-semibold">{ev.ramo}</p>
                    {alto > 40 && (
                      <p className="truncate text-[10px] opacity-95">
                        {ev.componente} {ev.seccion} · {ev.horaInicio}–{ev.horaFin}
                      </p>
                    )}
                    {alto > 62 && ev.profesor && (
                      <p className="truncate text-[10px] opacity-80">{ev.profesor}</p>
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
