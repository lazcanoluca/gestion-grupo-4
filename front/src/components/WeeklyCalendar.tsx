import { useState, useEffect } from 'react'

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
  id: number
  cursos: Curso[]
}

interface WeeklyCalendarProps {
  planesGenerados?: Plan[];
  onBack?: () => void;          // ← NUEVO
  onLimpiarPlanes?: () => void;
}


const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const HORAS = Array.from({ length: 16 }, (_, i) => i + 7) // 7:00 a 22:00

const COLORES_MATERIAS = [
  'bg-blue-100 border-blue-300 text-blue-800',
  'bg-green-100 border-green-300 text-green-800',
  'bg-purple-100 border-purple-300 text-purple-800',
  'bg-orange-100 border-orange-300 text-orange-800',
  'bg-pink-100 border-pink-300 text-pink-800',
  'bg-indigo-100 border-indigo-300 text-indigo-800',
  'bg-yellow-100 border-yellow-300 text-yellow-800',
  'bg-red-100 border-red-300 text-red-800',
  'bg-teal-100 border-teal-300 text-teal-800',
  'bg-cyan-100 border-cyan-300 text-cyan-800',
]

export function WeeklyCalendar({ planesGenerados = [], onBack, onLimpiarPlanes }: WeeklyCalendarProps) {
  const [planSeleccionado, setPlanSeleccionado] = useState<number>(0)
  const [coloresPorMateria, setColoresPorMateria] = useState<Record<string, string>>({})

  // Asignar colores a las materias del plan seleccionado
  useEffect(() => {
    if (planesGenerados.length > 0 && planesGenerados[planSeleccionado]) {
      const plan = planesGenerados[planSeleccionado]
      const nuevosColores: Record<string, string> = {}
      
      plan.cursos.forEach((curso, index) => {
        const codigoMateria = curso.materia.codigo
        if (!nuevosColores[codigoMateria]) {
          nuevosColores[codigoMateria] = COLORES_MATERIAS[index % COLORES_MATERIAS.length]
        }
      })
      
      setColoresPorMateria(nuevosColores)
    }
  }, [planSeleccionado, planesGenerados])

  const formatearHora = (hora: string) => {
    return hora.substring(0, 5)
  }

  const renderClaseEnCalendario = (curso: Curso, clase: Clase, horaActual: number) => {
    // Calcular cuántas horas ocupa la clase
    const horaInicio = parseInt(clase.hora_inicio.split(':')[0])
    const minutoInicio = parseInt(clase.hora_inicio.split(':')[1])
    const horaFin = parseInt(clase.hora_fin.split(':')[0])
    const minutoFin = parseInt(clase.hora_fin.split(':')[1])
    
    // Solo renderizar si esta celda es el inicio de la clase
    if (horaInicio !== horaActual) {
      return null
    }
    
    // Calcular la altura en celdas
    const duracionMinutos = (horaFin * 60 + minutoFin) - (horaInicio * 60 + minutoInicio)
    const alturaBase = window.innerHeight / 16
    const alturaPx = (duracionMinutos / 60) * alturaBase
    const offsetTop = (minutoInicio / 60) * alturaBase
    
    const color = coloresPorMateria[curso.materia.codigo] || COLORES_MATERIAS[0]

    return (
      <div
        key={`${curso.codigo}-${clase.dia}-${clase.hora_inicio}`}
        className={`absolute left-0 right-0 mx-1 rounded-lg border-2 ${color} p-2 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer z-10`}
        style={{ 
          top: `${offsetTop}px`, 
          height: `${alturaPx}px`,
          maxHeight: `${alturaPx}px`
        }}
      >
        <div className="text-xs font-semibold truncate">
          {curso.materia.nombre} - {curso.catedra || curso.numero_curso}
        </div>

        <div className="text-xs truncate">
          {formatearHora(clase.hora_inicio)} - {formatearHora(clase.hora_fin)}
        </div>
        {curso.catedra && (
          <div className="text-xs truncate opacity-75">
            {curso.catedra}
          </div>
        )}
        {clase.tipo && (
          <div className="text-xs truncate opacity-75">
            {clase.tipo}
          </div>
        )}
      </div>
    )
  }

  const planActual = planesGenerados.length > 0 ? planesGenerados[planSeleccionado] : null

  return (
    <div className="h-full flex flex-col bg-white">


      {/* Solapas de Planes */}
      {planesGenerados.length > 0 && (
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2 overflow-x-auto">
          <div className="flex gap-2">
            {planesGenerados.map((plan, index) => (
              <button
                key={plan.id}
                onClick={() => setPlanSeleccionado(index)}
                className={`px-4 py-2 rounded-t-lg font-medium text-sm whitespace-nowrap transition-all ${
                  planSeleccionado === index
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Plan {index + 1}
                <span className="ml-2 text-xs opacity-75">
                  ({plan.cursos.length} {plan.cursos.length === 1 ? 'materia' : 'materias'})
                </span>
              </button>
            ))}
          </div>
          
          <div className="ml-auto flex gap-2">
  
            {/* BOTÓN MODIFICAR SELECCIÓN */}
            {onBack && (
              <button
                onClick={onBack}
                className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 text-sm font-medium transition-colors w-40 text-center"
              >
                Modificar Selección
              </button>
            )}

            {/* BOTÓN LIMPIAR PLANES */}
            {onLimpiarPlanes && (
              <button
                onClick={onLimpiarPlanes}
                className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium transition-colors w-40 text-center"
              >
                Limpiar Planes
              </button>
            )}
          </div>

        </div>
      )}

      {/* Información del Plan Actual */}
      {planActual && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {planActual.cursos.map((curso) => {
              const color = coloresPorMateria[curso.materia.codigo] || COLORES_MATERIAS[0]
              return (
                <div
                  key={curso.codigo}
                  className={`${color} px-3 py-1 rounded-full text-xs font-medium border-2`}
                >
                  {curso.materia.nombre} - {curso.catedra || curso.numero_curso}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Mensaje si no hay planes */}
      {planesGenerados.length === 0 && (
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="text-center p-8 max-w-md">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Bienvenido al Scheduler de Materias
            </h3>
            <p className="text-gray-600 mb-4">
              Selecciona materias desde el menú y genera planes de horarios optimizados
            </p>
            <div className="bg-white rounded-lg p-4 text-left text-sm text-gray-700 space-y-2">
              <p>📚 1. Abre el menú y busca materias</p>
              <p>✅ 2. Selecciona los cursos que te interesan</p>
              <p>🎯 3. Genera planes sin solapamientos</p>
              <p>📅 4. Visualiza tus horarios aquí</p>
            </div>
          </div>
        </div>
      )}

      {/* Calendario */}
      {planActual && (
        <div className="flex-1 overflow-auto">
          <div className="inline-block min-w-full">
            <div className="grid grid-cols-[80px_repeat(6,1fr)] border-l border-t border-gray-200">
              {/* Header con días */}
              <div className="sticky top-0 z-20 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-r border-gray-200 p-2"></div>
              {DIAS.map((dia) => (
                <div
                  key={dia}
                  className="sticky top-0 z-20 bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-b border-r border-gray-200 p-3 text-center font-semibold"
                >
                  {dia}
                </div>
              ))}

              {/* Filas de horas */}
              {HORAS.map((hora) => (
                <div key={hora} className="contents">
                  {/* Columna de hora */}
                  <div className="bg-gray-50 border-b border-r border-gray-200 p-2 text-sm text-gray-600 text-right font-medium sticky left-0 z-10">
                    {hora}:00
                  </div>
                  
                  {/* Celdas de cada día */}
                  {DIAS.map((_, diaIndex) => (
                    <div
                      key={`${hora}-${diaIndex}`}
                      className="relative border-b border-r border-gray-200 bg-white"
                      style={{ height: 'calc((100vh - 200px) / 16)' }}
                    >
                      {/* Renderizar clases en esta celda */}
                      {planActual.cursos.map((curso) =>
                        curso.clases
                          .filter((clase) => clase.dia - 1=== diaIndex)
                          .map((clase) => renderClaseEnCalendario(curso, clase, hora))
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}