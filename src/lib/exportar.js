import { DIAS } from './parseExcel.js'
import { calcularColumnas, colorParaClave, claveEvento, detectarChoques } from './horario.js'

// El horario se dibuja directamente en un canvas en vez de capturar el DOM.
// Capturar el DOM con html2canvas falla porque Tailwind v4 emite colores en oklch(),
// que la librería no sabe parsear, y termina produciendo una imagen en blanco.

const ANCHO_HORAS = 116
const ALTO_CABECERA = 38
const MARGEN = 20
const ALTO_TITULO = 32
const PX_POR_MIN = 1.15
const ANCHO_TOTAL = 1440

function texto(ctx, cadena, maxAncho) {
  if (ctx.measureText(cadena).width <= maxAncho) return cadena
  let recortada = cadena
  while (recortada.length > 1 && ctx.measureText(`${recortada}…`).width > maxAncho) {
    recortada = recortada.slice(0, -1)
  }
  return `${recortada}…`
}

function rectRedondeado(ctx, x, y, w, h, r) {
  const radio = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, radio)
  else ctx.rect(x, y, w, h)
  ctx.closePath()
}

/** Dibuja el horario semanal y devuelve el canvas resultante. */
export function dibujarHorario(paquetes, franjas, opciones = {}) {
  const { escala = 2, titulo = 'Mi horario' } = opciones

  const eventos = paquetes.flatMap((p) => p.eventos)
  const clavesOrdenadas = paquetes.map((p) => p.clave)
  const { idsEnChoque } = detectarChoques(eventos)

  const minMin = franjas[0]?.inicioMin ?? 8 * 60
  const maxMin = franjas[franjas.length - 1]?.finMin ?? 20 * 60

  const altoGrilla = (maxMin - minMin) * PX_POR_MIN
  const anchoDia = (ANCHO_TOTAL - MARGEN * 2 - ANCHO_HORAS) / DIAS.length
  const alto = MARGEN * 2 + ALTO_TITULO + ALTO_CABECERA + altoGrilla

  const canvas = document.createElement('canvas')
  canvas.width = ANCHO_TOTAL * escala
  canvas.height = alto * escala
  const ctx = canvas.getContext('2d')
  ctx.scale(escala, escala)

  // Fondo siempre blanco: la exportación debe verse igual en modo claro y oscuro.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, ANCHO_TOTAL, alto)

  ctx.font = '600 17px Poppins, system-ui, "Segoe UI", sans-serif'
  ctx.fillStyle = '#1c2233'
  ctx.textBaseline = 'top'
  ctx.fillText(titulo, MARGEN, MARGEN)

  const topeGrilla = MARGEN + ALTO_TITULO + ALTO_CABECERA
  const xDia = (i) => MARGEN + ANCHO_HORAS + i * anchoDia
  const yDeMinuto = (m) => topeGrilla + (m - minMin) * PX_POR_MIN

  // Bandas alternadas de cada franja
  franjas.forEach((f, i) => {
    if (i % 2 !== 1) return
    ctx.fillStyle = '#f6f7fb'
    ctx.fillRect(
      MARGEN,
      yDeMinuto(f.inicioMin),
      ANCHO_TOTAL - MARGEN * 2,
      (f.finMin - f.inicioMin) * PX_POR_MIN,
    )
  })

  // Cabecera
  ctx.fillStyle = '#f6f7fb'
  ctx.fillRect(MARGEN, MARGEN + ALTO_TITULO, ANCHO_TOTAL - MARGEN * 2, ALTO_CABECERA)
  ctx.font = '600 11px Poppins, system-ui, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#6b7280'
  ctx.fillText('HORA', MARGEN + ANCHO_HORAS / 2, MARGEN + ALTO_TITULO + 13)
  DIAS.forEach((d, i) => {
    ctx.fillText(d.nombre.toUpperCase(), xDia(i) + anchoDia / 2, MARGEN + ALTO_TITULO + 13)
  })

  // Líneas y etiquetas de cada franja
  ctx.font = '12px Poppins, system-ui, sans-serif'
  for (const f of franjas) {
    const y = yDeMinuto(f.inicioMin)
    ctx.strokeStyle = '#e8eaf0'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(MARGEN, y)
    ctx.lineTo(ANCHO_TOTAL - MARGEN, y)
    ctx.stroke()

    ctx.fillStyle = '#6b7280'
    ctx.textAlign = 'center'
    const centro = y + ((f.finMin - f.inicioMin) * PX_POR_MIN) / 2 + 4
    ctx.fillText(f.etiqueta, MARGEN + ANCHO_HORAS / 2, centro)
  }

  // Marco y separadores verticales
  ctx.strokeStyle = '#e8eaf0'
  ctx.strokeRect(MARGEN, MARGEN + ALTO_TITULO, ANCHO_TOTAL - MARGEN * 2, ALTO_CABECERA + altoGrilla)
  ctx.beginPath()
  ctx.moveTo(MARGEN, topeGrilla)
  ctx.lineTo(ANCHO_TOTAL - MARGEN, topeGrilla)
  ctx.stroke()
  for (let i = 0; i <= DIAS.length; i++) {
    const x = MARGEN + ANCHO_HORAS + i * anchoDia
    ctx.beginPath()
    ctx.moveTo(x, MARGEN + ALTO_TITULO)
    ctx.lineTo(x, topeGrilla + altoGrilla)
    ctx.stroke()
  }

  // Bloques
  ctx.textAlign = 'left'
  DIAS.forEach((d, i) => {
    const delDia = calcularColumnas(eventos.filter((e) => e.dia === d.letra))
    for (const ev of delDia) {
      const enChoque = idsEnChoque.has(claveEvento(ev))
      const anchoCol = (anchoDia - 4) / ev.totalColumnas
      const x = xDia(i) + 2 + ev.colIdx * anchoCol
      const y = yDeMinuto(ev.inicioMin) + 1
      const w = anchoCol - 2
      const h = Math.max((ev.finMin - ev.inicioMin) * PX_POR_MIN - 2, 18)

      ctx.fillStyle = enChoque ? '#c02a2a' : colorParaClave(ev.clave, clavesOrdenadas)
      rectRedondeado(ctx, x, y, w, h, 5)
      ctx.fill()

      if (enChoque) {
        ctx.strokeStyle = '#8f1f1f'
        ctx.lineWidth = 2
        rectRedondeado(ctx, x + 1, y + 1, w - 2, h - 2, 4)
        ctx.stroke()
      }

      const padding = 6
      const maxTexto = w - padding * 2
      ctx.fillStyle = '#ffffff'

      ctx.font = '600 11px Poppins, system-ui, "Segoe UI", sans-serif'
      ctx.fillText(texto(ctx, ev.ramo, maxTexto), x + padding, y + 5)

      if (h > 34) {
        ctx.font = '10px Poppins, system-ui, "Segoe UI", sans-serif'
        ctx.fillText(
          texto(ctx, `${ev.componente} ${ev.seccion} · ${ev.horaInicio}–${ev.horaFin}`, maxTexto),
          x + padding,
          y + 19,
        )
      }
      if (h > 52 && ev.profesor) {
        ctx.globalAlpha = 0.85
        ctx.fillText(texto(ctx, ev.profesor, maxTexto), x + padding, y + 32)
        ctx.globalAlpha = 1
      }
      if (h > 70) {
        ctx.globalAlpha = 0.75
        ctx.fillText(texto(ctx, `NRC ${ev.nrc}`, maxTexto), x + padding, y + 45)
        ctx.globalAlpha = 1
      }
    }
  })

  return canvas
}

export function exportarPNG(paquetes, franjas, nombreArchivo = 'mi-horario.png', titulo) {
  const canvas = dibujarHorario(paquetes, franjas, titulo ? { titulo } : {})
  const enlace = document.createElement('a')
  enlace.download = nombreArchivo
  enlace.href = canvas.toDataURL('image/png')
  enlace.click()
}

async function cargarJsPDF() {
  try {
    return (await import('jspdf')).jsPDF
  } catch {
    // El módulo se carga bajo demanda; si el navegador quedó con una referencia obsoleta
    // (típico tras reiniciar el servidor de desarrollo), un segundo intento la resuelve.
    const modulo = await import('jspdf')
    return modulo.jsPDF
  }
}

export async function exportarPDF(paquetes, franjas, nombreArchivo = 'mi-horario.pdf', titulo) {
  const canvas = dibujarHorario(paquetes, franjas, titulo ? { titulo } : {})
  const jsPDF = await cargarJsPDF()
  const ancho = canvas.width / 2
  const alto = canvas.height / 2
  const pdf = new jsPDF({
    orientation: ancho >= alto ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [ancho, alto],
  })
  // Sin el flag de compresión jsPDF incrusta el bitmap crudo y el archivo pesa decenas de MB.
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, ancho, alto, undefined, 'FAST')
  pdf.save(nombreArchivo)
}
