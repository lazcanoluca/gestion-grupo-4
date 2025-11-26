import { useState, useRef, useEffect } from "react";
import "./App.css";
import { WeeklyCalendar } from "./components/WeeklyCalendar";
import { BuscadorMaterias } from "./BuscadorMaterias";
import { SelectedCursosPanel } from "./components/SelectedCursosPanel";
import PantallaSeleccion from "./PantallaSeleccion";

interface Clase {
  dia: number;
  hora_inicio: string;
  hora_fin: string;
  tipo?: string;
}

interface Curso {
  codigo: string;
  numero_curso: string;
  catedra?: string;
  periodo: string;
  materia: {
    codigo: string;
    nombre: string;
  };
  docentes: string[];
  clases: Clase[];
}

interface Plan {
  id: number;
  cursos: Curso[];
  analisis?: {
    ventajas: Array<{tipo: string, texto: string, icono: string, color: string}>;
    desventajas: Array<{tipo: string, texto: string, icono: string, color: string}>;
    score: number;
    total_flags: number;
  }
}

interface CursoSeleccionado {
  codigo: string;
  materiaNombre: string;
  cursoNombre: string;
}

const mockLogin = async (padron: string): Promise<{ padron: string }> => {
  const response = await fetch("http://localhost:5000/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ padron }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Error al iniciar sesión");
  }

  return response.json();
};



function App() {

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const [activeScreen, setActiveScreen] = useState<
    "home" | "seleccion" | "calendario"
  >("home");

  const [padron, setPadron] = useState("");
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<"import" | "buscador" | null>(
    null
  );
  const [cursosSeleccionados, setCursosSeleccionados] = useState<
    CursoSeleccionado[]
  >([]);
  const [planesGenerados, setPlanesGenerados] = useState<Plan[]>([]);
  const [isGenerandoPlanes, setIsGenerandoPlanes] = useState(false);

  // Prioridades guardadas entre recargas
  const [prioridadesGuardadas, setPrioridadesGuardadas] = useState<
    Record<string, number>
  >({});

  const [maxPlanes, setMaxPlanes] = useState(500); // valor por defecto

  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!padron.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await mockLogin(padron);
      setLoggedInUser(response.padron);
      setPadron("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al iniciar sesión"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    setIsDropdownOpen(false);
    setError(null);
    setCursosSeleccionados([]);
    setPlanesGenerados([]);
    setPrioridadesGuardadas({});
    setActiveScreen("home");
  };

  const handleToggleCurso = (curso: CursoSeleccionado) => {
    setCursosSeleccionados((prev) => {
      if (prev.some((c) => c.codigo === curso.codigo)) {
        return prev.filter((c) => c.codigo !== curso.codigo);
      } else {
        return [...prev, curso];
      }
    });
  };

  const cursosSeleccionadosCodigos = cursosSeleccionados.map((c) => c.codigo);

  const handleGenerarPlanes = async (prioridades: Record<string, number>) => {
    setIsGenerandoPlanes(true);
    setError(null);

    try {
      const response = await fetch(
        "http://localhost:5000/api/scheduler/generar-planes",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cursos: cursosSeleccionadosCodigos,
            prioridades: prioridades,
            max_planes: maxPlanes,
        }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setPrioridadesGuardadas(prioridades);

        if (data.tipo_advertencia === "advertencia_nunca_usados") {
          alert("<Advertencia>\n" + data.advertencia);
        }

        const planesConId = data.planes.map(
          (cursos: Curso[], index: number) => ({
            id: index,
            cursos,
            analisis: data.analisis ? data.analisis[index] : undefined,
          })
        );

        console.log('Planes con análisis:', planesConId);
        console.log('Data completa del backend:', data);

        setPlanesGenerados(planesConId);
        setActiveScreen("calendario");
        setIsSideMenuOpen(false);
        setActivePanel(null);
      } else {
        const mensajeError = data.error || "Error al generar planes";
        setError(mensajeError);
        alert(
          `❌ ${mensajeError}\n\nIntenta seleccionar otros cursos o verifica que los horarios no se superpongan completamente.`
        );
      }
    } catch (err) {
      const mensajeError =
        err instanceof Error ? err.message : "Error al generar planes";
      setError(mensajeError);
      alert(`❌ ${mensajeError}`);
    } finally {
      setIsGenerandoPlanes(false);
    }
  };

  const handleLimpiarPlanes = () => {
    setPlanesGenerados([]);
    setCursosSeleccionados([]);
    setPrioridadesGuardadas({});
  };

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="
      min-h-screen 
      bg-gradient-to-br 
      from-blue-50 via-white to-indigo-50 
      dark:from-gray-900 dark:via-gray-950 dark:to-black
      relative overflow-hidden
    ">
      {/* HEADER */}
      <header className="
        bg-white/80 dark:bg-gray-900/80 
        backdrop-blur-sm 
        shadow-md 
        border-b 
        border-gray-200 dark:border-gray-700
      ">

        <div className="px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
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
            <h1 className="hidden md:block text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Scheduler de Materias
            </h1>
          </div>

          {loggedInUser && (
            
            <div className="flex items-center gap-4">
              {/* Botón para abrir menú lateral */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                aria-label="Cambiar modo oscuro"
                className="w-10 h-10 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              >
                {darkMode ? (
                  // ícono sol
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 3.22l.61 1.25a1 1 0 00.76.55l1.38.2-1 .98a1 1 0 00-.29.88l.24 1.37-1.24-.65a1 1 0 00-.93 0l-1.24.65.24-1.37a1 1 0 00-.29-.88l-1-.98 1.38-.2a1 1 0 00.76-.55L10 3.22z" />
                  </svg>
                ) : (
                  // ícono luna
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707 8.001 8.001 0 1017.293 13.293z" />
                  </svg>
                )}
              </button>

              {/* Avatar del usuario */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  aria-label="Menú de usuario"
                  className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-md hover:shadow-lg transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 cursor-pointer"
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2 cursor-pointer"
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
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
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
        {loggedInUser && activeScreen === "home" && (
          <div className="h-full flex flex-col items-center justify-center gap-6 px-4">

            {/* NUEVA DESCRIPCIÓN */}
            <div className="
              bg-white dark:bg-gray-800 
              rounded-lg 
              p-5 
              text-left 
              text-base 
              font-medium 
              text-gray-700 dark:text-gray-200 
              shadow
            ">
              <p>📚 1. Abre el menú y busca materias</p>
              <p>✅ 2. Selecciona los cursos que te interesan</p>
              <p>🎯 3. Genera planes sin solapamientos</p>
              <p>📅 4. Visualiza tus horarios aquí</p>
            </div>


            {/* BOTÓN YA EXISTENTE */}
            <button
              onClick={() => setActiveScreen("seleccion")}
              className="px-8 py-4 text-xl font-bold bg-blue-600 text-white rounded-lg shadow-lg hover:scale-105 transition"
            >
              Armar Cronograma
            </button>

          </div>
        )}


        {loggedInUser && activeScreen === "seleccion" && (
          <PantallaSeleccion
            cursosSeleccionados={cursosSeleccionados}
            cursosSeleccionadosCodigos={cursosSeleccionadosCodigos}
            prioridadesGuardadas={prioridadesGuardadas}
            onToggleCurso={handleToggleCurso}
            onGenerarPlanes={handleGenerarPlanes}
            maxPlanes={maxPlanes}
            setMaxPlanes={setMaxPlanes}
        />
        )}

        {loggedInUser && activeScreen === "calendario" && (
          <WeeklyCalendar
            planesGenerados={planesGenerados}
            onBack={() => setActiveScreen("seleccion")} 
            onLimpiarPlanes={() => {
              handleLimpiarPlanes();
              setActiveScreen("seleccion");
            }}
          />

        )}
      </main>

      {/* LOGIN MODAL */}
      {!loggedInUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="
            bg-white dark:bg-gray-800 
            rounded-2xl 
            shadow-2xl 
            p-8 
            w-full 
            max-w-md
          ">

            <form onSubmit={handleLogin} className="space-y-6">
             <div className="space-y-1">
              <label htmlFor="padron" className="text-gray-700 dark:text-gray-200 font-medium">
                Ingrese su padrón
              </label>

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
            </div>

              {error && <p className="text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-6 rounded-lg hover:from-blue-600 hover:to-indigo-700"
              >
                {isLoading ? "Ingresando..." : "Ingresar"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
