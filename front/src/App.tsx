import { useState, useRef, useEffect } from 'react'
import './App.css'
import { WeeklyCalendar } from './components/WeeklyCalendar'

// Simple mock API function
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
  const [showImportModal, setShowImportModal] = useState(false)
  const [siuInput, setSiuInput] = useState('')
  
  // Estados para la importación del SIU
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  
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
  }

  // Función para manejar la importación del SIU
  const handleImportSiu = async () => {
    if (!siuInput.trim()) return
    
    setIsImporting(true)
    setImportError(null)
    
    try {
      const response = await fetch('http://localhost:5000/api/siu/parse-siu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: siuInput })
      })
      
      const data = await response.json()
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al procesar los datos del SIU')
      }
      
      console.log('✅ Datos parseados:', data.data)
      console.log('📊 Estadísticas:', data.stats)
      
      // Aquí puedes guardar los datos en el estado de tu app
      // setMaterias(data.data) // por ejemplo
      
      alert(`✅ ¡Importación exitosa!\n\n` +
            `Periodos: ${data.stats.periodos}\n` +
            `Materias: ${data.stats.total_materias}\n` +
            `Cursos: ${data.stats.total_cursos}`)
      
      setShowImportModal(false)
      setSiuInput('')
      
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Error al importar')
    } finally {
      setIsImporting(false)
    }
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
      {/* Top bar */}
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

      {/* Contenido principal */}
      <main className="h-[calc(100vh-73px)]">
        {loggedInUser && (
          <div className="h-full">
            <WeeklyCalendar />
          </div>
        )}
      </main>

      {/* Modal de login */}
      {!loggedInUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Scheduler de Materias</h2>
              <p className="text-gray-600">Ingresá tu padrón para comenzar</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="padron" className="block text-sm font-medium text-gray-700 mb-2">
                  Padrón
                </label>
                <input
                  id="padron"
                  type="text"
                  value={padron}
                  onChange={(e) => setPadron(e.target.value)}
                  placeholder="Ej: 12345"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base transition-all"
                  required
                  autoFocus
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-6 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Ingresando...
                  </>
                ) : (
                  'Ingresar'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Panel lateral derecho */}
      {isSideMenuOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-end z-40">
          <div className="bg-white w-80 h-full shadow-2xl p-6 relative animate-slide-left">
            <button
              onClick={() => setIsSideMenuOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-xl"
            >
              ✕
            </button>
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Menú</h2>
            <button
              onClick={() => {
                setShowImportModal(true)
                setIsSideMenuOpen(false)
              }}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-2 px-4 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md"
            >
              Importar materias del SIU
            </button>
          </div>
        </div>
      )}

      {/* Modal de "Importar materias del SIU" */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Importar materias del SIU
            </h2>

            <p className="text-gray-700 mb-4 text-sm">
              Ingresá a <strong>Reportes → Oferta de comisiones</strong> en el SIU,
              copiá todo el texto y pegalo aquí.
            </p>

            <textarea
              value={siuInput}
              onChange={(e) => setSiuInput(e.target.value)}
              placeholder="Pegá aquí la oferta de comisiones del SIU..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base mb-4 h-32 resize-none"
              disabled={isImporting}
            />

            {importError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                {importError}
              </div>
            )}

            <div className="flex justify-between gap-4">
              {/* Botón: Cargar materias */}
              <button
                disabled={!siuInput.trim() || isImporting}
                onClick={handleImportSiu}
                className={`px-4 py-2 rounded-lg font-medium transition-all shadow-md flex items-center gap-2 ${
                  siuInput.trim() && !isImporting
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isImporting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Procesando...
                  </>
                ) : (
                  'Cargar materias'
                )}
              </button>

              {/* Botón: Cancelar */}
              <button
                onClick={() => {
                  setShowImportModal(false)
                  setSiuInput('')
                  setImportError(null)
                }}
                disabled={isImporting}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-all font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App