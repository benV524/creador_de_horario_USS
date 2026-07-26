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
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-100 p-3 dark:border-gray-800">
          <h2 className="text-sm font-semibold">1. Elige los ramos que quieres cursar</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Marca el ramo, no la sección. La app prueba todas las combinaciones de secciones y ligas
            para encontrar una sin topes.
          </p>
          <input
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
            placeholder="Filtrar ramos…"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>
        <div className="max-h-[26rem] overflow-y-auto p-2">
          {visibles.map((r) => {
            const marcado = elegidos.includes(r.nombre)
            return (
              <label
                key={r.nombre}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/60 ${
                  marcado ? 'bg-purple-50 dark:bg-purple-950/30' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={marcado}
                  onChange={() => alternar(r.nombre)}
                  className="h-4 w-4 accent-purple-600"
                />
                <span className="flex-1">{r.nombre}</span>
                {r.esInformatica && (
                  <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                    ICIF
                  </span>
                )}
                <span className="w-24 text-right text-[11px] text-gray-400">
                  {r.opciones} {r.opciones === 1 ? 'combinación' : 'combinaciones'}
                </span>
              </label>
            )
          })}
          {visibles.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">Ningún ramo coincide.</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-sm font-semibold">2. Armar</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {elegidos.length} ramo{elegidos.length === 1 ? '' : 's'} seleccionado{elegidos.length === 1 ? '' : 's'}
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {elegidos.map((n) => (
              <span
                key={n}
                className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-medium text-purple-800 dark:bg-purple-950 dark:text-purple-300"
              >
                {n}
                <button type="button" onClick={() => alternar(n)} className="hover:opacity-60">✕</button>
              </span>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => armar(false)}
              disabled={elegidos.length === 0}
              className="flex-1 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-40"
            >
              Armar horario
            </button>
            {elegidos.length > 0 && (
              <button
                type="button"
                onClick={() => { setElegidos([]); setResultado(null) }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Vaciar
              </button>
            )}
          </div>
        </div>

        {resultado && (
          <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-sm font-semibold">3. Resultado</h2>

            {resultado.exito ? (
              <>
                <p className={`mt-1 text-xs ${
                  resultado.topes === 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : resultado.forzado
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {resultado.topes === 0
                    ? 'Combinación encontrada sin ningún tope.'
                    : resultado.forzado
                      ? `Horario forzado con ${resultado.topes} tope(s). Es la combinación con menos choques posibles: ábrelo y ajústalo a mano desde el panel de secciones.`
                      : `Combinación con ${resultado.topes} tope(s), solo entre informática y ramos de servicio.`}
                </p>
                <ul className="mt-2 space-y-1">
                  {resultado.paquetes.map((p) => (
                    <li key={p.id} className="rounded-md bg-gray-50 px-2 py-1 text-xs dark:bg-gray-800">
                      <span className="font-medium">{p.ramo}</span>
                      <span className="text-gray-500 dark:text-gray-400"> — {describirPaquete(p)}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => onAplicar(resultado.paquetes)}
                  className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Usar este horario
                </button>
              </>
            ) : (
              <div className="mt-1 space-y-2">
                <p className="text-xs text-red-600 dark:text-red-400">{resultado.motivo}</p>

                {resultado.incompatibles?.length > 0 && (
                  <ul className="space-y-1">
                    {resultado.incompatibles.map(([a, b], i) => (
                      <li key={i} className="rounded-md bg-red-50 px-2 py-1 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-300">
                        <strong>{a}</strong> y <strong>{b}</strong> chocan en todas sus secciones.
                      </li>
                    ))}
                  </ul>
                )}

                {resultado.grupoIncompatible?.length > 0 && (
                  <div className="rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-300">
                    <p>Estos {resultado.grupoIncompatible.length} ramos no se pueden tomar juntos:</p>
                    <ul className="mt-1 list-disc pl-4">
                      {resultado.grupoIncompatible.map((n) => <li key={n}><strong>{n}</strong></li>)}
                    </ul>
                    <p className="mt-1 opacity-80">
                      Por pares sí encajan, pero los tres a la vez no. Basta con sacar uno.
                    </p>
                  </div>
                )}

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Saca uno de los ramos en conflicto y vuelve a armar, o arma el horario igual
                  y corrige los topes tú.
                </p>

                {resultado.sePuedeForzar && (
                  <button
                    type="button"
                    onClick={() => armar(true)}
                    className="w-full rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/70"
                  >
                    Armar de todas formas (con topes)
                  </button>
                )}
              </div>
            )}

            {resultado.sinOpciones?.length > 0 && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                Sin secciones utilizables: {resultado.sinOpciones.join(', ')}.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
