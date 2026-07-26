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

  // Si la entrada abierta se quita del horario, cerrar el panel.
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
          etiqueta: [a.ramo, b.ramo].sort().join(' ⇄ '),
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
      <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-900">
        <p className="text-sm text-gray-500 dark:text-gray-400">Tu horario está vacío.</p>
        <button
          type="button"
          onClick={onIrABuscar}
          className="mt-3 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
        >
          Buscar ramos
        </button>
      </div>
    )
  }

  const paqueteActivo = paquetes.find((p) => p.clave === claveActiva)

  // Para una sección suelta las alternativas son las demás secciones del ramo, también sueltas.
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
          ? 'xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_360px_420px]'
          : 'xl:grid-cols-[minmax(0,1fr)_380px]'
      }`}
    >
      <div>
        {topesPendientes.length > 0 && (
          <div className="mb-3 space-y-2">
            {topesPendientes.map((c) => (
              <div
                key={c.clave}
                className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2 text-sm ${
                  c.permitido
                    ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                    : 'border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300'
                }`}
              >
                <span className="flex-1">
                  <strong>Tope:</strong> {c.etiqueta} ({[...new Set(c.bloques)].join(', ')}).
                  {c.permitido
                    ? ' Es un cruce entre informática y un ramo de servicio.'
                    : ' Son del mismo tipo, así que este tope no debería ocurrir.'}
                </span>
                <button
                  type="button"
                  onClick={() => alternarTope(c.clave)}
                  className="shrink-0 rounded-md border border-current px-2.5 py-1 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10"
                >
                  Mantener así
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
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
              >
                <span className="flex-1">
                  Tope aceptado: {c.etiqueta} ({[...new Set(c.bloques)].join(', ')}).
                </span>
                <button
                  type="button"
                  onClick={() => alternarTope(c.clave)}
                  className="shrink-0 font-medium underline hover:no-underline"
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

      <aside className="space-y-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Ramos ({paquetes.length})</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onIrABuscar}
                className="text-xs font-medium text-purple-600 hover:underline dark:text-purple-400"
              >
                + Agregar
              </button>
              <span className="text-gray-300 dark:text-gray-700">|</span>
              <button
                type="button"
                onClick={pedirNuevo}
                className="text-xs font-medium text-gray-500 hover:underline dark:text-gray-400"
                title="Vaciar el horario para empezar uno nuevo"
              >
                Nuevo
              </button>
            </div>
          </div>

          {confirmandoNuevo ? (
            <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1.5 dark:border-amber-800 dark:bg-amber-950/40">
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                {horarioActivo
                  ? `Tienes cambios sin guardar en "${horarioActivo.nombre}". Si empiezas uno nuevo se pierden.`
                  : 'Este horario no está guardado. Si empiezas uno nuevo se pierde.'}
              </p>
              <div className="mt-1.5 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => { setConfirmandoNuevo(false); onNuevoHorario() }}
                  className="flex-1 rounded-md bg-amber-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-amber-700"
                >
                  Empezar de nuevo
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmandoNuevo(false)}
                  className="flex-1 rounded-md border border-amber-400 px-2 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-950"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-0.5 text-[11px] text-gray-400">
              Haz clic en un ramo para ver sus otras secciones.
            </p>
          )}

          <ul className="mt-2 space-y-2">
            {paquetes.map((p) => {
              const activo = p.clave === claveActiva
              const alternativas = p.esIndependiente
                ? cursos.filter((c) => c.nombre === p.ramo).length
                : paquetesPorRamo.get(p.ramo)?.length ?? 0
              return (
                <li
                  key={p.clave}
                  className={`rounded-lg border p-2 transition-colors ${
                    activo
                      ? 'border-purple-400 bg-purple-50 dark:border-purple-600 dark:bg-purple-950/30'
                      : 'border-gray-100 dark:border-gray-800'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className="mt-1 h-3 w-3 shrink-0 rounded-sm"
                      style={{ background: colorParaClave(p.clave, clavesOrdenadas) }}
                    />
                    <button
                      type="button"
                      onClick={() => setClaveActiva(activo ? null : p.clave)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-xs font-semibold" title={p.ramo}>{p.ramo}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {describirPaquete(p)}
                        {p.esIndependiente && (
                          <span className="ml-1.5 rounded bg-slate-200 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-600 dark:bg-gray-700 dark:text-gray-300">
                            independiente
                          </span>
                        )}
                      </p>
                      {alternativas > 1 && (
                        <p className="mt-0.5 text-[10px] text-purple-600 dark:text-purple-400">
                          {alternativas} {p.esIndependiente ? 'secciones' : 'combinaciones'} disponibles
                        </p>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onQuitar(p.clave)}
                      className="shrink-0 text-xs text-gray-400 hover:text-red-500"
                      title="Quitar del horario"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1 pl-5">
                    {p.secciones.map((s) => (
                      <button
                        key={s.nrc}
                        type="button"
                        onClick={() => onVerDetalle(s.nrc)}
                        className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                      >
                        {s.nrc}
                      </button>
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-sm font-semibold">Guardar horario</h2>
          {horarioActivo && (
            <div className="mt-2 rounded-lg bg-purple-50 px-2 py-1.5 dark:bg-purple-950/30">
              <p className="truncate text-[11px] text-purple-800 dark:text-purple-300">
                Abierto: <strong>{horarioActivo.nombre}</strong>
              </p>
              <button
                type="button"
                onClick={onActualizarActivo}
                className="mt-1 w-full rounded-md bg-purple-600 px-2 py-1 text-xs font-medium text-white hover:bg-purple-700"
              >
                Guardar cambios
              </button>
            </div>
          )}
          <form
            className="mt-2 flex gap-1.5"
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
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-950"
            />
            <button
              type="submit"
              disabled={!nombreNuevo.trim()}
              className="shrink-0 rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-40 dark:bg-gray-700"
            >
              Guardar
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-sm font-semibold">Exportar</h2>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={exportando}
              onClick={() => exportar('png')}
              className="flex-1 rounded-lg bg-gray-800 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40 dark:bg-gray-700"
            >
              Imagen
            </button>
            <button
              type="button"
              disabled={exportando}
              onClick={() => exportar('pdf')}
              className="flex-1 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-40"
            >
              PDF
            </button>
          </div>
        </div>
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
