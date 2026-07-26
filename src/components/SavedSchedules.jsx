import { useEffect, useMemo, useRef, useState } from 'react'
import { rehidratar, contarSecciones, nombreDeArchivo } from '../lib/almacenamiento'
import { exportarPNG, exportarPDF } from '../lib/exportar'
import { describirPaquete } from '../lib/armador'

function Fecha({ marca }) {
  if (!marca) return null
  const f = new Date(marca)
  return (
    <span>
      {f.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
    </span>
  )
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

  // Cerrar el menú de descarga al hacer clic fuera.
  useEffect(() => {
    if (!menuAbierto) return
    const alHacerClic = (e) => {
      if (!contenedorRef.current?.contains(e.target)) setMenuAbierto(null)
    }
    document.addEventListener('mousedown', alHacerClic)
    return () => document.removeEventListener('mousedown', alHacerClic)
  }, [menuAbierto])

  // Se reconstruye cada horario para poder mostrar sus ramos y exportarlo sin abrirlo.
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
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {horarios.length === 0
          ? 'Sin horarios guardados'
          : `${horarios.length} horario${horarios.length === 1 ? '' : 's'} guardado${horarios.length === 1 ? '' : 's'}`}
      </p>
      <button
        type="button"
        onClick={pedirNuevo}
        className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
      >
        + Nuevo horario
      </button>
    </div>
  )

  const aviso = confirmandoNuevo && (
    <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/40">
      <p className="text-xs text-amber-800 dark:text-amber-300">
        El horario que tienes abierto no está guardado. Si empiezas uno nuevo se pierde.
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => { setConfirmandoNuevo(false); onNuevoHorario() }}
          className="rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700"
        >
          Empezar de nuevo
        </button>
        <button
          type="button"
          onClick={() => setConfirmandoNuevo(false)}
          className="rounded-md border border-amber-400 px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-950"
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
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Todavía no has guardado ningún horario.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Arma uno en "Mi horario" y usa el botón <strong>Guardar horario</strong>.
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
          <div
            key={guardado.id}
            className={`flex flex-col rounded-xl border bg-white p-3 dark:bg-gray-900 ${
              esActivo
                ? 'border-purple-400 dark:border-purple-600'
                : 'border-gray-200 dark:border-gray-800'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
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
                    className="w-full rounded-md border border-purple-400 px-2 py-1 text-sm font-semibold dark:bg-gray-950"
                  />
                ) : (
                  <h3 className="truncate text-sm font-semibold" title={guardado.nombre}>
                    {guardado.nombre}
                  </h3>
                )}
                <p className="mt-0.5 text-[11px] text-gray-400">
                  {paquetes.length} ramos · {contarSecciones(guardado)} secciones ·{' '}
                  <Fecha marca={guardado.actualizadoEn} />
                </p>
              </div>
              {esActivo && (
                <span className="shrink-0 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                  Abierto
                </span>
              )}
            </div>

            <ul className="mt-2 flex-1 space-y-0.5">
              {paquetes.slice(0, 5).map((p) => (
                <li key={p.clave} className="truncate text-[11px] text-gray-600 dark:text-gray-400">
                  {p.ramo} <span className="text-gray-400">· {describirPaquete(p)}</span>
                </li>
              ))}
              {paquetes.length > 5 && (
                <li className="text-[11px] text-gray-400">y {paquetes.length - 5} más…</li>
              )}
              {paquetes.length === 0 && (
                <li className="text-[11px] text-red-500">
                  Ningún NRC de este horario existe en el Excel cargado.
                </li>
              )}
            </ul>

            {faltantes.length > 0 && (
              <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-[10px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                No se encontraron {faltantes.length} NRC: {faltantes.slice(0, 4).join(', ')}
                {faltantes.length > 4 && '…'}
              </p>
            )}

            <div className="mt-3 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onAbrir(guardado)}
                disabled={paquetes.length === 0}
                className="flex-1 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-40"
              >
                Abrir
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuAbierto(menuAbierto === guardado.id ? null : guardado.id)}
                  disabled={paquetes.length === 0}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Descargar ▾
                </button>
                {menuAbierto === guardado.id && (
                  <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <button
                      type="button"
                      onClick={() => descargar(guardado, paquetes, 'png')}
                      className="block w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Imagen (PNG)
                    </button>
                    <button
                      type="button"
                      onClick={() => descargar(guardado, paquetes, 'pdf')}
                      className="block w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Documento (PDF)
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => { setEditando(guardado.id); setNombreEditado(guardado.nombre) }}
                title="Renombrar"
                className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                ✎
              </button>
              <button
                type="button"
                onClick={() => onEliminar(guardado)}
                title="Eliminar"
                className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-500 hover:bg-red-50 hover:text-red-600 dark:border-gray-700 dark:hover:bg-red-950/40"
              >
                🗑
              </button>
            </div>
          </div>
        )
      })}
      </div>
    </div>
  )
}
