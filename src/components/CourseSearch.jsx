import { useMemo, useState } from 'react'
import { DIAS, hhmmAMinutos } from '../lib/parseExcel'

const norm = (s) => String(s ?? '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()

const CAMPO = 'rounded-xl border border-linea bg-hoja px-2.5 py-2 text-[14px] placeholder:text-tenue focus:border-azul focus:outline-none'

function Bloques({ bloques }) {
  if (bloques.length === 0) return <span className="text-tenue">Sin horario</span>
  return (
    <span className="flex flex-wrap gap-1">
      {bloques.map((b, i) => (
        <span key={i} className="tabular rounded-lg bg-fondo px-1.5 py-0.5 text-[12px] text-apagado">
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
      <div className="rounded-2xl border border-linea bg-hoja tarjeta p-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <input
            className={CAMPO}
            placeholder="Ramo, sección o NRC"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <input
            className={CAMPO}
            placeholder="Profesor"
            value={profesor}
            onChange={(e) => setProfesor(e.target.value)}
          />
          <select className={CAMPO} value={componente} onChange={(e) => setComponente(e.target.value)}>
            <option value="">Todos los componentes</option>
            {componentes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className={CAMPO} value={dia} onChange={(e) => setDia(e.target.value)}>
            <option value="">Todos los días</option>
            {DIAS.map((d) => <option key={d.letra} value={d.letra}>{d.nombre}</option>)}
          </select>
          <div className="flex items-center gap-2 sm:col-span-2">
            <span className="whitespace-nowrap text-[13px] text-apagado">Empieza entre</span>
            <input type="time" className={`${CAMPO} tabular w-full`} value={horaDesde} onChange={(e) => setHoraDesde(e.target.value)} />
            <span className="text-[13px] text-tenue">y</span>
            <input type="time" className={`${CAMPO} tabular w-full`} value={horaHasta} onChange={(e) => setHoraHasta(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <p className="flex-1 text-[14px] text-apagado">
              <span className="tabular font-medium text-tinta">{grupos.length}</span> ramos ·{' '}
              <span className="tabular">{totalSecciones}</span> secciones
            </p>
            {hayFiltros && (
              <button
                type="button"
                onClick={limpiar}
                className="rounded-full border border-linea px-3 py-2 text-[13px] font-medium text-apagado transition-colors hover:border-azul-borde hover:bg-azul-suave hover:text-azul"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        {grupos.map((g) => {
          const enHorario = ramosSeleccionados.includes(g.nombre)
          const abierto = abiertos.has(g.nombre) || (hayFiltros && grupos.length <= 5)
          const paquete = paquetes.find((p) => p.ramo === g.nombre)

          return (
            <div
              key={g.nombre}
              className={`overflow-hidden rounded-2xl border bg-hoja tarjeta ${
                enHorario ? 'border-azul-borde' : 'border-linea'
              }`}
            >
              <button
                type="button"
                onClick={() => alternar(g.nombre)}
                aria-expanded={abierto}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-fondo"
              >
                <span className={`text-[11px] text-tenue transition-transform ${abierto ? 'rotate-90' : ''}`}>▶</span>
                <span className="flex-1">
                  <span className="block text-[14px] font-semibold leading-snug">{g.nombre}</span>
                  <span className="block text-[13px] text-apagado">
                    {g.tipos} · <span className="tabular">{g.secciones.length}</span> secciones
                  </span>
                </span>
                {enHorario && (
                  <span className="rotulo shrink-0 text-[10px] text-azul">en tu horario</span>
                )}
              </button>

              {abierto && (
                <div className="border-t border-linea">
                  {enHorario && paquete && (
                    <div className="flex items-center justify-between gap-2 border-b border-linea bg-azul-suave px-3 py-1.5 text-[13px] text-azul">
                      <span>Estás tomando {describir(paquete)}</span>
                      <button
                        type="button"
                        onClick={() => onQuitarRamo(paquete.clave)}
                        className="font-medium hover:underline"
                      >
                        Quitar
                      </button>
                    </div>
                  )}
                  <table className="w-full">
                    <tbody className="divide-y divide-linea-suave">
                      {g.secciones.map((c) => {
                        const activa = nrcsSeleccionados.has(c.nrc)
                        return (
                          <tr key={c.nrc} className={activa ? 'bg-azul-suave/50' : ''}>
                            <td className="w-20 px-3 py-2 align-top">
                              <button
                                type="button"
                                onClick={() => onVerDetalle(c.nrc)}
                                className="tabular text-[13px] text-azul hover:underline"
                              >
                                {c.nrc}
                              </button>
                            </td>
                            <td className="w-24 px-2 py-2 align-top text-[13px]">
                              <span className="font-medium">{c.componente}</span>{' '}
                              <span className="tabular">{c.seccion}</span>
                            </td>
                            <td className="px-2 py-2 align-top"><Bloques bloques={c.bloques} /></td>
                            <td className="px-2 py-2 align-top text-[13px] text-apagado">
                              {c.profesorDisplay || '—'}
                            </td>
                            <td className="w-44 px-3 py-2 text-right align-top">
                              {activa ? (
                                <span className="rotulo text-[10px] text-azul">elegida</span>
                              ) : (
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => onAgregar(c.nrc)}
                                    className="rounded-full bg-azul px-2.5 py-1 text-[13px] font-medium text-white transition-colors hover:bg-azul-fuerte"
                                    title={c.conectados.length > 0
                                      ? 'Agrega la sección junto con su liga'
                                      : 'Agrega la sección'}
                                  >
                                    {enHorario ? 'Cambiar' : 'Agregar'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onAgregarIndependiente(c.nrc)}
                                    className="rounded-full border border-linea px-2 py-1 text-[13px] font-medium text-apagado transition-colors hover:border-azul-borde hover:text-azul"
                                    title="Agrega solo esta sección, sin su liga y sin reemplazar el ramo que ya tengas"
                                  >
                                    Suelta
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
          <div className="rounded-2xl border border-dashed border-linea bg-hoja py-14 text-center">
            <p className="text-[14px] font-medium text-tinta">Ningún ramo coincide</p>
            <p className="mt-1 text-[13px] text-apagado">Prueba con menos filtros.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function describir(paquete) {
  return paquete.secciones.map((s) => `${s.componente} ${s.seccion}`).join(' + ')
}
