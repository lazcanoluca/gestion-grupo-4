import { useState } from 'react'

interface Clase {
  dia: number
  hora_inicio: string
  hora_fin: string
  tipo?: string
}

interface Curso {
  codigo: string
  numero_curso: string
  catedra?: string
  periodo: string
  materia: {
    codigo: string
    nombre: string
  }
  docentes: string[]
  clases: Clase[]
}

interface Plan {
  cursos: Curso[]
  id: number
}

interface Props {
  cursosSeleccionados: string[]
  onVolverAlBuscador: () => void
  onSeleccionarPlan: (plan: Curso[]) => void
}

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export function GeneradorPlanes({ cursosSeleccionados, onVolverAlBuscador, onSeleccionarPlan }: Props) {
  const [planes, setPlanes] = useState<Plan[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [estadisticas, setEstadisticas] = useState<any>(null)
  const [planSeleccionado, setPlanSeleccionado] = useState<number | null>(null)

  const generarPlanes = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('http://localhost:5000/api/scheduler/generar-planes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cursos: cursosSeleccionados,
          max_planes: 1000
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al generar planes')
      }

      const data = await response.json()
      
      if (data.success) {
        const planesConId = data.planes.map((cursos: Curso[], index: number) => ({
          cursos,
          id: index
        }))
        setPlanes(planesConId)
        setEstadisticas(data.estadisticas)
      } else {
        throw new Error(data.error || 'Error desconocido')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar planes')
    } finally {
      setIsLoading(false)
    }
  }

  const aplicarPlan = () => {
    if (planSeleccionado !== null) {
      const plan = planes.find(p => p.id === planSeleccionado)
      if (plan) {
        onSeleccionarPlan(plan.cursos)
      }
    }
  }

  const formatearHora = (hora: string) => {
    return hora.substring(0, 5) // HH:MM
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onVolverAlBuscador}
          className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver
        </button>
      </div>

      <h2 className="text-2xl font-semibold text-gray-800 mb-4">
        Generador de Planes
      </h2>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-blue-800">
          <strong>{cursosSeleccionados.length}</strong> cursos seleccionados
        </p>
      </div>

      {!planes.length && !isLoading && (
        <button
          onClick={generarPlanes}
          disabled={cursosSeleccionados.length === 0}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-4 rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Generar Planes de Horarios
        </button>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      {estadisticas && planes.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800 font-semibold">
              ✅ {estadisticas.mensaje}
            </p>
            <div className="mt-2 space-y-1 text-xs text-green-700">
              <p>• Máximo de materias: {estadisticas.max_materias_simultaneas}</p>
              <p>• Mínimo de materias: {estadisticas.min_materias_simultaneas}</p>
              <p>• Promedio: {estadisticas.promedio_materias} materias</p>
              {estadisticas.cursos_nunca_usados && estadisticas.cursos_nunca_usados.length > 0 && (
                <p className="text-yellow-700 mt-2">
                  ⚠️ {estadisticas.cursos_nunca_usados.length} curso(s) no aparecen en ningún plan (se solapan con todos)
                </p>
              )}
            </div>
          </div>

          {planSeleccionado !== null && (
            <button
              onClick={aplicarPlan}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-2 px-4 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md"
            >
              Aplicar Plan Seleccionado al Calendario
            </button>
          )}
        </div>
      )}

      {planes.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-4">
          {planes.map((plan) => (
            <div
              key={plan.id}
              onClick={() => setPlanSeleccionado(plan.id)}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                planSeleccionado === plan.id
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">
                  Plan {plan.id + 1}
                </h3>
                <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {plan.cursos.length} {plan.cursos.length === 1 ? 'materia' : 'materias'}
                </span>
              </div>

              <div className="space-y-3">
                {plan.cursos.map((curso) => (
                  <div key={curso.codigo} className="bg-white rounded-lg p-3 border border-gray-100">
                    <div className="font-medium text-gray-800 mb-1">
                      {curso.materia.nombre}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      Curso {curso.numero_curso}
                      {curso.catedra && ` - ${curso.catedra}`}
                    </div>
                    
                    <div className="space-y-1">
                      {curso.clases.map((clase, idx) => (
                        <div key={idx} className="text-xs text-gray-500 flex items-center gap-2">
                          <span className="font-medium">{DIAS_SEMANA[clase.dia]}:</span>
                          <span>{formatearHora(clase.hora_inicio)} - {formatearHora(clase.hora_fin)}</span>
                          {clase.tipo && (
                            <span className="bg-gray-100 px-2 py-0.5 rounded">
                              {clase.tipo}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}