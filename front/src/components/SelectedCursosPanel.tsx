import { useState } from 'react'

// Tipos
interface CursoSeleccionadoMini {
  codigo: string
  materiaNombre: string
  cursoNombre: string
}

interface SelectedCursosPanelProps {
  cursos: CursoSeleccionadoMini[]
  onGenerarPlanes: (prioridades: Record<string, number>) => void
  onRemove: (codigo: string) => void
  prioridadesIniciales?: Record<string, number>
  onPrioridadesChange?: (prioridades: Record<string, number>) => void
}

const PRIORIDAD_LABELS = {
  5: { label: 'Muy Alta', emoji: '⭐⭐⭐⭐⭐', color: 'text-red-600' },
  4: { label: 'Alta', emoji: '⭐⭐⭐⭐', color: 'text-orange-600' },
  3: { label: 'Media', emoji: '⭐⭐⭐', color: 'text-yellow-600' },
  2: { label: 'Baja', emoji: '⭐⭐', color: 'text-blue-600' },
  1: { label: 'Muy Baja', emoji: '⭐', color: 'text-gray-600' }
}

export function SelectedCursosPanel({
  cursos,
  onGenerarPlanes,
  onRemove,
  prioridadesIniciales = {},
  onPrioridadesChange
}: SelectedCursosPanelProps) {
  const [prioridades, setPrioridades] = useState<Record<string, number>>(prioridadesIniciales)
  const [mostrarAyuda, setMostrarAyuda] = useState(false)
  const [mostrarPanel, setMostrarPanel] = useState(false)

  const hayCursos = cursos.length > 0

  const getPrioridad = (codigo: string) => prioridades[codigo] || 3

  const actualizarPrioridad = (codigo: string, nuevaPrioridad: number) => {
    setPrioridades(prev => {
      const next = {
        ...prev,
        [codigo]: nuevaPrioridad
      }
      onPrioridadesChange?.(next)
      return next
    })
  }

  const handleGenerarPlanes = () => {
    const prioridadesActuales: Record<string, number> = {}
    cursos.forEach(curso => {
      prioridadesActuales[curso.codigo] = getPrioridad(curso.codigo)
    })
    onGenerarPlanes(prioridadesActuales)
  }

  const contarPorPrioridad = () => {
    const conteo: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    cursos.forEach(curso => {
      const prioridad = getPrioridad(curso.codigo)
      conteo[prioridad]++
    })
    return conteo
  }

  const conteoPrioridades = contarPorPrioridad()

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4 flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Cursos seleccionados</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMostrarAyuda(!mostrarAyuda)}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
            aria-label="Ayuda sobre prioridades"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">{cursos.length}</span>
        </div>
      </div>

      {mostrarAyuda && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3 text-sm">
          <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">¿Cómo funcionan las prioridades?</p>
          <ul className="space-y-1 text-blue-800 dark:text-blue-100 text-xs">
            <li>• Asigna prioridad a cada curso (1 a 5 estrellas)</li>
            <li>• Los planes se ordenan por suma total de prioridades</li>
            <li>• Los cursos con más estrellas aparecerán en los primeros planes</li>
            <li>• Prioridad media (3⭐) es el valor por defecto</li>
          </ul>
        </div>
      )}

      {!hayCursos ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Todavía no agregaste cursos. Busca una materia para empezar.
        </p>
      ) : (
        <>
          <div className="mb-3">
            <button
              onClick={() => setMostrarPanel(!mostrarPanel)}
              className="w-full flex items-center justify-between bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {mostrarPanel ? 'Ocultar' : 'Ver'} cursos y prioridades
              </span>
              <svg
                className={`w-5 h-5 text-gray-600 dark:text-gray-300 transition-transform ${mostrarPanel ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* CONTENIDO COLAPSABLE */}
            {mostrarPanel && (
              <div className="mt-2 space-y-3">
                {/* Distribución de prioridades */}
                <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">Distribución:</p>
                  <div className="grid grid-cols-5 gap-1 text-xs">
                    {[5, 4, 3, 2, 1].map(nivel => (
                      <div key={nivel} className="text-center">
                        <div className={`font-bold ${PRIORIDAD_LABELS[nivel as keyof typeof PRIORIDAD_LABELS].color}`}>
                          {conteoPrioridades[nivel]}
                        </div>
                        <div className="text-gray-500 dark:text-gray-300 text-[10px]">
                          {PRIORIDAD_LABELS[nivel as keyof typeof PRIORIDAD_LABELS].label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Acciones rápidas */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const nuevasPrioridades: Record<string, number> = {}
                      cursos.forEach(c => nuevasPrioridades[c.codigo] = 3)
                      setPrioridades(nuevasPrioridades)
                      onPrioridadesChange?.(nuevasPrioridades)
                    }}
                    className="flex-1 text-xs py-1.5 px-2 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-200 rounded hover:bg-yellow-200 dark:hover:bg-yellow-800/50 transition-colors font-medium"
                  >
                    Todas media
                  </button>
                </div>

                {/* Lista de cursos con prioridades */}
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {cursos.map((curso) => {
                    const prioridad = getPrioridad(curso.codigo)
                    const prioridadInfo = PRIORIDAD_LABELS[prioridad as keyof typeof PRIORIDAD_LABELS]

                    return (
                      <div
                        key={curso.codigo}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{curso.materiaNombre}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-300">{curso.cursoNombre}</p>
                          </div>
                          <button
                            onClick={() => onRemove(curso.codigo)}
                            className="text-gray-400 dark:text-gray-500 hover:text-red-600 ml-2 flex-shrink-0"
                            aria-label="Eliminar curso"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap">Prioridad:</span>
                          <div className="flex gap-1 flex-wrap">
                            {[5, 4, 3, 2, 1].map(nivel => {
                              const isSelected = prioridad === nivel

                              return (
                                <button
                                  key={nivel}
                                  onClick={() => actualizarPrioridad(curso.codigo, nivel)}
                                  className={`px-2 py-0.5 text-xs rounded transition-all ${isSelected
                                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                                >
                                  {nivel}⭐
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        <div className={`text-xs ${prioridadInfo.color} font-medium`}>
                          {prioridadInfo.emoji} {prioridadInfo.label}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RESUMEN COMPACTO CUANDO ESTÁ COLAPSADO */}
          {!mostrarPanel && (
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-2 mb-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-800 dark:text-blue-100 font-medium">
                  {cursos.length} {cursos.length === 1 ? 'curso' : 'cursos'} con prioridades configuradas
                </span>
                <div className="flex gap-1">
                  {Object.entries(conteoPrioridades).reverse().map(([nivel, cant]) =>
                    cant > 0 && (
                      <span key={nivel} className="bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                        {cant}×{nivel}⭐
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <button
        onClick={handleGenerarPlanes}
        disabled={!hayCursos}
        className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all ${hayCursos
          ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-md hover:shadow-lg'
          : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
          }`}
      >
        {hayCursos ? `Generar Planes (${cursos.length} cursos)` : 'Generar Planes'}
      </button>
    </div>
  )
}

// Demo Component
export default function Demo() {
  const [cursos, setCursos] = useState<CursoSeleccionadoMini[]>([
    {
      codigo: 'CB100-1',
      materiaNombre: 'Análisis Matemático II',
      cursoNombre: 'Curso 1: Martínez'
    },
    {
      codigo: '61.03-2',
      materiaNombre: 'Algoritmos y Programación II',
      cursoNombre: 'Curso 2: García'
    },
    {
      codigo: '75.01-1',
      materiaNombre: 'Física I',
      cursoNombre: 'Curso 1: López'
    }
  ])

  const [prioridadesGuardadas, setPrioridadesGuardadas] = useState<Record<string, number>>({})

  const handleGenerarPlanes = (prioridades: Record<string, number>) => {
    console.log('Generando planes con prioridades:', prioridades)
    setPrioridadesGuardadas(prioridades)
    alert(`Generando planes con prioridades:\n${JSON.stringify(prioridades, null, 2)}`)
  }

  const handleRemove = (codigo: string) => {
    setCursos(prev => prev.filter(c => c.codigo !== codigo))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
          Sistema de Prioridades Mejorado
        </h1>
        <SelectedCursosPanel
          cursos={cursos}
          onGenerarPlanes={handleGenerarPlanes}
          onRemove={handleRemove}
          prioridadesIniciales={prioridadesGuardadas}
        />
      </div>
    </div>
  )
}
