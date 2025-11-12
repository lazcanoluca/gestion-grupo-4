import { useState, useEffect } from 'react'

interface Materia {
  codigo: string
  nombre: string
  creditos?: number
}

interface Clase {
  dia: number
  hora_inicio: string
  hora_fin: string
  tipo?: string
  aula?: string
}

interface Curso {
  codigo: string
  nombre: string
  numero_curso: string
  catedra?: string
  periodo: string
  docentes: string[]
  clases: Clase[]
}

interface Props {
  cursosSeleccionadosCodigos: string[]
  onToggleCurso: (curso: { codigo: string; materiaNombre: string; cursoNombre: string }) => void
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function BuscadorMaterias({ cursosSeleccionadosCodigos, onToggleCurso }: Props) {
  const [materias, setMaterias] = useState<Materia[]>([])
  const [cursos, setCursos] = useState<Curso[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [materiaSeleccionada, setMateriaSeleccionada] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    cargarMaterias()
  }, [])

  const cargarMaterias = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:5000/api/siu/materias')

      if (!response.ok) {
        throw new Error('Error al cargar materias')
      }

      const data = await response.json()

      if (data.success) {
        setMaterias(data.materias)
      } else {
        throw new Error(data.error || 'Error desconocido')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar materias')
    } finally {
      setIsLoading(false)
    }
  }

  const cargarCursosPorMateria = async (codigoMateria: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`http://localhost:5000/api/siu/materias/${codigoMateria}/cursos`)

      if (!response.ok) {
        throw new Error('Error al cargar cursos')
      }

      const data = await response.json()

      if (data.success) {
        setCursos(data.cursos)
        setMateriaSeleccionada(codigoMateria)
      } else {
        throw new Error(data.error || 'Error desconocido')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar cursos')
    } finally {
      setIsLoading(false)
    }
  }

  const materiasFiltradas = materias.filter(m =>
    m.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    m.codigo.toLowerCase().includes(busqueda.toLowerCase())
  )

  const formatearHora = (hora: string) => hora.substring(0, 5)

  const manejarToggleCurso = (materia: Materia | undefined, curso: Curso) => {
    if (!materia) return
    onToggleCurso({
      codigo: curso.codigo,
      materiaNombre: materia.nombre,
      cursoNombre: curso.nombre
    })
  }

  if (materiaSeleccionada && cursos.length > 0) {
    const materia = materias.find(m => m.codigo === materiaSeleccionada)

    return (
      <div className="flex-1 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              setMateriaSeleccionada(null)
              setCursos([])
            }}
            className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
        </div>

        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          {materia?.nombre}
        </h2>
        <p className="text-sm text-gray-600 mb-4">Código: {materia?.codigo}</p>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {cursos.map((curso) => {
            const isSeleccionado = cursosSeleccionadosCodigos.includes(curso.codigo)

            return (
              <div
                key={curso.codigo}
                onClick={() => manejarToggleCurso(materia, curso)}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  isSeleccionado
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-800">{curso.nombre}</h3>
                  {isSeleccionado && (
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>

                {curso.docentes.length > 0 && (
                  <p className="text-sm text-gray-600 mb-2">
                    {curso.docentes.join(', ')}
                  </p>
                )}

                <div className="space-y-1">
                  {curso.clases.map((clase, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="font-medium w-8">{DIAS_SEMANA[clase.dia]}</span>
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
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">
        Buscar Materias
      </h2>

      {isLoading && materias.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 mb-4">
          {error}
        </div>
      )}

      {materias.length > 0 && (
        <>
          <input
            type="text"
            placeholder="Buscar por nombre o código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
          />

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {!isLoading && materiasFiltradas.length === 0 && (
              <div className="text-center text-gray-500 py-8 border border-dashed border-gray-300 rounded-lg">
                No se encontraron materias.
              </div>
            )}
            {materiasFiltradas.map((materia) => (
              <div
                key={materia.codigo}
                onClick={() => cargarCursosPorMateria(materia.codigo)}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm cursor-pointer transition-all"
              >
                <h3 className="font-semibold text-gray-800 mb-1">
                  {materia.nombre}
                </h3>
                <p className="text-sm text-gray-600">
                  Código: {materia.codigo}
                  {materia.creditos && ` · ${materia.creditos} créditos`}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
