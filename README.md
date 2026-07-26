# Horarios ICIF

Herramienta web para consultar la oferta de ramos de un semestre y armar el horario personal
sin topes. Todo corre en el navegador: el Excel institucional se lee en el cliente y no se
sube a ningún servidor.

## Qué hace

- **Importa el Excel** tal cual lo entrega la universidad, deduplica las filas repetidas y
  agrupa los bloques por NRC.
- **Busca y filtra** por ramo, sección, NRC, profesor, componente (TEO/LAB/TAL), día y rango
  horario. Los resultados se agrupan por ramo para no dejar una tabla de 200 filas.
- **Resuelve las ligas**: al agregar una teoría se suma automáticamente su laboratorio o
  taller asociado, eligiendo el que menos choque con el resto del horario. También se puede
  agregar una sección como ramo independiente, sin arrastrar su liga.
- **Arma el horario automáticamente**: eliges los ramos y la app prueba todas las
  combinaciones de secciones buscando una sin topes.
- **Detecta topes** y permite aceptarlos cuando son inevitables.
- **Compara secciones**: al hacer clic en un ramo del horario muestra todas sus
  combinaciones posibles, marcando cuáles chocan y con qué.
- **Exporta** el horario a PNG o PDF.

## Formato del archivo

El Excel debe traer estas columnas: `NRC`, `TIPO`, `SECCION`, `COMPONENTE`, `NOMBRE`,
`LIGA`, `CONECTOR`, `HR_INICIO`, `LUNES`…`SABADO`, `NOMBRE_`, `APELLIDO`.

Tres particularidades del archivo real que la app resuelve:

- **La hora de término no viene en el Excel.** Se asume una duración estándar recortada por
  el inicio del bloque siguiente de la grilla institucional. Sin eso, un bloque de las 13:11
  terminaría 14:41 y chocaría falsamente con uno de las 14:40.
- **Los códigos de liga se repiten entre departamentos.** Un mismo ramo puede dictarse como
  DCEX y como INGE reusando `T1`/`L1`, así que las ligas se resuelven dentro de `NOMBRE + TIPO`.
- **Los topes solo se toleran entre un ramo de informática (ICIF) y uno de servicio.** El
  armador automático nunca acepta un choque entre dos ramos del mismo tipo.

Los archivos `.xlsx` están en `.gitignore`: traen nombres reales de profesores y no
corresponde publicarlos.

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Genera un sitio estático en `dist/`. No necesita backend ni variables de entorno.

## Stack

React + Vite + Tailwind CSS. Lee los `.xlsx` con SheetJS y exporta a PDF con jsPDF sobre un
canvas dibujado a mano.
