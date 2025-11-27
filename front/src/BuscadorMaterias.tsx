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
  modalidad?: string
  sede?: string
  docentes: string[]
  clases: Clase[]
}

interface Props {
  cursosSeleccionadosCodigos: string[]
  onToggleCurso: (curso: { codigo: string; materiaNombre: string; cursoNombre: string }) => void
  padron?: string
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function BuscadorMaterias({ cursosSeleccionadosCodigos, onToggleCurso, padron }: Props) {
  const [materias, setMaterias] = useState<Materia[]>([])
  const [cursos, setCursos] = useState<Curso[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [materiaSeleccionada, setMateriaSeleccionada] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [cursoFeedback, setCursoFeedback] = useState<Curso | null>(null)
  const [modalidadSeleccionada, setModalidadSeleccionada] = useState<string>('virtual')
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [feedbackLoading, setFeedbackLoading] = useState(false)

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

  const abrirFeedback = (curso: Curso) => {
    const permitidas = ['virtual', 'presencial', 'hibrido']
    const modalidadInicial = permitidas.includes(curso.modalidad || '')
      ? (curso.modalidad as string)
      : 'virtual'
    setCursoFeedback(curso)
    setModalidadSeleccionada(modalidadInicial)
    setFeedbackError(null)
  }

  const enviarFeedback = async () => {
    if (!cursoFeedback) return
    if (!padron) {
      alert('Debes iniciar sesi\u00f3n para enviar feedback')
      return
    }

    setFeedbackLoading(true)
    setFeedbackError(null)

    try {
      const resp = await fetch('http://localhost:5000/api/feedback/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          curso_codigo: cursoFeedback.codigo,
          modalidad: modalidadSeleccionada,
          sede: cursoFeedback.sede || null,
          padron
        })
      })

      const data = await resp.json()
      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'No se pudo enviar el feedback')
      }

      alert('Gracias por tu feedback!')
      setCursoFeedback(null)
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : 'Error al enviar feedback')
    } finally {
      setFeedbackLoading(false)
    }
  }

  const modalFeedback = cursoFeedback && (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{cursoFeedback.nombre}</h3>
        <p className="text-sm text-gray-600 mb-4">
          Contribuí seleccionando la modalidad de cursada y así mejorar la información para todos.
        </p>

        <label className="block text-sm font-medium text-gray-700 mb-1">Modalidad</label>
        <select
          value={modalidadSeleccionada}
          onChange={(e) => setModalidadSeleccionada(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="virtual">Virtual</option>
          <option value="presencial">Presencial</option>
          <option value="hibrido">Híbrido</option>
        </select>

        {feedbackError && (
          <p className="text-sm text-red-600 mb-3">{feedbackError}</p>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setCursoFeedback(null)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={enviarFeedback}
            disabled={feedbackLoading}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {feedbackLoading ? 'Enviando...' : 'Enviar feedback'}
          </button>
        </div>
      </div>
    </div>
  )

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
                className={`border rounded-lg p-4 cursor-pointer transition-all ${isSeleccionado
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

                {(curso.modalidad || curso.sede) && (
                  <div className="mt-2 space-y-1 text-xs text-gray-500">
                    <div className="flex justify-between">
                      <span>Modalidad</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          abrirFeedback(curso)
                        }}
                        title="Click para informar modalidad"
                        className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                      >
                        {curso.modalidad || 'sin_confirmar'}
                      </button>
                    </div>
                    <div className="flex justify-between">
                      <span>Sede</span>
                      <span>{curso.sede || '-'}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {modalFeedback}
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset focus:border-blue-500 mb-4"
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
      {modalFeedback}
    </div>
  )
}
