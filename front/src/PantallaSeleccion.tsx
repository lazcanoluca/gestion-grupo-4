import { BuscadorMaterias } from "./BuscadorMaterias";
import { SelectedCursosPanel } from "./components/SelectedCursosPanel";

interface CursoSeleccionado {
  codigo: string;
  materiaNombre: string;
  cursoNombre: string;
}

interface Props {
  cursosSeleccionados: CursoSeleccionado[];
  cursosSeleccionadosCodigos: string[];
  prioridadesGuardadas: Record<string, number>;
  onToggleCurso: (curso: CursoSeleccionado) => void;
  onGenerarPlanes: (p: Record<string, number>) => void;
  onPrioridadesChange: (p: Record<string, number>) => void;

  // 👉 AGREGAR ESTAS DOS NUEVAS PROPS
  maxPlanes: number;
  setMaxPlanes: (value: number) => void;
  preferencias: {
    sede: string;
    modalidad: string;
  };
  setPreferencias: (pref: { sede: string; modalidad: string }) => void;
}

export default function PantallaSeleccion({
  cursosSeleccionados,
  cursosSeleccionadosCodigos,
  prioridadesGuardadas,
  onToggleCurso,
  onGenerarPlanes,
  onPrioridadesChange,

  // 👉 AGREGARLAS TAMBIÉN ACÁ
  maxPlanes,
  setMaxPlanes,
  preferencias,
  setPreferencias,
}: Props) {
  return (
    <div className="w-full h-full grid grid-cols-3 gap-4 p-6 bg-gray-50">

      {/* COLUMNA 1 - BUSCADOR */}
      <div className="bg-white rounded-xl shadow-lg p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-3">Buscar materias</h2>

        <BuscadorMaterias
          cursosSeleccionadosCodigos={cursosSeleccionadosCodigos}
          onToggleCurso={onToggleCurso}
        />
      </div>

      {/* COLUMNA 2 - SELECCIÓN Y PRIORIDADES */}
      <div className="bg-white rounded-xl shadow-lg p-4 flex flex-col overflow-y-auto">
        <h2 className="text-xl font-bold mb-3">Cátedras seleccionadas</h2>

        <SelectedCursosPanel
          cursos={cursosSeleccionados}
          onGenerarPlanes={onGenerarPlanes}
          onRemove={(codigo) =>
            onToggleCurso(
              cursosSeleccionados.find((c) => c.codigo === codigo)!
            )
          }
          prioridadesIniciales={prioridadesGuardadas}
          onPrioridadesChange={onPrioridadesChange}
        />
      </div>

      {/* COLUMNA 3 - PREFERENCIAS */}
      <div className="bg-white rounded-xl shadow-lg p-4">
        <h2 className="text-xl font-bold mb-3">Preferencias adicionales</h2>

        <div className="space-y-4">

          {/* SEDE */}
          <div>
            <label htmlFor="sede-select" className="text-sm font-medium">
              Sede
            </label>
            <select
              id="sede-select"
              value={preferencias.sede}
              onChange={(e) =>
                setPreferencias({ ...preferencias, sede: e.target.value })
              }
              className="w-full border rounded px-2 py-1 mt-1"
            >
              <option value="">Cualquiera</option>
              <option value="PB">PB</option>
              <option value="Paseo Colon">Paseo Colón</option>
            </select>
          </div>

          {/* MODALIDAD */}
          <div>
            <label htmlFor="modalidad-select" className="text-sm font-medium">
              Modalidad
            </label>
            <select
              id="modalidad-select"
              value={preferencias.modalidad}
              onChange={(e) =>
                setPreferencias({ ...preferencias, modalidad: e.target.value })
              }
              className="w-full border rounded px-2 py-1 mt-1"
            >
              <option value="">Cualquiera</option>
              <option value="Presencial">Presencial</option>
              <option value="Virtual">Virtual</option>
            </select>
          </div>

          {/* INPUT PARA MÁXIMO DE PLANES */}
          <div className="mt-4">
            <label
              htmlFor="max-planes-input"
              className="block text-sm font-medium mb-1"
            >
              Máximo de planes a generar
            </label>

            <input
              id="max-planes-input"
              type="number"
              min={1}
              max={5000}
              value={maxPlanes}
              onChange={(e) => setMaxPlanes(Number(e.target.value))}
              className="w-40 px-3 py-2 border rounded-lg"
            />
          </div>


        </div>
      </div>
    </div>
  );
}
