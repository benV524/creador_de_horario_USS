import { DIAS } from './parseExcel.js'
import { seSuperponen, topePermitido } from './armador.js'

// Paleta estable para diferenciar ramos en la grilla. Son tonos profundos y algo
// desaturados: se distinguen entre sí, aguantan texto blanco encima y conviven con el
// papel sin competir. Se evita el rojo, reservado para los topes, y el azul de
// identidad, para que un ramo no se confunda con la interfaz.
const PALETA = [
  '#2a6491', // azul acero
  '#b0552a', // terracota
  '#5f4795', // morado
  '#1d7a64', // verde azulado
  '#a83a59', // frambuesa
  '#8a6a0d', // mostaza
  '#456f26', // verde hoja
  '#39579b', // azul índigo
  '#8a4a7d', // ciruela
  '#7a5540', // café
]

export function colorParaClave(clave, clavesOrdenadas) {
  const idx = clavesOrdenadas.indexOf(clave)
  return PALETA[(idx < 0 ? 0 : idx) % PALETA.length]
}

/** Todos los eventos de los paquetes seleccionados, listos para dibujar. */
export function eventosDeSeleccion(paquetes) {
  return paquetes.flatMap((p) => p.eventos)
}

/** Clave estable de un par de ramos en conflicto, para poder recordar si el usuario lo aceptó. */
export function claveTope(ramoA, ramoB) {
  return [ramoA, ramoB].sort().join('||')
}

/**
 * Detecta choques entre eventos de NRC distinto.
 * `topesAceptados` son las claves de pares que el usuario decidió mantener: siguen
 * apareciendo pero ya no se marcan como error.
 */
export function detectarChoques(eventos, topesAceptados = new Set()) {
  const idsEnChoque = new Set()
  const idsAceptados = new Set()
  const pares = []

  for (let i = 0; i < eventos.length; i++) {
    for (let j = i + 1; j < eventos.length; j++) {
      const a = eventos[i]
      const b = eventos[j]
      if (a.nrc === b.nrc || !seSuperponen(a, b)) continue

      const aceptado = topesAceptados.has(claveTope(a.ramo, b.ramo))
      const destino = aceptado ? idsAceptados : idsEnChoque
      destino.add(claveEvento(a))
      destino.add(claveEvento(b))
      pares.push({ a, b, permitido: topePermitido(a, b), aceptado })
    }
  }
  return { idsEnChoque, idsAceptados, pares }
}

export function claveEvento(ev) {
  return `${ev.nrc}|${ev.dia}|${ev.inicioMin}`
}

/**
 * Reparte los eventos solapados de un día en columnas para dibujarlos lado a lado.
 * El reparto se hace por grupo de solapamiento y no por día completo: si dos ramos
 * chocan a las 09:30, un bloque que está solo a las 11:00 debe ocupar todo el ancho.
 */
export function calcularColumnas(eventosDelDia) {
  const ordenados = [...eventosDelDia].sort(
    (a, b) => a.inicioMin - b.inicioMin || a.finMin - b.finMin,
  )

  const resultado = []
  let grupo = []
  let finDelGrupo = -Infinity

  const cerrarGrupo = () => {
    if (grupo.length === 0) return
    const finPorColumna = []
    const asignacion = new Map()

    for (const ev of grupo) {
      let colIdx = finPorColumna.findIndex((fin) => fin <= ev.inicioMin)
      if (colIdx === -1) {
        colIdx = finPorColumna.length
        finPorColumna.push(ev.finMin)
      } else {
        finPorColumna[colIdx] = ev.finMin
      }
      asignacion.set(claveEvento(ev), colIdx)
    }

    const totalColumnas = Math.max(finPorColumna.length, 1)
    for (const ev of grupo) {
      resultado.push({ ...ev, colIdx: asignacion.get(claveEvento(ev)), totalColumnas })
    }
    grupo = []
  }

  for (const ev of ordenados) {
    // Un evento que empieza después de que todo el grupo terminó abre un grupo nuevo.
    if (ev.inicioMin >= finDelGrupo) {
      cerrarGrupo()
      finDelGrupo = ev.finMin
    } else {
      finDelGrupo = Math.max(finDelGrupo, ev.finMin)
    }
    grupo.push(ev)
  }
  cerrarGrupo()

  return resultado
}

export { DIAS }
