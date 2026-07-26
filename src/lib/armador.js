
// Un "paquete" es el conjunto mínimo de secciones que hay que tomar juntas para cursar un ramo:
// la sección principal (normalmente TEO) más una sección por cada componente ligado (LAB/TAL).
// Tomar la teoría sin su laboratorio ligado no es una opción válida, por eso se modela así.

const ORDEN_PRINCIPAL = ['TEO', 'TAL', 'LAB']

function componentePrincipal(secciones) {
  for (const comp of ORDEN_PRINCIPAL) {
    if (secciones.some((s) => s.componente === comp)) return comp
  }
  return secciones[0]?.componente ?? null
}

function eventosDeSeccion(curso) {
  return curso.bloques
    .filter((b) => b.horaInicioMin !== null)
    .map((b) => ({
      nrc: curso.nrc,
      ramo: curso.nombre,
      componente: curso.componente,
      seccion: curso.seccion,
      dia: b.dia,
      inicioMin: b.horaInicioMin,
      finMin: b.horaFinMin ?? b.horaInicioMin + 90,
      horaInicio: b.horaInicio,
      horaFin: b.horaFin,
      profesor: curso.profesorDisplay,
      esInformatica: !!curso.esInformatica,
    }))
}

function seSuperponen(a, b) {
  return a.dia === b.dia && a.inicioMin < b.finMin && b.inicioMin < a.finMin
}

/** Un choque solo se tolera entre un ramo de informática (ICIF) y uno de servicio. */
export function topePermitido(evA, evB) {
  return evA.esInformatica !== evB.esInformatica
}

function tieneChoqueInterno(eventos) {
  for (let i = 0; i < eventos.length; i++) {
    for (let j = i + 1; j < eventos.length; j++) {
      if (eventos[i].nrc !== eventos[j].nrc && seSuperponen(eventos[i], eventos[j])) return true
    }
  }
  return false
}

function productoCartesiano(grupos) {
  let combos = [[]]
  for (const opciones of grupos) {
    const siguiente = []
    for (const combo of combos) {
      for (const opcion of opciones) siguiente.push([...combo, opcion])
    }
    combos = siguiente
  }
  return combos
}

/**
 * `clave` identifica la entrada dentro del horario. Los paquetes normales se identifican
 * por el nombre del ramo, de modo que elegir otra sección reemplaza a la anterior. Los
 * paquetes independientes usan su NRC, así conviven con el paquete completo del mismo ramo.
 */
function construirPaquete(secciones, { esIndependiente = false } = {}) {
  const ramo = secciones[0].nombre
  const clave = esIndependiente ? `solo:${secciones[0].nrc}` : ramo
  const eventos = secciones.flatMap(eventosDeSeccion).map((e) => ({ ...e, clave }))
  return {
    id: (esIndependiente ? 'solo-' : '') + secciones.map((s) => s.nrc).sort().join('-'),
    clave,
    ramo,
    esIndependiente,
    secciones,
    nrcs: secciones.map((s) => s.nrc),
    eventos,
    esInformatica: secciones.some((s) => s.esInformatica),
  }
}

/** Una sola sección, sin arrastrar su liga. Para tomar un ramo suelto a mano. */
export function construirPaqueteIndependiente(seccion) {
  return construirPaquete([seccion], { esIndependiente: true })
}

/** Genera todos los paquetes válidos que nacen de una sección ancla dada. */
export function paquetesDesdeAncla(ancla, cursosPorNrc) {
  const conectados = (ancla.conectados ?? [])
    .map((nrc) => cursosPorNrc.get(nrc))
    .filter(Boolean)

  const porComponente = new Map()
  for (const c of conectados) {
    if (!porComponente.has(c.componente)) porComponente.set(c.componente, [])
    porComponente.get(c.componente).push(c)
  }

  const combos = productoCartesiano([...porComponente.values()])
  return combos
    .map((extras) => construirPaquete([ancla, ...extras]))
    .filter((p) => !tieneChoqueInterno(p.eventos))
}

/** Map<nombreRamo, Paquete[]> con todas las formas válidas de cursar cada ramo. */
export function construirPaquetesPorRamo(cursos) {
  const cursosPorNrc = new Map(cursos.map((c) => [c.nrc, c]))
  const porNombre = new Map()
  for (const c of cursos) {
    if (!porNombre.has(c.nombre)) porNombre.set(c.nombre, [])
    porNombre.get(c.nombre).push(c)
  }

  const resultado = new Map()
  for (const [nombre, secciones] of porNombre) {
    // Las anclas se eligen por TIPO: un ramo puede existir en dos departamentos a la vez
    // (p.ej. ECUACIONES DIFERENCIALES como DCEX y como INGE) con estructuras distintas.
    const porTipo = new Map()
    for (const s of secciones) {
      if (!porTipo.has(s.tipo)) porTipo.set(s.tipo, [])
      porTipo.get(s.tipo).push(s)
    }

    const paquetes = []
    for (const grupo of porTipo.values()) {
      const principal = componentePrincipal(grupo)
      for (const ancla of grupo.filter((s) => s.componente === principal)) {
        paquetes.push(...paquetesDesdeAncla(ancla, cursosPorNrc))
      }
    }
    resultado.set(nombre, paquetes)
  }
  return resultado
}

/**
 * Elige el mejor paquete que contenga la sección `nrc`, minimizando choques contra
 * los eventos ya presentes en el horario. Se usa al agregar un ramo a mano.
 */
export function mejorPaqueteParaSeccion(nrc, cursosPorNrc, eventosExistentes) {
  const seccion = cursosPorNrc.get(nrc)
  if (!seccion) return null

  let candidatos = paquetesDesdeAncla(seccion, cursosPorNrc)

  // Si la sección no es ancla (p.ej. el usuario hizo clic en un LAB), se arma el paquete
  // desde la sección principal ligada, manteniendo la sección que eligió.
  if ((seccion.conectados ?? []).length > 0) {
    const anclas = seccion.conectados
      .map((n) => cursosPorNrc.get(n))
      .filter(Boolean)
    for (const ancla of anclas) {
      const desdeAncla = paquetesDesdeAncla(ancla, cursosPorNrc)
      candidatos.push(...desdeAncla.filter((p) => p.nrcs.includes(nrc)))
    }
  }

  // Deduplicar y quedarse solo con paquetes que realmente incluyan la sección pedida.
  const vistos = new Set()
  candidatos = candidatos.filter((p) => {
    if (!p.nrcs.includes(nrc) || vistos.has(p.id)) return false
    vistos.add(p.id)
    return true
  })

  if (candidatos.length === 0) return construirPaquete([seccion])

  let mejor = null
  let mejorPuntaje = Infinity
  for (const paquete of candidatos) {
    let choques = 0
    let prohibidos = 0
    for (const ev of paquete.eventos) {
      for (const previo of eventosExistentes) {
        if (!seSuperponen(ev, previo)) continue
        choques++
        if (!topePermitido(ev, previo)) prohibidos++
      }
    }
    const puntaje = prohibidos * 1000 + choques
    if (puntaje < mejorPuntaje) {
      mejorPuntaje = puntaje
      mejor = paquete
    }
    if (puntaje === 0) break
  }
  return mejor
}

const LIMITE_NODOS = 400000

export const MODOS = {
  /** No se acepta ningún choque. */
  SIN_TOPES: 'sin-topes',
  /** Solo se acepta el cruce entre un ramo de informática y uno de servicio. */
  SOLO_CRUZADOS: 'solo-cruzados',
  /** Se acepta cualquier choque, minimizando la cantidad. Siempre encuentra solución. */
  CUALQUIERA: 'cualquiera',
}

function buscarCombinacion(ramos, modo) {
  let mejorSolucion = null
  let mejorTopes = Infinity
  let nodos = 0

  function contarTopes(paquete, eventosAcum) {
    let topes = 0
    for (const ev of paquete.eventos) {
      for (const previo of eventosAcum) {
        if (!seSuperponen(ev, previo)) continue
        if (modo === MODOS.SIN_TOPES) return null
        if (modo === MODOS.SOLO_CRUZADOS && !topePermitido(ev, previo)) return null
        topes++
      }
    }
    return topes
  }

  function dfs(indice, elegidos, eventosAcum, topesAcum) {
    if (nodos++ > LIMITE_NODOS) return
    if (topesAcum >= mejorTopes) return
    if (indice === ramos.length) {
      mejorTopes = topesAcum
      mejorSolucion = [...elegidos]
      return
    }
    for (const paquete of ramos[indice].paquetes) {
      const topes = contarTopes(paquete, eventosAcum)
      if (topes === null) continue
      elegidos.push(paquete)
      dfs(indice + 1, elegidos, [...eventosAcum, ...paquete.eventos], topesAcum + topes)
      elegidos.pop()
      if (mejorTopes === 0) return
    }
  }

  dfs(0, [], [], 0)
  return mejorSolucion ? { paquetes: mejorSolucion, topes: mejorTopes } : null
}

/**
 * Reduce el conjunto a un grupo irreducible que sigue sin tener solución: quita ramos de
 * a uno y conserva la quita solo si el resto continúa siendo infactible. Con n búsquedas
 * en vez de probar todos los subconjuntos, deja el grupo mínimo que hay que romper.
 */
function grupoMinimoInfactible(ordenados) {
  let actual = [...ordenados]
  for (const ramo of [...actual]) {
    if (actual.length <= 2) break
    const candidato = actual.filter((r) => r !== ramo)
    if (!buscarCombinacion(candidato, MODOS.SOLO_CRUZADOS)) actual = candidato
  }
  return actual.map((r) => r.nombre)
}

/**
 * Arma un horario para la lista de ramos pedida.
 * Primero busca una combinación sin ningún tope; si no existe, acepta topes únicamente
 * entre un ramo de informática y uno de servicio. Con `forzar` se permite cualquier
 * choque, minimizando la cantidad, para que el usuario lo corrija a mano.
 */
export function armarHorario(nombresRamos, cursos, { forzar = false } = {}) {
  const paquetesPorRamo = construirPaquetesPorRamo(cursos)

  const ramos = nombresRamos.map((nombre) => ({
    nombre,
    paquetes: paquetesPorRamo.get(nombre) ?? [],
  }))

  const sinOpciones = ramos.filter((r) => r.paquetes.length === 0).map((r) => r.nombre)
  const viables = ramos.filter((r) => r.paquetes.length > 0)

  // Resolver primero los ramos más restringidos reduce muchísimo el espacio de búsqueda.
  const ordenados = [...viables].sort((a, b) => a.paquetes.length - b.paquetes.length)

  let resultado = buscarCombinacion(ordenados, MODOS.SIN_TOPES)
  let modoUsado = MODOS.SIN_TOPES
  if (!resultado) {
    resultado = buscarCombinacion(ordenados, MODOS.SOLO_CRUZADOS)
    modoUsado = MODOS.SOLO_CRUZADOS
  }
  if (!resultado && forzar) {
    resultado = buscarCombinacion(ordenados, MODOS.CUALQUIERA)
    modoUsado = MODOS.CUALQUIERA
  }

  if (!resultado) {
    // Nombrar a los culpables ayuda mucho más que un error genérico.
    const incompatibles = []
    for (let i = 0; i < ordenados.length; i++) {
      for (let j = i + 1; j < ordenados.length; j++) {
        if (!buscarCombinacion([ordenados[i], ordenados[j]], MODOS.SOLO_CRUZADOS)) {
          incompatibles.push([ordenados[i].nombre, ordenados[j].nombre])
        }
      }
    }
    // Sin pares culpables el conflicto es de tres o más ramos a la vez.
    const grupoIncompatible = incompatibles.length === 0 && ordenados.length > 2
      ? grupoMinimoInfactible(ordenados)
      : []

    return {
      exito: false,
      paquetes: [],
      topes: 0,
      sinOpciones,
      incompatibles,
      grupoIncompatible,
      sePuedeForzar: ordenados.length > 0,
      motivo: incompatibles.length > 0
        ? 'Hay ramos que chocan en todas sus secciones y son del mismo tipo, así que no se pueden tomar juntos.'
        : 'No existe combinación sin topes prohibidos con todos estos ramos a la vez.',
    }
  }

  return {
    exito: true,
    paquetes: resultado.paquetes,
    topes: resultado.topes,
    conTopes: modoUsado !== MODOS.SIN_TOPES && resultado.topes > 0,
    forzado: modoUsado === MODOS.CUALQUIERA,
    sinOpciones,
    incompatibles: [],
    grupoIncompatible: [],
    motivo: '',
  }
}

/** "TEO T01 + LAB T51" — descripción corta de las secciones de un paquete. */
export function describirPaquete(paquete) {
  return paquete.secciones.map((s) => `${s.componente} ${s.seccion}`).join(' + ')
}

export { seSuperponen, eventosDeSeccion, construirPaquete }
