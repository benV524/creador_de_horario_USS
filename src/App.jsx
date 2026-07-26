import { useCallback, useMemo, useState } from 'react'
import FileUpload from './components/FileUpload'
import CourseSearch from './components/CourseSearch'
import CourseDetail from './components/CourseDetail'
import ScheduleView from './components/ScheduleView'
import AutoBuilder from './components/AutoBuilder'
import Avisos from './components/Avisos'
import { SpeedInsights } from '@vercel/speed-insights/react'
import {
  mejorPaqueteParaSeccion,
  construirPaqueteIndependiente,
  describirPaquete,
} from './lib/armador'

const VISTAS = [
  { id: 'horario', etiqueta: 'Mi horario' },
  { id: 'buscar', etiqueta: 'Buscar ramos' },
  { id: 'auto', etiqueta: 'Armado automático' },
]

function App() {
  const [datos, setDatos] = useState(null)
  const [vista, setVista] = useState('horario')
  const [paquetes, setPaquetes] = useState([])
  const [nrcDetalle, setNrcDetalle] = useState(null)
  const [avisos, setAvisos] = useState([])

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

  const cambiarPaquete = useCallback((claveAnterior, nuevo) => {
    setPaquetes((prev) => prev.map((p) => (p.clave === claveAnterior ? nuevo : p)))
    notificar(`${nuevo.ramo}: ahora tomas ${describirPaquete(nuevo)}.`)
  }, [notificar])

  const cursoDetalle = nrcDetalle ? cursosPorNrc.get(nrcDetalle) : null

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <Avisos avisos={avisos} />

      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-[1760px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Horarios ICIF</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Consulta la oferta y arma tu horario sin topes.
            </p>
          </div>
          {datos && (
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="hidden sm:inline">
                {datos.cursos.length} secciones · {datos.nombreArchivo}
              </span>
              <button
                type="button"
                onClick={() => { setDatos(null); setPaquetes([]) }}
                className="rounded-md border border-gray-300 px-2.5 py-1 font-medium hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Cargar otro Excel
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[1760px] px-4 py-6">
        {!datos ? (
          <div className="mx-auto max-w-2xl pt-10">
            <FileUpload onCargado={setDatos} />
          </div>
        ) : (
          <>
            {datos.warnings.length > 0 && (
              <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                {datos.warnings.map((w, i) => <p key={i}>{w}</p>)}
              </div>
            )}

            <nav className="mb-5 inline-flex rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-900">
              {VISTAS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVista(v.id)}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                    vista === v.id
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                >
                  {v.etiqueta}
                  {v.id === 'horario' && paquetes.length > 0 && (
                    <span className={`ml-1.5 ${vista === v.id ? 'text-purple-200' : 'text-gray-400'}`}>
                      {paquetes.length}
                    </span>
                  )}
                </button>
              ))}
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
