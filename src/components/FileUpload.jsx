import { useCallback, useRef, useState } from 'react'
import { parseWorkbook, formatearErrorParseo } from '../lib/parseExcel'

export default function FileUpload({ onCargado }) {
  const [arrastrando, setArrastrando] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const procesarArchivo = useCallback(async (file) => {
    if (!file) return
    setCargando(true)
    setError('')
    try {
      const arrayBuffer = await file.arrayBuffer()
      const { cursos, warnings, franjas, hoja } = parseWorkbook(arrayBuffer)
      if (cursos.length === 0) {
        setError('El archivo no tiene ramos reconocibles. Revisa que sea el Excel de la universidad, con sus columnas originales.')
        setCargando(false)
        return
      }
      onCargado({ cursos, warnings, franjas, hoja, nombreArchivo: file.name })
    } catch (err) {
      setError(formatearErrorParseo(err))
    } finally {
      setCargando(false)
    }
  }, [onCargado])

  return (
    <div>
      <button
        type="button"
        onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault()
          setArrastrando(false)
          procesarArchivo(e.dataTransfer.files?.[0])
        }}
        onClick={() => inputRef.current?.click()}
        className={`w-full rounded border border-dashed px-8 py-12 text-center transition-colors ${
          arrastrando
            ? 'border-azul bg-azul-suave'
            : 'border-linea bg-hoja hover:border-azul-borde hover:bg-azul-suave/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => procesarArchivo(e.target.files?.[0])}
        />
        <p className="text-[16px] font-semibold text-tinta">
          {cargando ? 'Leyendo el archivo…' : 'Arrastra aquí el Excel de horarios'}
        </p>
        <p className="mt-1 text-[14px] text-apagado">
          {cargando ? 'Un momento.' : 'O haz clic para buscarlo en tu computador.'}
        </p>
      </button>

      <div className="mt-4 rounded-2xl border border-linea bg-hoja tarjeta px-4 py-3">
        <p className="rotulo">Columnas que necesita</p>
        <p className="tabular mt-1.5 text-[13px] leading-relaxed text-apagado">
          NRC · TIPO · SECCION · COMPONENTE · NOMBRE · LIGA · CONECTOR · HR_INICIO ·
          LUNES a SABADO · NOMBRE_ · APELLIDO
        </p>
        <p className="mt-2 text-[13px] text-tenue">
          El archivo se lee en tu navegador y no se envía a ningún servidor.
        </p>
      </div>

      {error && (
        <p className="mt-3 rounded border-l-2 border-tope bg-tope-suave px-3 py-2 text-[14px] text-tope">
          {error}
        </p>
      )}
    </div>
  )
}
