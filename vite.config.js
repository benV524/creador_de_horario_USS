import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // jspdf solo se importa de forma dinámica al exportar. Sin declararlo aquí, Vite lo
    // descubre recién en ese clic, re-optimiza las dependencias y la URL con el hash
    // anterior queda inválida: el import falla con "Failed to fetch dynamically imported
    // module". Pre-empaquetarlo al arrancar el servidor evita esa carrera.
    include: ['jspdf'],
  },
})
