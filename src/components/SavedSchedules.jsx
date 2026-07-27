import { useEffect, useMemo, useRef, useState } from 'react'
import { rehidratar, contarSecciones, nombreDeArchivo } from '../lib/almacenamiento'
import { exportarPNG, exportarPDF } from '../lib/exportar'
import { describirPaquete } from '../lib/armador'

function fecha(marca) {
  if (!marca) return ''
  return new Date(marca).toLocaleDateString('es-CL', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default function SavedSchedules({
  horarios, cursosPorNrc, franjas, activoId, hayCambiosSinGuardar,
  onAbrir, onEliminar, onRenombrar, onNuevoHorario, onNotificar,
}) {
  const [menuAbierto, setMenuAbierto] = useState(null)
  const [editando, setEditando] = useState(null)
  const [nombreEditado, setNombreEditado] = useState('')
  const [confirmandoNuevo, setConfirmandoNuevo] = useState(false)
  const contenedorRef = useRef(null)

  const pedirNuevo = () => {
    if (hayCambiosSinGuardar) setConfirmandoNuevo(true)
    else onNuevoHorario()
  }

  useEffect(() => {
    if (!menuAbierto) return
    const alHacerClic = (e) => {
      if (!contenedorRef.current?.contains(e.target)) setMenuAbierto(null)
    }
    document.addEventListener('mousedown', alHacerClic)
    return () => document.removeEventListener('mousedown', alHacerClic)
  }, [menuAbierto])

  const reconstruidos = useMemo(
    () => horarios.map((h) => ({ guardado: h, ...rehidratar(h, cursosPorNrc) })),
    [horarios, cursosPorNrc],
  )

  const descargar = async (guardado, paquetes, formato) => {
    setMenuAbierto(null)
    if (paquetes.length === 0) {
      onNotificar('Ese horario no tiene ningún ramo que exista en el Excel cargado.', 'error')
      return
    }
    try {
      if (formato === 'png') {
        exportarPNG(paquetes, franjas, nombreDeArchivo(guardado.nombre, 'png'), guardado.nombre)
      } else {
        await exportarPDF(paquetes, franjas, nombreDeArchivo(guardado.nombre, 'pdf'), guardado.nombre)
      }
    } catch (err) {
      onNotificar(`No se pudo exportar: ${err.message}`, 'error')
    }
  }

  const confirmarNombre = (id) => {
    const limpio = nombreEditado.trim()
    if (limpio) onRenombrar(id, limpio)
    setEditando(null)
  }

  const barra = (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <p className="text-[14px] text-apagado">
        {horarios.length === 0
          ? 'Sin horarios guardados'
          : <><span className="tabular font-medium text-tinta">{horarios.length}</span> horario{horarios.length === 1 ? '' : 's'} guardado{horarios.length === 1 ? '' : 's'}</>}
      </p>
      <button
        type="button"
        onClick={pedirNuevo}
        className="rounded-full bg-azul px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-azul-fuerte"
      >
        Empezar uno nuevo
      </button>
    </div>
  )

  const aviso = confirmandoNuevo && (
    <div className="mb-3 rounded border-l-2 border-tolerado bg-tolerado-suave px-3 py-2.5">
      <p className="text-[13px] text-tolerado">
        El horario que tienes abierto no está guardado. Si empiezas de nuevo se pierde.
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => { setConfirmandoNuevo(false); onNuevoHorario() }}
          className="rounded-full bg-tolerado px-3 py-1 text-[13px] font-medium text-white hover:brightness-110"
        >
          Empezar de nuevo
        </button>
        <button
          type="button"
          onClick={() => setConfirmandoNuevo(false)}
          className="rounded-full border border-tolerado px-3 py-1 text-[13px] font-medium text-tolerado hover:bg-black/5"
        >
          Cancelar
        </button>
      </div>
    </div>
  )

  if (horarios.length === 0) {
    return (
      <div>
        {barra}
        {aviso}
        <div className="rounded-2xl border border-dashed border-linea bg-hoja py-20 text-center">
          <p className="text-[16px] font-semibold text-tinta">Todavía no guardas ningún horario</p>
          <p className="mt-1 text-[14px] text-apagado">
            Arma uno en "Mi horario" y ponle nombre en el panel <strong>Guardar</strong>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div ref={contenedorRef}>
      {barra}
      {aviso}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {reconstruidos.map(({ guardado, paquetes, faltantes }) => {
          const esActivo = guardado.id === activoId
          return (
            <article
              key={guardado.id}
              className={`flex flex-col rounded-2xl border bg-hoja tarjeta ${
                esActivo ? 'border-azul-borde' : 'border-linea'
              }`}
            >
              <div className="flex items-start justify-between gap-2 border-b border-linea px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  {editando === guardado.id ? (
                    <input
                      autoFocus
                      value={nombreEditado}
                      onChange={(e) => setNombreEditado(e.target.value)}
                      onBlur={() => confirmarNombre(guardado.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') confirmarNombre(guardado.id)
                        if (e.key === 'Escape') setEditando(null)
                      }}
                      className="w-full rounded border border-azul px-2 py-1 text-[14px] font-semibold focus:outline-none"
                    />
                  ) : (
                    <h3 className="truncate text-[14px] font-semibold" title={guardado.nombre}>
                      {guardado.nombre}
                    </h3>
                  )}
                  <p className="mt-0.5 text-[12px] text-tenue">
                    <span className="tabular">{paquetes.length}</span> ramos ·{' '}
                    <span className="tabular">{contarSecciones(guardado)}</span> secciones ·{' '}
                    <span className="tabular">{fecha(guardado.actualizadoEn)}</span>
                  </p>
                </div>
                {esActivo && <span className="rotulo shrink-0 text-[10px] text-azul">abierto</span>}
              </div>

              <ul className="flex-1 space-y-0.5 px-3 py-2.5">
                {paquetes.slice(0, 5).map((p) => (
                  <li key={p.clave} className="truncate text-[13px] text-apagado">
                    {p.ramo} <span className="text-tenue">· {describirPaquete(p)}</span>
                  </li>
                ))}
                {paquetes.length > 5 && (
                  <li className="text-[13px] text-tenue">y {paquetes.length - 5} más…</li>
                )}
                {paquetes.length === 0 && (
                  <li className="text-[13px] text-tope">
                    Ningún NRC de este horario existe en el Excel cargado.
                  </li>
                )}
              </ul>

              {faltantes.length > 0 && (
                <p className="mx-3 mb-2 rounded border-l-2 border-tolerado bg-tolerado-suave px-2 py-1 text-[12px] text-tolerado">
                  Faltan <span className="tabular">{faltantes.length}</span> NRC:{' '}
                  <span className="tabular">{faltantes.slice(0, 4).join(', ')}</span>
                  {faltantes.length > 4 && '…'}
                </p>
              )}

              <div className="flex items-center gap-1.5 border-t border-linea px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => onAbrir(guardado)}
                  disabled={paquetes.length === 0}
                  className="flex-1 rounded-full bg-azul px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-azul-fuerte disabled:opacity-40"
                >
                  Abrir
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuAbierto(menuAbierto === guardado.id ? null : guardado.id)}
                    disabled={paquetes.length === 0}
                    aria-expanded={menuAbierto === guardado.id}
                    className="rounded-full border border-linea px-2.5 py-1.5 text-[13px] font-medium text-apagado transition-colors hover:border-azul-borde hover:text-azul disabled:opacity-40"
                  >
                    Descargar ▾
                  </button>
                  {menuAbierto === guardado.id && (
                    <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-2xl border border-linea bg-hoja tarjeta shadow-[0_4px_12px_rgba(26,31,28,0.12)]">
                      <button
                        type="button"
                        onClick={() => descargar(guardado, paquetes, 'png')}
                        className="block w-full px-3 py-2 text-left text-[13px] transition-colors hover:bg-azul-suave"
                      >
                        Imagen PNG
                      </button>
                      <button
                        type="button"
                        onClick={() => descargar(guardado, paquetes, 'pdf')}
                        className="block w-full border-t border-linea px-3 py-2 text-left text-[13px] transition-colors hover:bg-azul-suave"
                      >
                        Documento PDF
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => { setEditando(guardado.id); setNombreEditado(guardado.nombre) }}
                  title="Cambiar el nombre"
                  className="rounded-full border border-linea px-2 py-1.5 text-[13px] text-apagado transition-colors hover:border-azul-borde hover:text-azul"
                >
                  Nombre
                </button>
                <button
                  type="button"
                  onClick={() => onEliminar(guardado)}
                  title="Eliminar este horario"
                  className="rounded-full border border-linea px-2 py-1.5 text-[13px] text-apagado transition-colors hover:border-tope hover:text-tope"
                >
                  Borrar
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
