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
        setError('El archivo no contiene ramos reconocibles. Revisa que sea el Excel institucional con las columnas esperadas.')
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
    <div
      onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={(e) => {
        e.preventDefault()
        setArrastrando(false)
        procesarArchivo(e.dataTransfer.files?.[0])
      }}
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
        arrastrando ? 'border-purple-400 bg-purple-50 dark:bg-purple-950/30' : 'border-gray-300 dark:border-gray-700'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => procesarArchivo(e.target.files?.[0])}
      />
      <p className="text-lg font-medium text-gray-800 dark:text-gray-100">
        {cargando ? 'Procesando…' : 'Arrastra el Excel de horarios o haz clic para elegirlo'}
      </p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Formato esperado: NRC, TIPO, SECCION, COMPONENTE, NOMBRE, LIGA, CONECTOR, HR_INICIO, días, profesor
      </p>
      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
