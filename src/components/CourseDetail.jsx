export default function CourseDetail({
  curso, cursosPorNrc, paquetes, onAgregar, onAgregarIndependiente, onQuitarRamo, onCerrar, onVerDetalle,
}) {
  if (!curso) return null

  const paqueteDelRamo = paquetes.find((p) => !p.esIndependiente && p.ramo === curso.nombre)
  const paqueteSuelto = paquetes.find((p) => p.esIndependiente && p.nrcs.includes(curso.nrc))
  const estaSeleccionada = paqueteDelRamo?.nrcs.includes(curso.nrc)
  const otraSeccionActiva = paqueteDelRamo && !estaSeleccionada

  return (
    <div
      className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-tinta/30 p-4"
      onClick={onCerrar}
    >
      <div
        className="mt-12 w-full max-w-lg rounded-2xl border border-linea bg-hoja tarjeta shadow-[0_8px_32px_rgba(26,31,28,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-linea px-4 py-3">
          <div>
            <p className="tabular text-[12px] text-tenue">NRC {curso.nrc}</p>
            <h3 className="mt-0.5 text-[16px] font-semibold leading-snug">{curso.nombre}</h3>
            <p className="mt-0.5 text-[13px] text-apagado">
              Sección <span className="tabular">{curso.seccion}</span> · {curso.componente} · {curso.tipo}
              {curso.esInformatica && (
                <span className="rotulo ml-1.5 text-[10px] text-azul">informática</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="text-[14px] leading-none text-tenue transition-colors hover:text-tinta"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 px-4 py-3">
          <div>
            <p className="rotulo">Cuándo</p>
            <ul className="mt-1 space-y-0.5">
              {curso.bloques.length === 0 && (
                <li className="text-[14px] text-tenue">Sin horario definido.</li>
              )}
              {curso.bloques.map((b, i) => (
                <li key={i} className="text-[14px]">
                  {b.diaNombre}{' '}
                  <span className="tabular text-apagado">{b.horaInicio} – {b.horaFin}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="rotulo">Quién la hace</p>
            <p className="mt-1 text-[14px]">{curso.profesorDisplay || 'No informado'}</p>
          </div>

          <div>
            <p className="rotulo">Secciones ligadas</p>
            {(!curso.liga && !curso.conector) && (
              <p className="mt-1 text-[14px] text-apagado">Esta sección se toma sola.</p>
            )}
            {(curso.liga || curso.conector) && curso.conectados.length === 0 && (
              <p className="mt-1 text-[14px] text-tolerado">
                Declara liga <span className="tabular">{curso.liga || '—'}</span> / conector{' '}
                <span className="tabular">{curso.conector || '—'}</span>, pero su pareja no está
                en el archivo.
              </p>
            )}
            {curso.conectados.length > 0 && (
              <>
                <p className="mt-1 mb-1.5 text-[13px] text-apagado">
                  Al agregar esta sección se suma automáticamente una de estas:
                </p>
                <ul className="divide-y divide-linea-suave border-y border-linea-suave">
                  {curso.conectados.map((nrc) => {
                    const conectado = cursosPorNrc.get(nrc)
                    if (!conectado) return null
                    const activa = paqueteDelRamo?.nrcs.includes(nrc)
                    return (
                      <li
                        key={nrc}
                        className={`flex items-center justify-between gap-2 px-1 py-1.5 text-[14px] ${
                          activa ? 'bg-azul-suave' : ''
                        }`}
                      >
                        <button
                          type="button"
                          className="text-left text-azul hover:underline"
                          onClick={() => onVerDetalle(nrc)}
                        >
                          <span className="tabular">{nrc}</span> · {conectado.componente}{' '}
                          <span className="tabular">{conectado.seccion}</span>
                        </button>
                        <span className="tabular text-[12px] text-tenue">
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
            <p className="rounded border-l-2 border-tolerado bg-tolerado-suave px-3 py-2 text-[13px] text-tolerado">
              Ya tienes este ramo con{' '}
              {paqueteDelRamo.secciones.map((s) => `${s.componente} ${s.seccion}`).join(' + ')}.
              Si agregas esta sección, reemplaza a la anterior.
            </p>
          )}
        </div>

        <div className="space-y-2 border-t border-linea px-4 py-3">
          {estaSeleccionada ? (
            <button
              type="button"
              onClick={() => { onQuitarRamo(paqueteDelRamo.clave); onCerrar() }}
              className="w-full rounded-full border border-tope px-3 py-2 text-[14px] font-medium text-tope transition-colors hover:bg-tope-suave"
            >
              Quitar {curso.nombre} del horario
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { onAgregar(curso.nrc); onCerrar() }}
              className="w-full rounded-full bg-azul px-3 py-2 text-[14px] font-medium text-white transition-colors hover:bg-azul-fuerte"
            >
              {otraSeccionActiva ? 'Cambiar a esta sección' : 'Agregar a mi horario'}
              {curso.conectados.length > 0 && ' con su liga'}
            </button>
          )}

          {paqueteSuelto ? (
            <button
              type="button"
              onClick={() => { onQuitarRamo(paqueteSuelto.clave); onCerrar() }}
              className="w-full rounded-full border border-linea px-3 py-2 text-[14px] font-medium text-apagado transition-colors hover:border-azul-borde hover:text-azul"
            >
              Quitar esta sección independiente
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { onAgregarIndependiente(curso.nrc); onCerrar() }}
              className="w-full rounded-full border border-linea px-3 py-2 text-[14px] font-medium text-apagado transition-colors hover:border-azul-borde hover:text-azul"
            >
              Agregar solo esta sección, sin su liga
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
