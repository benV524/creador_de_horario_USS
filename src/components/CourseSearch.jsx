import { useMemo, useState } from 'react'
import { DIAS, hhmmAMinutos } from '../lib/parseExcel'

const norm = (s) => String(s ?? '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()

function ChipDia({ bloques }) {
  if (bloques.length === 0) return <span className="text-gray-400">Sin horario</span>
  return (
    <span className="flex flex-wrap gap-1">
      {bloques.map((b, i) => (
        <span key={i} className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          {b.dia} {b.horaInicio}–{b.horaFin}
        </span>
      ))}
    </span>
  )
}

export default function CourseSearch({
  cursos, ramosSeleccionados, paquetes, onAgregar, onAgregarIndependiente, onQuitarRamo, onVerDetalle,
}) {
  const [q, setQ] = useState('')
  const [componente, setComponente] = useState('')
  const [profesor, setProfesor] = useState('')
  const [dia, setDia] = useState('')
  const [horaDesde, setHoraDesde] = useState('')
  const [horaHasta, setHoraHasta] = useState('')
  const [abiertos, setAbiertos] = useState(() => new Set())

  const componentes = useMemo(
    () => [...new Set(cursos.map((c) => c.componente))].sort(),
    [cursos],
  )

  const nrcsSeleccionados = useMemo(
    () => new Set(paquetes.flatMap((p) => p.nrcs)),
    [paquetes],
  )

  const grupos = useMemo(() => {
    const qNorm = norm(q)
    const profNorm = norm(profesor)
    const desdeMin = horaDesde ? hhmmAMinutos(horaDesde) : null
    const hastaMin = horaHasta ? hhmmAMinutos(horaHasta) : null

    const coincide = (c) => {
      if (componente && c.componente !== componente) return false
      if (qNorm && !(norm(c.nombre).includes(qNorm) || norm(c.seccion).includes(qNorm) || c.nrc.includes(q.trim()))) return false
      if (profNorm && !norm(c.profesorDisplay).includes(profNorm)) return false
      if (dia && !c.bloques.some((b) => b.dia === dia)) return false
      if (desdeMin !== null || hastaMin !== null) {
        const encaja = c.bloques.some((b) => {
          if (b.horaInicioMin === null) return false
          if (desdeMin !== null && b.horaInicioMin < desdeMin) return false
          if (hastaMin !== null && b.horaInicioMin > hastaMin) return false
          return true
        })
        if (!encaja) return false
      }
      return true
    }

    const porRamo = new Map()
    for (const c of cursos) {
      if (!coincide(c)) continue
      if (!porRamo.has(c.nombre)) porRamo.set(c.nombre, [])
      porRamo.get(c.nombre).push(c)
    }

    return [...porRamo.entries()]
      .map(([nombre, secciones]) => ({
        nombre,
        secciones: secciones.sort((a, b) =>
          a.componente.localeCompare(b.componente) || a.seccion.localeCompare(b.seccion)),
        tipos: [...new Set(secciones.map((s) => s.tipo))].join(', '),
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [cursos, q, componente, profesor, dia, horaDesde, horaHasta])

  const totalSecciones = grupos.reduce((n, g) => n + g.secciones.length, 0)

  const alternar = (nombre) => {
    setAbiertos((prev) => {
      const copia = new Set(prev)
      if (copia.has(nombre)) copia.delete(nombre)
      else copia.add(nombre)
      return copia
    })
  }

  const limpiar = () => {
    setQ(''); setComponente(''); setProfesor(''); setDia(''); setHoraDesde(''); setHoraHasta('')
  }

  const hayFiltros = q || componente || profesor || dia || horaDesde || horaHasta

  return (
    <div>
      <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <input
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
            placeholder="Ramo, sección o NRC…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <input
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
            placeholder="Profesor…"
            value={profesor}
            onChange={(e) => setProfesor(e.target.value)}
          />
          <select
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
            value={componente}
            onChange={(e) => setComponente(e.target.value)}
          >
            <option value="">Todos los componentes</option>
            {componentes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
            value={dia}
            onChange={(e) => setDia(e.target.value)}
          >
            <option value="">Todos los días</option>
            {DIAS.map((d) => <option key={d.letra} value={d.letra}>{d.nombre}</option>)}
          </select>
          <div className="flex items-center gap-2 sm:col-span-2">
            <span className="whitespace-nowrap text-xs text-gray-500">Empieza entre</span>
            <input
              type="time"
              className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              value={horaDesde}
              onChange={(e) => setHoraDesde(e.target.value)}
            />
            <span className="text-xs text-gray-400">y</span>
            <input
              type="time"
              className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              value={horaHasta}
              onChange={(e) => setHoraHasta(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <p className="flex-1 text-sm text-gray-500 dark:text-gray-400">
              {grupos.length} ramos · {totalSecciones} secciones
            </p>
            {hayFiltros && (
              <button
                type="button"
                onClick={limpiar}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {grupos.map((g) => {
          const enHorario = ramosSeleccionados.includes(g.nombre)
          const abierto = abiertos.has(g.nombre) || (hayFiltros && grupos.length <= 5)
          const paquete = paquetes.find((p) => p.ramo === g.nombre)

          return (
            <div
              key={g.nombre}
              className={`overflow-hidden rounded-xl border bg-white dark:bg-gray-900 ${
                enHorario
                  ? 'border-purple-300 dark:border-purple-800'
                  : 'border-gray-200 dark:border-gray-800'
              }`}
            >
              <button
                type="button"
                onClick={() => alternar(g.nombre)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60"
              >
                <span className={`text-xs text-gray-400 transition-transform ${abierto ? 'rotate-90' : ''}`}>▶</span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{g.nombre}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {g.tipos} · {g.secciones.length} secciones
                  </span>
                </span>
                {enHorario && (
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-medium text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                    En tu horario
                  </span>
                )}
              </button>

              {abierto && (
                <div className="border-t border-gray-100 dark:border-gray-800">
                  {enHorario && paquete && (
                    <div className="flex items-center justify-between gap-2 bg-purple-50 px-3 py-1.5 text-xs text-purple-800 dark:bg-purple-950/40 dark:text-purple-300">
                      <span>
                        Tomando {paquete.secciones.map((s) => `${s.componente} ${s.seccion}`).join(' + ')}
                      </span>
                      <button
                        type="button"
                        onClick={() => onQuitarRamo(g.nombre)}
                        className="font-medium underline"
                      >
                        Quitar ramo
                      </button>
                    </div>
                  )}
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {g.secciones.map((c) => {
                        const activa = nrcsSeleccionados.has(c.nrc)
                        return (
                          <tr key={c.nrc} className={activa ? 'bg-purple-50/60 dark:bg-purple-950/20' : ''}>
                            <td className="w-20 px-3 py-2 align-top">
                              <button
                                type="button"
                                onClick={() => onVerDetalle(c.nrc)}
                                className="font-mono text-xs text-purple-600 hover:underline dark:text-purple-400"
                              >
                                {c.nrc}
                              </button>
                            </td>
                            <td className="w-24 px-2 py-2 align-top text-xs">
                              <span className="font-medium">{c.componente}</span> {c.seccion}
                            </td>
                            <td className="px-2 py-2 align-top">
                              <ChipDia bloques={c.bloques} />
                            </td>
                            <td className="px-2 py-2 align-top text-xs text-gray-500 dark:text-gray-400">
                              {c.profesorDisplay || '—'}
                            </td>
                            <td className="w-40 px-3 py-2 text-right align-top">
                              {activa ? (
                                <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400">
                                  Seleccionada
                                </span>
                              ) : (
                                <div className="flex justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => onAgregar(c.nrc)}
                                    className="rounded-md bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700 hover:bg-purple-200 dark:bg-purple-950 dark:text-purple-300"
                                    title={c.conectados.length > 0
                                      ? 'Agrega la sección junto con su liga'
                                      : 'Agrega la sección'}
                                  >
                                    {enHorario ? 'Cambiar' : 'Agregar'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onAgregarIndependiente(c.nrc)}
                                    className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                    title="Agrega esta sección por su cuenta: sin arrastrar su liga y sin reemplazar el ramo que ya tengas"
                                  >
                                    + Independiente
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}

        {grupos.length === 0 && (
          <p className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-400 dark:border-gray-700">
            Sin resultados con estos filtros.
          </p>
        )}
      </div>
    </div>
  )
}
