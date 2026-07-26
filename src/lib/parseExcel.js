import * as XLSX from 'xlsx'

// Orden de columnas de día tal como aparecen en el Excel, con su nombre en español.
export const DIAS = [
  { col: 'LUNES', letra: 'M', nombre: 'Lunes' },
  { col: 'MARTES', letra: 'T', nombre: 'Martes' },
  { col: 'MIERCOLES', letra: 'W', nombre: 'Miércoles' },
  { col: 'JUEVES', letra: 'R', nombre: 'Jueves' },
  { col: 'VIERNES', letra: 'F', nombre: 'Viernes' },
  { col: 'SABADO', letra: 'S', nombre: 'Sábado' },
]

const DIA_POR_LETRA = Object.fromEntries(DIAS.map((d) => [d.letra, d]))

function hrInicioAHHMM(hrInicioRaw) {
  const digits = String(hrInicioRaw ?? '').trim().padStart(4, '0')
  const h = digits.slice(0, 2)
  const m = digits.slice(2, 4)
  return `${h}:${m}`
}

export function hhmmAMinutos(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function minutosAHHMM(min) {
  const h = Math.floor(min / 60) % 24
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Firma estable de una fila cruda, para deduplicar filas idénticas.
function firmaFila(row) {
  return [
    'NRC', 'TIPO', 'SECCION', 'COMPONENTE', 'NOMBRE', 'LIGA', 'CONECTOR',
    'HR_INICIO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO',
    'NOMBRE_', 'APELLIDO',
  ].map((c) => String(row[c] ?? '').trim()).join('|')
}

/**
 * Parsea el ArrayBuffer de un .xlsx institucional ICIF a una lista de cursos limpia.
 * @param {ArrayBuffer} arrayBuffer
 * @param {{ duracionBloqueMin?: number, hoja?: string }} opts
 */
export function parseWorkbook(arrayBuffer, opts = {}) {
  const { duracionBloqueMin = 90, hoja } = opts
  const wb = XLSX.read(arrayBuffer, { type: 'array' })
  const sheetName = hoja && wb.SheetNames.includes(hoja) ? hoja : wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false })

  const warnings = []
  if (rawRows.length === 0) {
    warnings.push(`La hoja "${sheetName}" no tiene filas de datos.`)
  }

  // 1. Deduplicar filas exactas.
  const filasVistas = new Set()
  const filasUnicas = []
  for (const row of rawRows) {
    const firma = firmaFila(row)
    if (filasVistas.has(firma)) continue
    filasVistas.add(firma)
    filasUnicas.push(row)
  }

  // 2. Agrupar por NRC, acumulando bloques atómicos (día + hora de inicio).
  const cursosPorNrc = new Map()
  for (const row of filasUnicas) {
    const nrc = String(row.NRC ?? '').trim()
    if (!nrc) continue

    if (!cursosPorNrc.has(nrc)) {
      const apellidoCrudo = String(row.APELLIDO ?? '').trim()
      cursosPorNrc.set(nrc, {
        nrc,
        tipo: String(row.TIPO ?? '').trim(),
        seccion: String(row.SECCION ?? '').trim(),
        componente: String(row.COMPONENTE ?? '').trim(),
        nombre: String(row.NOMBRE ?? '').trim(),
        liga: String(row.LIGA ?? '').trim(),
        conector: String(row.CONECTOR ?? '').trim(),
        profesorNombre: String(row.NOMBRE_ ?? '').trim(),
        profesorApellidos: apellidoCrudo ? apellidoCrudo.split('/').map((s) => s.trim()).filter(Boolean) : [],
        profesorDisplay: [String(row.NOMBRE_ ?? '').trim(), apellidoCrudo].filter(Boolean).join(' '),
        esInformatica: String(row.TIPO ?? '').trim().toUpperCase() === 'ICIF',
        bloques: [],
        _bloqueSet: new Set(),
      })
    }

    const curso = cursosPorNrc.get(nrc)
    const hrInicioRaw = String(row.HR_INICIO ?? '').trim()
    const horaInicio = hrInicioRaw ? hrInicioAHHMM(hrInicioRaw) : ''

    for (const dia of DIAS) {
      const valor = String(row[dia.col] ?? '').trim()
      if (!valor) continue
      const claveBloque = `${dia.letra}|${horaInicio}`
      if (curso._bloqueSet.has(claveBloque)) continue
      curso._bloqueSet.add(claveBloque)
      curso.bloques.push({
        dia: dia.letra,
        diaNombre: dia.nombre,
        horaInicio,
        horaInicioMin: horaInicio ? hhmmAMinutos(horaInicio) : null,
        horaFin: '',
        horaFinMin: null,
      })
    }
  }

  // 2b. Calcular la hora de término. El Excel no la trae, así que se asume una duración
  //     estándar recortada por el inicio del bloque siguiente de la grilla institucional.
  //     Sin esto, un bloque de las 13:11 terminaría 14:41 y chocaría falsamente con uno
  //     de las 14:40 (lo mismo entre 16:10/17:35 y 17:35/19:00).
  const iniciosUnicos = [...new Set(
    [...cursosPorNrc.values()]
      .flatMap((c) => c.bloques)
      .map((b) => b.horaInicioMin)
      .filter((m) => m !== null),
  )].sort((a, b) => a - b)

  const TOLERANCIA_MIN = 10
  function finDeBloque(inicioMin) {
    const finNominal = inicioMin + duracionBloqueMin
    // Solo recorta si el bloque siguiente arranca casi al final del nominal; una diferencia
    // mayor significa que pertenece a otra grilla y sí se solapa de verdad.
    const corte = iniciosUnicos.find(
      (s) => s > inicioMin && s < finNominal && s >= finNominal - TOLERANCIA_MIN,
    )
    return corte ?? finNominal
  }

  for (const curso of cursosPorNrc.values()) {
    for (const bloque of curso.bloques) {
      if (bloque.horaInicioMin === null) continue
      bloque.horaFinMin = finDeBloque(bloque.horaInicioMin)
      bloque.horaFin = minutosAHHMM(bloque.horaFinMin)
    }
  }

  // 2c. Franjas de la grilla institucional: son las filas del horario.
  //     Los inicios casi iguales (13:10 y 13:11, según el departamento) se funden en uno.
  const canonicos = []
  for (const inicio of iniciosUnicos) {
    const ultimo = canonicos[canonicos.length - 1]
    if (ultimo !== undefined && inicio - ultimo <= TOLERANCIA_MIN) continue
    canonicos.push(inicio)
  }
  const franjas = canonicos.map((inicioMin, i) => {
    const finMin = canonicos[i + 1] ?? finDeBloque(inicioMin)
    return {
      inicioMin,
      finMin,
      etiqueta: `${minutosAHHMM(inicioMin)} – ${minutosAHHMM(finMin)}`,
    }
  })

  const cursos = [...cursosPorNrc.values()].map((c) => {
    const { _bloqueSet, ...resto } = c
    resto.bloques.sort((a, b) => {
      const diaIdxA = DIAS.findIndex((d) => d.letra === a.dia)
      const diaIdxB = DIAS.findIndex((d) => d.letra === b.dia)
      if (diaIdxA !== diaIdxB) return diaIdxA - diaIdxB
      return (a.horaInicioMin ?? 0) - (b.horaInicioMin ?? 0)
    })
    return resto
  })

  // 3. Resolver conexiones TEO<->LAB/TAL vía LIGA/CONECTOR.
  //    Se agrupa por NOMBRE + TIPO: los códigos de liga ("T1", "L1") se repiten entre las
  //    variantes de un mismo ramo dictadas por departamentos distintos (p.ej. ECUACIONES
  //    DIFERENCIALES existe como DCEX y como INGE), y sin separar por TIPO se cruzarían.
  const cursosPorGrupo = new Map()
  for (const c of cursos) {
    const grupo = `${c.nombre}|${c.tipo}`
    if (!cursosPorGrupo.has(grupo)) cursosPorGrupo.set(grupo, [])
    cursosPorGrupo.get(grupo).push(c)
  }

  for (const c of cursos) {
    if (!c.liga && !c.conector) {
      c.conectados = []
      continue
    }
    const pares = cursosPorGrupo.get(`${c.nombre}|${c.tipo}`) ?? []
    c.conectados = pares
      .filter((o) => o.nrc !== c.nrc && (
        (c.conector && o.liga === c.conector) ||
        (c.liga && o.conector === c.liga)
      ))
      .map((o) => o.nrc)
  }

  return { cursos, warnings, franjas, hoja: sheetName }
}

export function formatearErrorParseo(err) {
  return err?.message ? `No se pudo leer el Excel: ${err.message}` : 'No se pudo leer el Excel.'
}
