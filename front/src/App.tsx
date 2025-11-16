import { useState, useRef, useEffect } from 'react'
import './App.css'
import { WeeklyCalendar } from './components/WeeklyCalendar'
import { BuscadorMaterias } from './BuscadorMaterias'
import { SelectedCursosPanel } from './components/SelectedCursosPanel'

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

interface CursoSeleccionado {
  codigo: string
  materiaNombre: string
  cursoNombre: string
}

const mockLogin = async (padron: string): Promise<{ padron: string }> => {
  const response = await fetch('http://localhost:5000/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ padron })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error al iniciar sesión')
  }

  return response.json()
}

function App() {
  const [padron, setPadron] = useState('')
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false)
  const [activePanel, setActivePanel] = useState<'import' | 'buscador' | null>(null)
  const [cursosSeleccionados, setCursosSeleccionados] = useState<CursoSeleccionado[]>([])
  const [planesGenerados, setPlanesGenerados] = useState<Plan[]>([])
  const [isGenerandoPlanes, setIsGenerandoPlanes] = useState(false)
  
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!padron.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await mockLogin(padron)
      setLoggedInUser(response.padron)
      setPadron('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    setLoggedInUser(null)
    setIsDropdownOpen(false)
    setError(null)
    setCursosSeleccionados([])
    setPlanesGenerados([])
  }

  const handleToggleCurso = (curso: CursoSeleccionado) => {
    setCursosSeleccionados(prev => {
      if (prev.some(c => c.codigo === curso.codigo)) {
        return prev.filter(c => c.codigo !== curso.codigo)
      } else {
        return [...prev, curso]
      }
    })
  }

  const cursosSeleccionadosCodigos = cursosSeleccionados.map(c => c.codigo)

   const handleGenerarPlanes = async (cursos: string[]) => {
    setIsGenerandoPlanes(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:5000/api/scheduler/generar-planes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cursos: cursos,
          max_planes: 1000
        })
      })

      const data = await response.json()
      
      if (data.success) {
        if (data.tipo_advertencia == 'advertencia_nunca_usados') {
          alert("<Advertencia>\n" + data.advertencia)
        }
        const planesConId = data.planes.map((cursos: Curso[], index: number) => ({
          id: index,
          cursos
        }))
        setPlanesGenerados(planesConId)
        setIsSideMenuOpen(false)
        setActivePanel(null)
      } else {
        // Mostrar mensaje de error específico
        const mensajeError = data.error || 'Error al generar planes'
        setError(mensajeError)
        
        // Mostrar alerta con el mensaje
        alert(`❌ ${mensajeError}\n\nIntenta seleccionar otros cursos o verifica que los horarios no se superpongan completamente.`)
      }
    } catch (err) {
      const mensajeError = err instanceof Error ? err.message : 'Error al generar planes'
      setError(mensajeError)
      alert(`❌ ${mensajeError}`)
    } finally {
      setIsGenerandoPlanes(false)
    }
  }

  const handleLimpiarPlanes = () => {
    setPlanesGenerados([])
    setCursosSeleccionados([])
  }

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative overflow-hidden">
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-sm shadow-md border-b border-gray-200">
        <div className="px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="hidden md:block text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Scheduler de Materias
            </h1>
          </div>

          {loggedInUser && (
            <div className="flex items-center gap-4">
              {/* Botón para abrir menú lateral */}
              <button
                onClick={() => setIsSideMenuOpen(true)}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all hover:scale-105 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
              >
                Menú
              </button>

              {/* Avatar del usuario */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  aria-label="Menú de usuario"
                  className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-md hover:shadow-lg transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 cursor-pointer"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>
      
      {/* MAIN */}
      <main className="h-[calc(100vh-73px)]">
        {loggedInUser && (
          <div className="h-full">
            <WeeklyCalendar 
              planesGenerados={planesGenerados}
              onLimpiarPlanes={handleLimpiarPlanes}
            />
          </div>
        )}
      </main>

      {/* LOGIN MODAL */}
      {!loggedInUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
            <form onSubmit={handleLogin} className="space-y-6">
              <input
                id="padron"
                type="text"
                value={padron}
                onChange={(e) => setPadron(e.target.value)}
                placeholder="Padrón"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                disabled={isLoading}
              />
              {error && <p className="text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-6 rounded-lg hover:from-blue-600 hover:to-indigo-700"
              >
                {isLoading ? 'Ingresando...' : 'Ingresar'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PANEL LATERAL */}
      {isSideMenuOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-end z-40">
          <div className="bg-white w-96 h-full shadow-2xl p-6 relative animate-slide-left overflow-y-auto">
            <button
              onClick={() => {
                setIsSideMenuOpen(false)
                setActivePanel(null)
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-xl"
            >
              ✕
            </button>

            {/* Botones principales solo si no se eligió panel */}
            {!activePanel && (
              <>
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">Menú</h2>
                <div className="space-y-4">
                  <button
                    onClick={() => setActivePanel('buscador')}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-indigo-700 hover:to-purple-700"
                  >
                    Buscar Materias
                  </button>
                </div>
              </>
            )}

            {/* Buscador dentro del panel */}
            {activePanel === 'buscador' && (
              <>
                {isGenerandoPlanes && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600">Generando planes...</p>
                  </div>
                )}
                {!isGenerandoPlanes && (
                  <div className="h-full flex flex-col">
                    <div className="flex-1 overflow-y-auto pr-2">
                      <BuscadorMaterias 
                        cursosSeleccionadosCodigos={cursosSeleccionadosCodigos}
                        onToggleCurso={handleToggleCurso}
                      />
                    </div>
                    <SelectedCursosPanel
                      cursos={cursosSeleccionados}
                      onGenerarPlanes={() => handleGenerarPlanes(cursosSeleccionadosCodigos)}
                      onRemove={(codigo) =>
                        handleToggleCurso(
                          cursosSeleccionados.find(c => c.codigo === codigo) || { codigo, materiaNombre: '', cursoNombre: '' }
                        )
                      }
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
