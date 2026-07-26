import { construirPaquete, construirPaqueteIndependiente } from './armador.js'

// Los horarios se guardan en el navegador como listas de NRC, no como paquetes completos.
// Un paquete arrastra el curso entero (bloques, profesor, conexiones), que ocupa mucho y
// quedaría desactualizado si cambia el Excel. Con el NRC basta para reconstruirlo contra
// los datos que estén cargados en ese momento.

const CLAVE = 'horario-uss:horarios'
const VERSION = 1

function nuevoId() {
  return `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

/** localStorage puede fallar por modo privado, cuota o permisos: nunca debe romper la app. */
function leerCrudo() {
  try {
    const texto = window.localStorage.getItem(CLAVE)
    if (!texto) return []
    const datos = JSON.parse(texto)
    if (!datos || datos.version !== VERSION || !Array.isArray(datos.horarios)) return []
    return datos.horarios.filter(
      (h) => h && typeof h.id === 'string' && typeof h.nombre === 'string' && Array.isArray(h.entradas),
    )
  } catch {
    return []
  }
}

export function leerHorarios() {
  return leerCrudo().sort((a, b) => (b.actualizadoEn ?? 0) - (a.actualizadoEn ?? 0))
}

export function escribirHorarios(horarios) {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify({ version: VERSION, horarios }))
    return { ok: true }
  } catch (err) {
    const sinEspacio = err?.name === 'QuotaExceededError'
    return {
      ok: false,
      error: sinEspacio
        ? 'No queda espacio de almacenamiento en el navegador. Borra algún horario guardado.'
        : 'El navegador no permitió guardar. Si estás en modo incógnito, los datos no persisten.',
    }
  }
}

/** Reduce los paquetes a lo mínimo reconstruible. */
export function serializarPaquetes(paquetes) {
  return paquetes.map((p) => ({
    nrcs: p.nrcs,
    esIndependiente: !!p.esIndependiente,
  }))
}

export function crearHorario(nombre, paquetes) {
  const ahora = Date.now()
  return {
    id: nuevoId(),
    nombre: nombre.trim(),
    creadoEn: ahora,
    actualizadoEn: ahora,
    entradas: serializarPaquetes(paquetes),
  }
}

/**
 * Reconstruye los paquetes de un horario guardado contra los cursos cargados.
 * Devuelve también los NRC que ya no existen, para poder avisar sin bloquear la apertura.
 */
export function rehidratar(guardado, cursosPorNrc) {
  const paquetes = []
  const faltantes = []

  for (const entrada of guardado.entradas ?? []) {
    const secciones = []
    for (const nrc of entrada.nrcs ?? []) {
      const curso = cursosPorNrc.get(nrc)
      if (curso) secciones.push(curso)
      else faltantes.push(nrc)
    }
    if (secciones.length === 0) continue

    paquetes.push(
      entrada.esIndependiente
        ? construirPaqueteIndependiente(secciones[0])
        : construirPaquete(secciones),
    )
  }

  // Dos entradas distintas podrían reconstruirse con la misma clave si el Excel cambió;
  // la grilla asume claves únicas, así que se conserva la primera.
  const vistas = new Set()
  const unicos = paquetes.filter((p) => {
    if (vistas.has(p.clave)) return false
    vistas.add(p.clave)
    return true
  })

  return { paquetes: unicos, faltantes }
}

/** Resumen legible sin necesidad de tener el Excel cargado. */
export function contarSecciones(guardado) {
  return (guardado.entradas ?? []).reduce((n, e) => n + (e.nrcs?.length ?? 0), 0)
}

export function nombreDeArchivo(nombre, extension) {
  const limpio = String(nombre)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return `${limpio || 'horario'}.${extension}`
}
