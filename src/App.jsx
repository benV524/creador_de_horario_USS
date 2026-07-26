import { useCallback, useEffect, useMemo, useState } from 'react'
import FileUpload from './components/FileUpload'
import CourseSearch from './components/CourseSearch'
import CourseDetail from './components/CourseDetail'
import ScheduleView from './components/ScheduleView'
import AutoBuilder from './components/AutoBuilder'
import SavedSchedules from './components/SavedSchedules'
import Avisos from './components/Avisos'
import { SpeedInsights } from '@vercel/speed-insights/react'
import {
  mejorPaqueteParaSeccion,
  construirPaqueteIndependiente,
  describirPaquete,
} from './lib/armador'
import {
  leerHorarios,
  escribirHorarios,
  crearHorario,
  serializarPaquetes,
  rehidratar,
} from './lib/almacenamiento'

const VISTAS = [
  { id: 'horario', etiqueta: 'Mi horario' },
  { id: 'buscar', etiqueta: 'Buscar ramos' },
  { id: 'auto', etiqueta: 'Armado automático' },
  { id: 'guardados', etiqueta: 'Guardados' },
]

function App() {
  const [datos, setDatos] = useState(null)
  const [vista, setVista] = useState('horario')
  const [paquetes, setPaquetes] = useState([])
  const [nrcDetalle, setNrcDetalle] = useState(null)
  const [avisos, setAvisos] = useState([])
  const [horariosGuardados, setHorariosGuardados] = useState(() => leerHorarios())
  const [horarioActivoId, setHorarioActivoId] = useState(null)

  const cursosPorNrc = useMemo(() => {
    const mapa = new Map()
    for (const c of datos?.cursos ?? []) mapa.set(c.nrc, c)
    return mapa
  }, [datos])

  // Solo los paquetes normales ocupan el "cupo" de un ramo; los independientes no.
  const ramosSeleccionados = useMemo(
    () => paquetes.filter((p) => !p.esIndependiente).map((p) => p.ramo),
    [paquetes],
  )
  const nrcsSeleccionados = useMemo(
    () => new Set(paquetes.flatMap((p) => p.nrcs)),
    [paquetes],
  )

  const notificar = useCallback((texto, tono = 'ok') => {
    const id = `${Date.now()}-${Math.random()}`
    setAvisos((prev) => [...prev, { id, texto, tono }])
    setTimeout(() => setAvisos((prev) => prev.filter((a) => a.id !== id)), 7000)
  }, [])

  const agregarSeccion = useCallback((nrc) => {
    const seccion = cursosPorNrc.get(nrc)
    if (!seccion) return

    const existente = paquetes.find((p) => !p.esIndependiente && p.ramo === seccion.nombre)
    const eventosDeOtrosRamos = paquetes
      .filter((p) => p !== existente)
      .flatMap((p) => p.eventos)

    const nuevo = mejorPaqueteParaSeccion(nrc, cursosPorNrc, eventosDeOtrosRamos)
    if (!nuevo) return

    if (existente) {
      if (existente.id === nuevo.id) {
        notificar(`${seccion.nombre} ya está en tu horario con ${describirPaquete(existente)}.`, 'aviso')
        return
      }
      notificar(
        `${seccion.nombre}: reemplazado ${describirPaquete(existente)} por ${describirPaquete(nuevo)}.`,
        'aviso',
      )
      setPaquetes(paquetes.map((p) => (p === existente ? nuevo : p)))
      return
    }

    const ligados = nuevo.secciones.filter((s) => s.nrc !== nrc)
    if (ligados.length > 0) {
      const detalle = ligados.map((s) => `${s.componente} ${s.seccion}`).join(' y ')
      notificar(`${seccion.nombre} agregado. Por la liga se sumó también ${detalle}.`)
    } else {
      notificar(`${seccion.nombre} agregado (${seccion.componente} ${seccion.seccion}).`)
    }
    setPaquetes([...paquetes, nuevo])
  }, [paquetes, cursosPorNrc, notificar])

  /** Agrega una sola sección tal cual, sin arrastrar su liga ni reemplazar nada. */
  const agregarSeccionIndependiente = useCallback((nrc) => {
    const seccion = cursosPorNrc.get(nrc)
    if (!seccion) return

    const nuevo = construirPaqueteIndependiente(seccion)
    if (paquetes.some((p) => p.clave === nuevo.clave)) {
      notificar(`${seccion.componente} ${seccion.seccion} de ${seccion.nombre} ya está en tu horario.`, 'aviso')
      return
    }
    if (nrcsSeleccionados.has(nrc)) {
      notificar(
        `El NRC ${nrc} ya estaba en tu horario dentro de otro ramo. Se agregó igual como independiente.`,
        'aviso',
      )
    } else {
      notificar(`${seccion.nombre} (${seccion.componente} ${seccion.seccion}) agregado como ramo independiente.`)
    }
    setPaquetes([...paquetes, nuevo])
  }, [paquetes, cursosPorNrc, nrcsSeleccionados, notificar])

  const quitarPaquete = useCallback((clave) => {
    setPaquetes((prev) => {
      const objetivo = prev.find((p) => p.clave === clave)
      if (objetivo) notificar(`${objetivo.ramo} quitado del horario.`, 'aviso')
      return prev.filter((p) => p.clave !== clave)
    })
  }, [notificar])

  const aplicarSolucion = useCallback((nuevosPaquetes) => {
    setPaquetes(nuevosPaquetes)
    setVista('horario')
  }, [])

  /** Vacía el horario para empezar de cero. Los guardados no se tocan. */
  const nuevoHorario = useCallback(() => {
    setPaquetes([])
    setHorarioActivoId(null)
    setVista('horario')
    notificar('Horario vacío listo para empezar de nuevo.')
  }, [notificar])

  const cambiarPaquete = useCallback((claveAnterior, nuevo) => {
    setPaquetes((prev) => prev.map((p) => (p.clave === claveAnterior ? nuevo : p)))
    notificar(`${nuevo.ramo}: ahora tomas ${describirPaquete(nuevo)}.`)
  }, [notificar])

  const horarioActivo = useMemo(
    () => horariosGuardados.find((h) => h.id === horarioActivoId) ?? null,
    [horariosGuardados, horarioActivoId],
  )

  // Sirve para avisar antes de descartar: un horario recién armado o uno abierto que
  // se modificó todavía no están respaldados.
  const hayCambiosSinGuardar = useMemo(() => {
    if (paquetes.length === 0) return false
    if (!horarioActivo) return true
    return JSON.stringify(serializarPaquetes(paquetes)) !== JSON.stringify(horarioActivo.entradas)
  }, [paquetes, horarioActivo])

  /** Toda escritura pasa por aquí para mantener estado y localStorage en sincronía. */
  const persistir = useCallback((nuevaLista, mensajeExito) => {
    const resultado = escribirHorarios(nuevaLista)
    if (!resultado.ok) {
      notificar(resultado.error, 'error')
      return false
    }
    setHorariosGuardados(nuevaLista)
    if (mensajeExito) notificar(mensajeExito)
    return true
  }, [notificar])

  const guardarNuevo = useCallback((nombre) => {
    if (paquetes.length === 0) {
      notificar('Tu horario está vacío: agrega ramos antes de guardarlo.', 'aviso')
      return
    }
    const horario = crearHorario(nombre, paquetes)
    if (persistir([horario, ...horariosGuardados], `Horario "${nombre}" guardado.`)) {
      setHorarioActivoId(horario.id)
    }
  }, [paquetes, horariosGuardados, persistir, notificar])

  const actualizarActivo = useCallback(() => {
    if (!horarioActivo) return
    const actualizado = {
      ...horarioActivo,
      entradas: serializarPaquetes(paquetes),
      actualizadoEn: Date.now(),
    }
    persistir(
      horariosGuardados.map((h) => (h.id === actualizado.id ? actualizado : h)),
      `Cambios guardados en "${actualizado.nombre}".`,
    )
  }, [horarioActivo, paquetes, horariosGuardados, persistir])

  const abrirGuardado = useCallback((guardado) => {
    const { paquetes: recuperados, faltantes } = rehidratar(guardado, cursosPorNrc)
    setPaquetes(recuperados)
    setHorarioActivoId(guardado.id)
    setVista('horario')
    if (faltantes.length > 0) {
      notificar(
        `"${guardado.nombre}" se abrió sin ${faltantes.length} sección(es): los NRC ${faltantes.join(', ')} no están en el Excel cargado.`,
        'aviso',
      )
    } else {
      notificar(`Horario "${guardado.nombre}" abierto.`)
    }
  }, [cursosPorNrc, notificar])

  const eliminarGuardado = useCallback((guardado) => {
    if (persistir(
      horariosGuardados.filter((h) => h.id !== guardado.id),
      `Horario "${guardado.nombre}" eliminado.`,
    )) {
      if (horarioActivoId === guardado.id) setHorarioActivoId(null)
    }
  }, [horariosGuardados, horarioActivoId, persistir])

  const renombrarGuardado = useCallback((id, nombre) => {
    persistir(
      horariosGuardados.map((h) => (h.id === id ? { ...h, nombre, actualizadoEn: Date.now() } : h)),
      `Renombrado a "${nombre}".`,
    )
  }, [horariosGuardados, persistir])

  // Vaciar el horario a mano lo desliga del guardado, para no sobrescribirlo sin querer.
  useEffect(() => {
    if (paquetes.length === 0) setHorarioActivoId(null)
  }, [paquetes.length])

  const cursoDetalle = nrcDetalle ? cursosPorNrc.get(nrcDetalle) : null

  return (
    <div className="min-h-screen bg-papel text-tinta">
      <Avisos avisos={avisos} />

      <header className="border-b border-linea bg-hoja">
        <div className="mx-auto flex max-w-[1760px] flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[19px] font-bold leading-none tracking-[-0.02em]">
              Horario <span className="text-verde">USS</span>
            </h1>
            <p className="hidden text-[13px] text-apagado sm:block">
              Arma tu horario sin topes.
            </p>
          </div>
          {datos && (
            <div className="flex items-center gap-3 text-[13px]">
              <span className="hidden text-apagado md:inline">
                <span className="tabular">{datos.cursos.length}</span> secciones ·{' '}
                {datos.nombreArchivo}
              </span>
              <button
                type="button"
                onClick={() => { setDatos(null); setPaquetes([]) }}
                className="rounded border border-linea px-2.5 py-1 font-medium text-apagado transition-colors hover:border-verde-borde hover:bg-verde-suave hover:text-verde"
              >
                Cargar otro Excel
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[1760px] px-5 py-6">
        {!datos ? (
          <div className="mx-auto max-w-xl pt-16">
            <FileUpload onCargado={setDatos} />
            {horariosGuardados.length > 0 && (
              <p className="mt-4 text-center text-[13px] text-apagado">
                Tienes <span className="tabular font-medium text-tinta">{horariosGuardados.length}</span>{' '}
                horario{horariosGuardados.length === 1 ? '' : 's'} guardado
                {horariosGuardados.length === 1 ? '' : 's'}. Sube el Excel para abrirlos.
              </p>
            )}
          </div>
        ) : (
          <>
            {datos.warnings.length > 0 && (
              <div className="mb-4 rounded border-l-2 border-tolerado bg-tolerado-suave px-3 py-2 text-[13px] text-tolerado">
                {datos.warnings.map((w, i) => <p key={i}>{w}</p>)}
              </div>
            )}

            <nav className="mb-5 flex gap-6 border-b border-linea">
              {VISTAS.map((v) => {
                const activa = vista === v.id
                const cuenta = v.id === 'horario'
                  ? paquetes.length
                  : v.id === 'guardados' ? horariosGuardados.length : 0
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVista(v.id)}
                    aria-current={activa ? 'page' : undefined}
                    className={`-mb-px border-b-2 pb-2.5 text-[13px] font-medium transition-colors ${
                      activa
                        ? 'border-verde text-verde'
                        : 'border-transparent text-apagado hover:text-tinta'
                    }`}
                  >
                    {v.etiqueta}
                    {cuenta > 0 && (
                      <span className={`tabular ml-1.5 text-[12px] ${activa ? 'text-verde' : 'text-tenue'}`}>
                        {cuenta}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>

            {vista === 'horario' && (
              <ScheduleView
                cursos={datos.cursos}
                franjas={datos.franjas}
                paquetes={paquetes}
                onQuitar={quitarPaquete}
                onVerDetalle={setNrcDetalle}
                onIrABuscar={() => setVista('buscar')}
                onCambiarPaquete={cambiarPaquete}
                onNotificar={notificar}
                horarioActivo={horarioActivo}
                hayCambiosSinGuardar={hayCambiosSinGuardar}
                onGuardarNuevo={guardarNuevo}
                onActualizarActivo={actualizarActivo}
                onNuevoHorario={nuevoHorario}
              />
            )}

            {vista === 'buscar' && (
              <CourseSearch
                cursos={datos.cursos}
                ramosSeleccionados={ramosSeleccionados}
                paquetes={paquetes}
                onAgregar={agregarSeccion}
                onAgregarIndependiente={agregarSeccionIndependiente}
                onQuitarRamo={quitarPaquete}
                onVerDetalle={setNrcDetalle}
              />
            )}

            {vista === 'auto' && (
              <AutoBuilder
                cursos={datos.cursos}
                ramosSeleccionados={ramosSeleccionados}
                onAplicar={aplicarSolucion}
                onNotificar={notificar}
              />
            )}

            {vista === 'guardados' && (
              <SavedSchedules
                horarios={horariosGuardados}
                cursosPorNrc={cursosPorNrc}
                franjas={datos.franjas}
                activoId={horarioActivoId}
                hayCambiosSinGuardar={hayCambiosSinGuardar}
                onAbrir={abrirGuardado}
                onEliminar={eliminarGuardado}
                onRenombrar={renombrarGuardado}
                onNuevoHorario={nuevoHorario}
                onNotificar={notificar}
              />
            )}

            <CourseDetail
              curso={cursoDetalle}
              cursosPorNrc={cursosPorNrc}
              paquetes={paquetes}
              onAgregar={agregarSeccion}
              onAgregarIndependiente={agregarSeccionIndependiente}
              onQuitarRamo={quitarPaquete}
              onCerrar={() => setNrcDetalle(null)}
              onVerDetalle={setNrcDetalle}
            />
          </>
        )}
      </main>

      {/* No renderiza nada: solo recolecta métricas de rendimiento en el despliegue de Vercel. */}
      <SpeedInsights />
    </div>
  )
}

export default App
