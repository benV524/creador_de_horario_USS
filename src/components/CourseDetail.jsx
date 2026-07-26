export default function CourseDetail({
  curso, cursosPorNrc, paquetes, onAgregar, onAgregarIndependiente, onQuitarRamo, onCerrar, onVerDetalle,
}) {
  if (!curso) return null

  const paqueteDelRamo = paquetes.find((p) => !p.esIndependiente && p.ramo === curso.nombre)
  const paqueteSuelto = paquetes.find((p) => p.esIndependiente && p.nrcs.includes(curso.nrc))
  const estaSeleccionada = paqueteDelRamo?.nrcs.includes(curso.nrc)
  const otraSeccionActiva = paqueteDelRamo && !estaSeleccionada

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onCerrar}>
      <div
        className="mt-10 w-full max-w-lg rounded-xl bg-white p-5 shadow-xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-gray-400">NRC {curso.nrc}</p>
            <h3 className="text-lg font-semibold">{curso.nombre}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sección {curso.seccion} · {curso.componente} · {curso.tipo}
              {curso.esInformatica && (
                <span className="ml-2 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                  Informática
                </span>
              )}
            </p>
          </div>
          <button type="button" onClick={onCerrar} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Bloques</p>
          <ul className="mt-1 space-y-1">
            {curso.bloques.length === 0 && <li className="text-sm text-gray-400">Sin horario definido.</li>}
            {curso.bloques.map((b, i) => (
              <li key={i} className="text-sm text-gray-700 dark:text-gray-300">
                {b.diaNombre}: {b.horaInicio} – {b.horaFin}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Profesor(es)</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{curso.profesorDisplay || 'No informado'}</p>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Secciones ligadas</p>
          {(!curso.liga && !curso.conector) && (
            <p className="text-sm text-gray-400">Esta sección no tiene liga: se toma sola.</p>
          )}
          {(curso.liga || curso.conector) && curso.conectados.length === 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Declara liga {curso.liga || '—'} / conector {curso.conector || '—'}, pero la sección
              asociada no está en el archivo.
            </p>
          )}
          {curso.conectados.length > 0 && (
            <>
              <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                Al agregar esta sección se suma automáticamente una de estas:
              </p>
              <ul className="space-y-1">
                {curso.conectados.map((nrc) => {
                  const conectado = cursosPorNrc.get(nrc)
                  if (!conectado) return null
                  const activa = paqueteDelRamo?.nrcs.includes(nrc)
                  return (
                    <li
                      key={nrc}
                      className={`flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm ${
                        activa ? 'bg-purple-50 dark:bg-purple-950/30' : 'bg-gray-50 dark:bg-gray-800'
                      }`}
                    >
                      <button
                        type="button"
                        className="text-left text-purple-600 hover:underline dark:text-purple-400"
                        onClick={() => onVerDetalle(nrc)}
                      >
                        NRC {nrc} · {conectado.componente} {conectado.seccion}
                      </button>
                      <span className="text-xs text-gray-400">
                        {conectado.bloques.map((b) => `${b.dia} ${b.horaInicio}`).join(', ') || 'sin horario'}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>

        {otraSeccionActiva && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            Ya tienes este ramo con {paqueteDelRamo.secciones.map((s) => `${s.componente} ${s.seccion}`).join(' + ')}.
            Si agregas esta sección, reemplazará a la anterior.
          </p>
        )}

        <div className="mt-4 space-y-2">
          {estaSeleccionada ? (
            <button
              type="button"
              onClick={() => { onQuitarRamo(paqueteDelRamo.clave); onCerrar() }}
              className="w-full rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-200 dark:bg-red-950 dark:text-red-300"
            >
              Quitar {curso.nombre} del horario
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { onAgregar(curso.nrc); onCerrar() }}
              className="w-full rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              {otraSeccionActiva ? 'Cambiar a esta sección' : 'Agregar a mi horario'}
              {curso.conectados.length > 0 && ' (con su liga)'}
            </button>
          )}

          {paqueteSuelto ? (
            <button
              type="button"
              onClick={() => { onQuitarRamo(paqueteSuelto.clave); onCerrar() }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Quitar esta sección independiente
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { onAgregarIndependiente(curso.nrc); onCerrar() }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Agregar como ramo independiente
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
