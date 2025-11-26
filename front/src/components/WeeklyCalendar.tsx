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

interface Analisis {
  ventajas: Array<{
    tipo: string
    texto: string
    icono: string
    color: string
  }>
  desventajas: Array<{
    tipo: string
    texto: string
    icono: string
    color: string
  }>
  score: number
  total_flags: number
}

interface Plan {
  id: number
  cursos: Curso[]
  analisis?: Analisis
}

interface WeeklyCalendarProps {
  planesGenerados?: Plan[]
  onBack?: () => void
  onLimpiarPlanes?: () => void
}

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const HORAS = Array.from({ length: 16 }, (_, i) => i + 7)

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

function TooltipAnalisis({ analisis }: { analisis: Analisis }) {
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600'
    if (score >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      green: 'bg-green-50 border-green-200 text-green-700',
      blue: 'bg-blue-50 border-blue-200 text-blue-700',
      yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
      orange: 'bg-orange-50 border-orange-200 text-orange-700',
      red: 'bg-red-50 border-red-200 text-red-700',
    }
    return colorMap[color] || 'bg-gray-50 border-gray-200 text-gray-700'
  }

  return (
    <div className="w-full p-4 max-h-96 overflow-y-auto">
      <div className="mb-4 text-center pb-3 border-b border-gray-200">
        <div className="text-sm text-gray-600 mb-1">Puntuación del Plan</div>
        <div className={`text-3xl font-bold ${getScoreColor(analisis.score)}`}>
          {analisis.score}/100
        </div>
      </div>

      {analisis.ventajas.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span className="text-green-600">✓</span>
            Ventajas
          </h4>
          <div className="space-y-2">
            {analisis.ventajas.map((ventaja, idx) => (
              <div
                key={idx}
                className={`text-xs p-2 rounded border ${getColorClass(
                  ventaja.color
                )}`}
              >
                <span className="mr-2">{ventaja.icono}</span>
                {ventaja.texto}
              </div>
            ))}
          </div>
        </div>
      )}

      {analisis.desventajas.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span className="text-red-600">⚠</span>
            Desventajas
          </h4>
          <div className="space-y-2">
            {analisis.desventajas.map((desventaja, idx) => (
              <div
                key={idx}
                className={`text-xs p-2 rounded border ${getColorClass(
                  desventaja.color
                )}`}
              >
                <span className="mr-2">{desventaja.icono}</span>
                {desventaja.texto}
              </div>
            ))}
          </div>
        </div>
      )}

      {analisis.ventajas.length === 0 &&
        analisis.desventajas.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-4">
            No hay análisis disponible para este plan
          </div>
        )}
    </div>
  )
}

export function WeeklyCalendar({
  planesGenerados = [],
  onBack,
  onLimpiarPlanes,
}: WeeklyCalendarProps) {
  const [planSeleccionado, setPlanSeleccionado] = useState<number>(0)
  const [coloresPorMateria, setColoresPorMateria] =
    useState<Record<string, string>>({})
  const [tooltipAbierto, setTooltipAbierto] = useState<number | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (planesGenerados.length > 0 && planesGenerados[planSeleccionado]) {
      const plan = planesGenerados[planSeleccionado]
      const nuevosColores: Record<string, string> = {}

      plan.cursos.forEach((curso, index) => {
        const codigoMateria = curso.materia.codigo
        if (!nuevosColores[codigoMateria]) {
          nuevosColores[codigoMateria] =
            COLORES_MATERIAS[index % COLORES_MATERIAS.length]
        }
      })

      setColoresPorMateria(nuevosColores)
    }
  }, [planSeleccionado, planesGenerados])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        target.closest('[data-tooltip]') ||
        target.closest('[data-info-btn]')
      ) {
        return
      }
      setTooltipAbierto(null)
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const formatearHora = (hora: string) => hora.substring(0, 5)

  const renderClaseEnCalendario = (
    curso: Curso,
    clase: Clase,
    horaActual: number
  ) => {
    const horaInicio = parseInt(clase.hora_inicio.split(':')[0])
    const minutoInicio = parseInt(clase.hora_inicio.split(':')[1])
    const horaFin = parseInt(clase.hora_fin.split(':')[0])
    const minutoFin = parseInt(clase.hora_fin.split(':')[1])

    if (horaInicio !== horaActual) return null

    const duracionMinutos =
      horaFin * 60 +
      minutoFin -
      (horaInicio * 60 + minutoInicio)

    const alturaBase = window.innerHeight / 16
    const alturaPx = (duracionMinutos / 60) * alturaBase
    const offsetTop = (minutoInicio / 60) * alturaBase

    const color =
      coloresPorMateria[curso.materia.codigo] ||
      COLORES_MATERIAS[0]

    return (
      <div
        key={`${curso.codigo}-${clase.dia}-${clase.hora_inicio}`}
        className={`absolute left-0 right-0 mx-1 rounded-lg border-2 ${color} p-2 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer z-10`}
        style={{
          top: `${offsetTop}px`,
          height: `${alturaPx}px`,
        }}
      >
        <div className="text-xs font-semibold truncate">
          {curso.materia.nombre} - {curso.catedra || curso.numero_curso}
        </div>
        <div className="text-xs truncate">
          {formatearHora(clase.hora_inicio)} -{' '}
          {formatearHora(clase.hora_fin)}
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

  const getScoreBadgeColor = (score: number) => {
    if (score >= 70) return 'bg-green-500'
    if (score >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const handleInfoButtonClick = (
    e: React.MouseEvent,
    index: number,
    buttonElement: HTMLButtonElement | null
  ) => {
    e.stopPropagation()

    if (tooltipAbierto === index) {
      setTooltipAbierto(null)
    } else {
      if (buttonElement) {
        const rect = buttonElement.getBoundingClientRect()
        setTooltipPosition({
          top: rect.bottom + window.scrollY + 12,
          left: rect.left + window.scrollX - 15,
        })
      }
      setTooltipAbierto(index)
    }
  }

  const planActual =
    planesGenerados.length > 0
      ? planesGenerados[planSeleccionado]
      : null

  return (
    <div className="h-full flex flex-col bg-white">

      <style>{`
        @keyframes tooltipFadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .tooltip-animate {
          animation: tooltipFadeIn 0.18s ease-out;
        }
      `}</style>

      {/* PLAN SWITCHER */}
      {planesGenerados.length > 0 && (
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2 overflow-x-auto">
          
          <div className="flex gap-2">
            {planesGenerados.map((plan, index) => {
              const analisis =
                plan.analisis || {
                  ventajas: [],
                  desventajas: [],
                  score: 50,
                  total_flags: 0,
                }

              return (
                <div key={plan.id} className="relative inline-block">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPlanSeleccionado(index)}
                      className={`px-4 py-2 rounded-t-lg font-medium text-sm whitespace-nowrap transition-all ${
                        planSeleccionado === index
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Plan {index + 1}
                      <span className="ml-2 text-xs opacity-75">
                        ({plan.cursos.length}{' '}
                        {plan.cursos.length === 1
                          ? 'materia'
                          : 'materias'})
                      </span>
                      <span
                        className={`ml-2 inline-block w-2 h-2 rounded-full ${getScoreBadgeColor(
                          analisis.score
                        )}`}
                      />
                    </button>

                    <button
                      ref={(el) => {
                        if (el) {
                          el.onclick = (e) =>
                            handleInfoButtonClick(
                              e as any,
                              index,
                              el
                            )
                        }
                      }}
                      data-info-btn
                      className={`p-1.5 rounded-full transition-all ${
                        planSeleccionado === index
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      } ${
                        tooltipAbierto === index
                          ? 'ring-2 ring-blue-400'
                          : ''
                      }`}
                      title="Ver análisis del plan"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="ml-auto flex gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 text-sm font-medium transition-colors w-40 text-center"
              >
                Modificar Selección
              </button>
            )}

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

      {/* TOOLTIP */}
      {tooltipAbierto !== null &&
        planesGenerados[tooltipAbierto] && (
          <div
            data-tooltip
            onClick={(e) => e.stopPropagation()}
            className="
              fixed 
              rounded-xl 
              shadow-2xl 
              bg-white/95 
              backdrop-blur-md 
              tooltip-animate 
              max-w-sm 
              w-[22rem]
              border border-gray-200
              z-[99999]
              p-1
            "
            style={{
              top: `${tooltipPosition.top}px`,
              left: `${tooltipPosition.left}px`,
            }}
          >
            {/* Arrow */}
            <div className="
              absolute 
              -top-2 
              left-6 
              w-4 
              h-4 
              bg-white/95 
              backdrop-blur-md 
              rotate-45 
              border-l 
              border-t 
              border-gray-200
            "></div>

            <TooltipAnalisis
              analisis={
                planesGenerados[tooltipAbierto].analisis || {
                  ventajas: [],
                  desventajas: [],
                  score: 50,
                  total_flags: 0,
                }
              }
            />
          </div>
        )}

      {/* TAGS DE MATERIAS */}
      {planActual && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {planActual.cursos.map((curso) => {
              const color =
                coloresPorMateria[curso.materia.codigo] ||
                COLORES_MATERIAS[0]
              return (
                <div
                  key={curso.codigo}
                  className={`${color} px-3 py-1 rounded-full text-xs font-medium border-2`}
                >
                  {curso.materia.nombre} -{' '}
                  {curso.catedra || curso.numero_curso}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TODO VACÍO */}
      {planesGenerados.length === 0 && (
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="text-center p-8 max-w-md">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-12 h-12 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Bienvenido al Scheduler de Materias
            </h3>
            <p className="text-gray-600 mb-4">
              Selecciona materias desde el menú y genera planes
            </p>
          </div>
        </div>
      )}

      {/* CALENDARIO */}
      {planActual && (
        <div className="flex-1 overflow-auto">
          <div className="inline-block min-w-full">
            <div className="grid grid-cols-[80px_repeat(6,1fr)] border-l border-t border-gray-200">

              <div className="sticky top-0 z-20 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-r border-gray-200 p-2"></div>

              {DIAS.map((dia) => (
                <div
                  key={dia}
                  className="sticky top-0 z-20 bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-b border-r border-gray-200 p-3 text-center font-semibold"
                >
                  {dia}
                </div>
              ))}

              {HORAS.map((hora) => (
                <div key={hora} className="contents">
                  <div className="bg-gray-50 border-b border-r border-gray-200 p-2 text-sm text-gray-600 text-right font-medium sticky left-0 z-10">
                    {hora}:00
                  </div>

                  {DIAS.map((_, diaIndex) => (
                    <div
                      key={`${hora}-${diaIndex}`}
                      className="relative border-b border-r border-gray-200 bg-white"
                      style={{
                        height:
                          'calc((100vh - 200px) / 16)',
                      }}
                    >
                      {planActual.cursos.map((curso) =>
                        curso.clases
                          .filter(
                            (clase) =>
                              clase.dia - 1 === diaIndex
                          )
                          .map((clase) =>
                            renderClaseEnCalendario(
                              curso,
                              clase,
                              hora
                            )
                          )
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
