import { useEffect, useMemo, useState } from 'react'
import ScheduleGrid from './ScheduleGrid'
import AlternativasPanel from './AlternativasPanel'
import { detectarChoques, colorParaClave, claveTope } from '../lib/horario'
import {
  describirPaquete,
  construirPaquetesPorRamo,
  construirPaqueteIndependiente,
} from '../lib/armador'
import { exportarPNG, exportarPDF } from '../lib/exportar'

export default function ScheduleView({
  cursos, franjas, paquetes, onQuitar, onVerDetalle, onIrABuscar, onCambiarPaquete, onNotificar,
  horarioActivo, hayCambiosSinGuardar, onGuardarNuevo, onActualizarActivo, onNuevoHorario,
}) {
  const [exportando, setExportando] = useState(false)
  const [claveActiva, setClaveActiva] = useState(null)
  const [topesAceptados, setTopesAceptados] = useState(() => new Set())
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [confirmandoNuevo, setConfirmandoNuevo] = useState(false)

  const pedirNuevo = () => {
    if (hayCambiosSinGuardar) setConfirmandoNuevo(true)
    else onNuevoHorario()
  }

  const eventos = useMemo(() => paquetes.flatMap((p) => p.eventos), [paquetes])
  const clavesOrdenadas = useMemo(() => paquetes.map((p) => p.clave), [paquetes])
  const { pares } = useMemo(
    () => detectarChoques(eventos, topesAceptados),
    [eventos, topesAceptados],
  )

  const alternarTope = (clave) => {
    setTopesAceptados((prev) => {
      const copia = new Set(prev)
      if (copia.has(clave)) copia.delete(clave)
      else copia.add(clave)
      return copia
    })
  }

  const paquetesPorRamo = useMemo(() => construirPaquetesPorRamo(cursos), [cursos])

  useEffect(() => {
    if (claveActiva && !paquetes.some((p) => p.clave === claveActiva)) setClaveActiva(null)
  }, [paquetes, claveActiva])

  // Un mismo par de ramos puede chocar en varios bloques; se agrupa para no repetir el aviso.
  const choquesPorPar = useMemo(() => {
    const mapa = new Map()
    for (const { a, b, permitido, aceptado } of pares) {
      const clave = claveTope(a.ramo, b.ramo)
      if (!mapa.has(clave)) {
        mapa.set(clave, {
          clave,
          etiqueta: [a.ramo, b.ramo].sort().join(' y '),
          permitido,
          aceptado,
          bloques: [],
        })
      }
      mapa.get(clave).bloques.push(`${a.dia} ${a.horaInicio}`)
    }
    return [...mapa.values()]
  }, [pares])

  const topesPendientes = choquesPorPar.filter((c) => !c.aceptado)
  const topesResueltos = choquesPorPar.filter((c) => c.aceptado)

  const exportar = async (formato) => {
    setExportando(true)
    try {
      if (formato === 'png') exportarPNG(paquetes, franjas)
      else await exportarPDF(paquetes, franjas)
    } catch (err) {
      onNotificar?.(`No se pudo exportar: ${err.message}`, 'error')
    } finally {
      setExportando(false)
    }
  }

  if (paquetes.length === 0) {
    return (
      <div className="rounded border border-dashed border-linea bg-hoja py-20 text-center">
        <p className="text-[15px] font-semibold text-tinta">Tu horario está vacío</p>
        <p className="mt-1 text-[13px] text-apagado">
          Agrega ramos uno a uno, o deja que la app pruebe las combinaciones por ti.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <button
            type="button"
            onClick={onIrABuscar}
            className="rounded bg-verde px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-verde-fuerte"
          >
            Buscar ramos
          </button>
        </div>
      </div>
    )
  }

  const paqueteActivo = paquetes.find((p) => p.clave === claveActiva)

  const alternativasDelActivo = !paqueteActivo
    ? []
    : paqueteActivo.esIndependiente
      ? cursos
        .filter((c) => c.nombre === paqueteActivo.ramo)
        .map((c) => construirPaqueteIndependiente(c))
      : paquetesPorRamo.get(paqueteActivo.ramo) ?? []

  return (
    <div
      className={`grid gap-5 ${
        claveActiva
          ? 'xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_340px_400px]'
          : 'xl:grid-cols-[minmax(0,1fr)_360px]'
      }`}
    >
      <div>
        {topesPendientes.length > 0 && (
          <div className="mb-3 space-y-2">
            {topesPendientes.map((c) => (
              <div
                key={c.clave}
                className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded border-l-2 px-3 py-2 text-[13px] ${
                  c.permitido
                    ? 'border-tolerado bg-tolerado-suave text-tolerado'
                    : 'border-tope bg-tope-suave text-tope'
                }`}
              >
                <span className="flex-1">
                  <strong className="font-semibold">{c.etiqueta}</strong> se pisan{' '}
                  <span className="tabular">{[...new Set(c.bloques)].join(', ')}</span>.
                  {c.permitido
                    ? ' Es un cruce entre informática y un ramo de servicio.'
                    : ' Son del mismo tipo, así que este cruce no debería ocurrir.'}
                </span>
                <button
                  type="button"
                  onClick={() => alternarTope(c.clave)}
                  className="shrink-0 rounded border border-current px-2.5 py-1 text-[12px] font-medium transition-colors hover:bg-black/5"
                >
                  Dejarlo así
                </button>
              </div>
            ))}
          </div>
        )}

        {topesResueltos.length > 0 && (
          <div className="mb-3 space-y-1.5">
            {topesResueltos.map((c) => (
              <div
                key={c.clave}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded border border-linea bg-hoja px-3 py-1.5 text-[12px] text-apagado"
              >
                <span className="flex-1">
                  Cruce aceptado entre {c.etiqueta} (
                  <span className="tabular">{[...new Set(c.bloques)].join(', ')}</span>).
                </span>
                <button
                  type="button"
                  onClick={() => alternarTope(c.clave)}
                  className="shrink-0 font-medium text-verde hover:underline"
                >
                  Deshacer
                </button>
              </div>
            ))}
          </div>
        )}

        <ScheduleGrid
          paquetes={paquetes}
          franjas={franjas}
          topesAceptados={topesAceptados}
          onSeleccionarRamo={setClaveActiva}
        />
      </div>

      <aside className="space-y-4">
        <section className="rounded border border-linea bg-hoja">
          <div className="flex items-center justify-between gap-2 border-b border-linea px-3 py-2.5">
            <h2 className="rotulo">Ramos ({paquetes.length})</h2>
            <div className="flex items-center gap-2 text-[12px] font-medium">
              <button
                type="button"
                onClick={onIrABuscar}
                className="text-verde hover:underline"
              >
                Agregar
              </button>
              <span className="text-linea">·</span>
              <button
                type="button"
                onClick={pedirNuevo}
                className="text-apagado hover:text-tinta hover:underline"
              >
                Empezar de nuevo
              </button>
            </div>
          </div>

          {confirmandoNuevo && (
            <div className="border-b border-linea bg-tolerado-suave px-3 py-2.5">
              <p className="text-[12px] text-tolerado">
                {horarioActivo
                  ? `"${horarioActivo.nombre}" tiene cambios sin guardar. Si empiezas de nuevo se pierden.`
                  : 'Este horario no está guardado. Si empiezas de nuevo se pierde.'}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => { setConfirmandoNuevo(false); onNuevoHorario() }}
                  className="rounded bg-tolerado px-2.5 py-1 text-[12px] font-medium text-white hover:brightness-110"
                >
                  Empezar de nuevo
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmandoNuevo(false)}
                  className="rounded border border-tolerado px-2.5 py-1 text-[12px] font-medium text-tolerado hover:bg-black/5"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <ul className="divide-y divide-linea-suave">
            {paquetes.map((p) => {
              const activo = p.clave === claveActiva
              const alternativas = p.esIndependiente
                ? cursos.filter((c) => c.nombre === p.ramo).length
                : paquetesPorRamo.get(p.ramo)?.length ?? 0
              return (
                <li
                  key={p.clave}
                  className={`px-3 py-2.5 transition-colors ${activo ? 'bg-verde-suave' : ''}`}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className="mt-1 h-3 w-1 shrink-0 rounded-full"
                      style={{ background: colorParaClave(p.clave, clavesOrdenadas) }}
                    />
                    <button
                      type="button"
                      onClick={() => setClaveActiva(activo ? null : p.clave)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-[13px] font-semibold leading-snug" title={p.ramo}>
                        {p.ramo}
                      </p>
                      <p className="mt-0.5 text-[12px] text-apagado">
                        {describirPaquete(p)}
                        {p.esIndependiente && (
                          <span className="rotulo ml-1.5 text-[9px] text-tenue">independiente</span>
                        )}
                      </p>
                      {alternativas > 1 && (
                        <p className="mt-0.5 text-[11px] text-verde">
                          {alternativas} {p.esIndependiente ? 'secciones' : 'combinaciones'} para elegir
                        </p>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onQuitar(p.clave)}
                      className="shrink-0 text-[13px] leading-none text-tenue transition-colors hover:text-tope"
                      title="Quitar del horario"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1 pl-[22px]">
                    {p.secciones.map((s) => (
                      <button
                        key={s.nrc}
                        type="button"
                        onClick={() => onVerDetalle(s.nrc)}
                        className="tabular rounded-[3px] border border-linea px-1.5 py-0.5 text-[10px] text-apagado transition-colors hover:border-verde-borde hover:bg-verde-suave hover:text-verde"
                      >
                        {s.nrc}
                      </button>
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="rounded border border-linea bg-hoja">
          <h2 className="rotulo border-b border-linea px-3 py-2.5">Guardar</h2>
          <div className="p-3">
            {horarioActivo && (
              <div className="mb-2 rounded border border-verde-borde bg-verde-suave px-2.5 py-2">
                <p className="truncate text-[12px] text-verde">
                  Abierto: <strong className="font-semibold">{horarioActivo.nombre}</strong>
                </p>
                <button
                  type="button"
                  onClick={onActualizarActivo}
                  className="mt-1.5 w-full rounded bg-verde px-2 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-verde-fuerte"
                >
                  Guardar cambios
                </button>
              </div>
            )}
            <form
              className="flex gap-1.5"
              onSubmit={(e) => {
                e.preventDefault()
                const limpio = nombreNuevo.trim()
                if (!limpio) return
                onGuardarNuevo(limpio)
                setNombreNuevo('')
              }}
            >
              <input
                value={nombreNuevo}
                onChange={(e) => setNombreNuevo(e.target.value)}
                placeholder={horarioActivo ? 'Guardar como copia…' : 'Nombre del horario…'}
                className="min-w-0 flex-1 rounded border border-linea bg-hoja px-2 py-1.5 text-[12px] placeholder:text-tenue focus:border-verde focus:outline-none"
              />
              <button
                type="submit"
                disabled={!nombreNuevo.trim()}
                className="shrink-0 rounded border border-linea px-3 py-1.5 text-[12px] font-medium text-tinta transition-colors hover:border-verde-borde hover:bg-verde-suave hover:text-verde disabled:opacity-40 disabled:hover:border-linea disabled:hover:bg-transparent disabled:hover:text-tinta"
              >
                Guardar
              </button>
            </form>
          </div>
        </section>

        <section className="rounded border border-linea bg-hoja">
          <h2 className="rotulo border-b border-linea px-3 py-2.5">Descargar</h2>
          <div className="flex gap-2 p-3">
            <button
              type="button"
              disabled={exportando}
              onClick={() => exportar('png')}
              className="flex-1 rounded border border-linea px-3 py-2 text-[12px] font-medium transition-colors hover:border-verde-borde hover:bg-verde-suave hover:text-verde disabled:opacity-40"
            >
              Imagen
            </button>
            <button
              type="button"
              disabled={exportando}
              onClick={() => exportar('pdf')}
              className="flex-1 rounded border border-linea px-3 py-2 text-[12px] font-medium transition-colors hover:border-verde-borde hover:bg-verde-suave hover:text-verde disabled:opacity-40"
            >
              PDF
            </button>
          </div>
        </section>
      </aside>

      {paqueteActivo && (
        <div className="xl:col-span-2 2xl:col-span-1">
          <AlternativasPanel
            ramo={paqueteActivo.ramo}
            esIndependiente={paqueteActivo.esIndependiente}
            paquetesDelRamo={alternativasDelActivo}
            paqueteActual={paqueteActivo}
            otrosPaquetes={paquetes.filter((p) => p.clave !== claveActiva)}
            onElegir={(paquete) => onCambiarPaquete(claveActiva, paquete)}
            onCerrar={() => setClaveActiva(null)}
          />
        </div>
      )}
    </div>
  )
}
