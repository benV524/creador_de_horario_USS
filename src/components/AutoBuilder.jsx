import { useMemo, useState } from 'react'
import { armarHorario, construirPaquetesPorRamo, describirPaquete } from '../lib/armador'

const norm = (s) => String(s ?? '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()

export default function AutoBuilder({ cursos, ramosSeleccionados, onAplicar, onNotificar }) {
  const [elegidos, setElegidos] = useState(() => [...ramosSeleccionados])
  const [filtro, setFiltro] = useState('')
  const [resultado, setResultado] = useState(null)

  const catalogo = useMemo(() => {
    const paquetesPorRamo = construirPaquetesPorRamo(cursos)
    const porNombre = new Map()
    for (const c of cursos) {
      if (!porNombre.has(c.nombre)) {
        porNombre.set(c.nombre, { nombre: c.nombre, tipos: new Set(), esInformatica: false })
      }
      const entrada = porNombre.get(c.nombre)
      entrada.tipos.add(c.tipo)
      if (c.esInformatica) entrada.esInformatica = true
    }
    return [...porNombre.values()]
      .map((r) => ({
        ...r,
        tipos: [...r.tipos].join(', '),
        opciones: paquetesPorRamo.get(r.nombre)?.length ?? 0,
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [cursos])

  const visibles = useMemo(() => {
    const f = norm(filtro)
    return f ? catalogo.filter((r) => norm(r.nombre).includes(f)) : catalogo
  }, [catalogo, filtro])

  const alternar = (nombre) => {
    setResultado(null)
    setElegidos((prev) =>
      prev.includes(nombre) ? prev.filter((n) => n !== nombre) : [...prev, nombre])
  }

  const armar = (forzar = false) => {
    if (elegidos.length === 0) return
    const r = armarHorario(elegidos, cursos, { forzar })
    setResultado(r)
    if (r.exito && r.topes === 0) {
      onNotificar(`Horario armado con ${r.paquetes.length} ramos y sin topes.`)
    } else if (r.exito && r.forzado) {
      onNotificar(`Horario armado con ${r.topes} tope(s). Revísalos y ajústalos a mano.`, 'aviso')
    } else if (r.exito) {
      onNotificar(`Horario armado con ${r.topes} tope(s) inevitables entre informática y servicio.`, 'aviso')
    } else {
      onNotificar('No se pudo armar un horario sin topes con esos ramos.', 'error')
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <section className="rounded border border-linea bg-hoja">
        <div className="border-b border-linea p-3">
          <h2 className="rotulo">Paso 1 — Elige los ramos</h2>
          <p className="mt-1 text-[13px] text-apagado">
            Marca el ramo, no la sección. La app prueba todas las combinaciones de secciones y
            ligas hasta encontrar una sin topes.
          </p>
          <input
            className="mt-2.5 w-full rounded border border-linea bg-hoja px-2.5 py-2 text-[13px] placeholder:text-tenue focus:border-verde focus:outline-none"
            placeholder="Filtrar ramos"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>
        <div className="max-h-[26rem] divide-y divide-linea-suave overflow-y-auto">
          {visibles.map((r) => {
            const marcado = elegidos.includes(r.nombre)
            return (
              <label
                key={r.nombre}
                className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-[13px] transition-colors hover:bg-papel ${
                  marcado ? 'bg-verde-suave' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={marcado}
                  onChange={() => alternar(r.nombre)}
                  className="h-3.5 w-3.5 accent-[#24503c]"
                />
                <span className="flex-1">{r.nombre}</span>
                {r.esInformatica && (
                  <span className="rotulo text-[9px] text-apagado">ICIF</span>
                )}
                <span className="tabular w-28 text-right text-[11px] text-tenue">
                  {r.opciones} {r.opciones === 1 ? 'combinación' : 'combinaciones'}
                </span>
              </label>
            )
          })}
          {visibles.length === 0 && (
            <p className="py-10 text-center text-[13px] text-apagado">Ningún ramo coincide.</p>
          )}
        </div>
      </section>

      <div className="space-y-4">
        <section className="rounded border border-linea bg-hoja">
          <h2 className="rotulo border-b border-linea px-3 py-2.5">
            Paso 2 — Armar ({elegidos.length})
          </h2>
          <div className="p-3">
            <div className="flex flex-wrap gap-1.5">
              {elegidos.map((n) => (
                <span
                  key={n}
                  className="inline-flex items-center gap-1.5 rounded-[3px] border border-verde-borde bg-verde-suave px-2 py-0.5 text-[11px] font-medium text-verde"
                >
                  {n}
                  <button type="button" onClick={() => alternar(n)} className="hover:opacity-60">✕</button>
                </span>
              ))}
              {elegidos.length === 0 && (
                <p className="text-[13px] text-apagado">Aún no marcas ningún ramo.</p>
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => armar(false)}
                disabled={elegidos.length === 0}
                className="flex-1 rounded bg-verde px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-verde-fuerte disabled:opacity-40"
              >
                Armar horario
              </button>
              {elegidos.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setElegidos([]); setResultado(null) }}
                  className="rounded border border-linea px-3 py-2 text-[13px] font-medium text-apagado transition-colors hover:border-verde-borde hover:text-verde"
                >
                  Vaciar
                </button>
              )}
            </div>
          </div>
        </section>

        {resultado && (
          <section className="rounded border border-linea bg-hoja">
            <h2 className="rotulo border-b border-linea px-3 py-2.5">Paso 3 — Resultado</h2>
            <div className="p-3">
              {resultado.exito ? (
                <>
                  <p className={`text-[13px] ${
                    resultado.topes === 0
                      ? 'text-verde'
                      : resultado.forzado ? 'text-tope' : 'text-tolerado'
                  }`}>
                    {resultado.topes === 0
                      ? 'Encontré una combinación sin ningún tope.'
                      : resultado.forzado
                        ? `Horario forzado con ${resultado.topes} tope(s): es la combinación con menos choques posibles. Ábrelo y ajústalo desde el panel de secciones.`
                        : `Combinación con ${resultado.topes} tope(s), solo entre informática y ramos de servicio.`}
                  </p>
                  <ul className="mt-2.5 divide-y divide-linea-suave border-y border-linea-suave">
                    {resultado.paquetes.map((p) => (
                      <li key={p.id} className="py-1.5 text-[12px]">
                        <span className="font-medium">{p.ramo}</span>
                        <span className="text-apagado"> — {describirPaquete(p)}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => onAplicar(resultado.paquetes)}
                    className="mt-3 w-full rounded bg-verde px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-verde-fuerte"
                  >
                    Usar este horario
                  </button>
                </>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-[13px] text-tope">{resultado.motivo}</p>

                  {resultado.incompatibles?.length > 0 && (
                    <ul className="space-y-1">
                      {resultado.incompatibles.map(([a, b], i) => (
                        <li key={i} className="rounded border-l-2 border-tope bg-tope-suave px-2.5 py-1.5 text-[12px] text-tope">
                          <strong className="font-semibold">{a}</strong> y{' '}
                          <strong className="font-semibold">{b}</strong> se pisan en todas sus secciones.
                        </li>
                      ))}
                    </ul>
                  )}

                  {resultado.grupoIncompatible?.length > 0 && (
                    <div className="rounded border-l-2 border-tope bg-tope-suave px-2.5 py-2 text-[12px] text-tope">
                      <p>Estos {resultado.grupoIncompatible.length} ramos no caben juntos:</p>
                      <ul className="mt-1 list-disc pl-4">
                        {resultado.grupoIncompatible.map((n) => (
                          <li key={n}><strong className="font-semibold">{n}</strong></li>
                        ))}
                      </ul>
                      <p className="mt-1 opacity-80">Por pares sí encajan. Basta con sacar uno.</p>
                    </div>
                  )}

                  <p className="text-[12px] text-apagado">
                    Saca uno de los ramos en conflicto y vuelve a armar, o arma el horario igual
                    y corrige los topes tú.
                  </p>

                  {resultado.sePuedeForzar && (
                    <button
                      type="button"
                      onClick={() => armar(true)}
                      className="w-full rounded border border-tolerado bg-tolerado-suave px-3 py-2 text-[12px] font-medium text-tolerado transition-colors hover:brightness-95"
                    >
                      Armar de todas formas, con topes
                    </button>
                  )}
                </div>
              )}

              {resultado.sinOpciones?.length > 0 && (
                <p className="mt-2 text-[12px] text-tolerado">
                  Sin secciones utilizables: {resultado.sinOpciones.join(', ')}.
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
