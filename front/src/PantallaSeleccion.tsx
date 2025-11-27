import { useState } from "react";
import { BuscadorMaterias } from "./BuscadorMaterias";
import { SelectedCursosPanel } from "./components/SelectedCursosPanel";
import { ActividadesExtracurriculares } from "./ActividadesExtracurriculares";

interface CursoSeleccionado {
  codigo: string;
  materiaNombre: string;
  cursoNombre: string;
}

interface HorarioBloqueado {
  dia: number;
  hora_inicio: string;
  hora_fin: string;
}

interface Props {
  cursosSeleccionados: CursoSeleccionado[];
  cursosSeleccionadosCodigos: string[];
  prioridadesGuardadas: Record<string, number>;
  onToggleCurso: (curso: CursoSeleccionado) => void;
  onGenerarPlanes: (
    prioridades: Record<string, number>,
    horariosExcluidos: HorarioBloqueado[],
    preferencias: { sede: string; modalidad: string }
  ) => void;
  padron?: string;
  onPrioridadesChange: (p: Record<string, number>) => void;
  sedePreferida: string;
  modalidadPreferida: string;
  maxPlanes: number;
  setSedePreferida: (value: string) => void;
  setModalidadPreferida: (value: string) => void;
  setMaxPlanes: (value: number) => void;
}

export default function PantallaSeleccion({
  cursosSeleccionados,
  cursosSeleccionadosCodigos,
  prioridadesGuardadas,
  onToggleCurso,
  onGenerarPlanes,
  padron,
  onPrioridadesChange,
  sedePreferida,
  modalidadPreferida,
  maxPlanes,
  setSedePreferida,
  setModalidadPreferida,
  setMaxPlanes,
}: Props) {
  const [horariosExcluidos, setHorariosExcluidos] = useState<
    HorarioBloqueado[]
  >([]);

  return (
    <div className="w-full h-full grid grid-cols-3 gap-4 p-6 bg-gray-50 dark:bg-gray-900">
      {/* COLUMNA 1 - BUSCADOR */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-3 text-gray-800 dark:text-gray-100">
          Buscar materias
        </h2>

        <BuscadorMaterias
          cursosSeleccionadosCodigos={cursosSeleccionadosCodigos}
          onToggleCurso={onToggleCurso}
          padron={padron}
        />
      </div>

      {/* COLUMNA 2 - SELECCIÓN Y PRIORIDADES */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 flex flex-col overflow-y-auto">
        <h2 className="text-xl font-bold mb-3 text-gray-800 dark:text-gray-100">
          Cátedras seleccionadas
        </h2>

        <SelectedCursosPanel
          cursos={cursosSeleccionados}
          onGenerarPlanes={(prioridades) =>
            onGenerarPlanes(prioridades, horariosExcluidos, {
              sede: sedePreferida,
              modalidad: modalidadPreferida,
            })
          }
          onRemove={(codigo) =>
            onToggleCurso(
              cursosSeleccionados.find((c) => c.codigo === codigo)!
            )
          }
          prioridadesIniciales={prioridadesGuardadas}
          onPrioridadesChange={onPrioridadesChange}
        />
      </div>

      {/* COLUMNA 3 - PREFERENCIAS Y ACTIVIDADES EXTRACURRICULARES */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-3 text-gray-800 dark:text-gray-100">
          Preferencias adicionales
        </h2>

        <div className="space-y-6">
          {/* SEDE */}
          <div>
            <label
              htmlFor="sede-select"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Sede
            </label>
            <select
              id="sede-select"
              value={sedePreferida}
              onChange={(e) => setSedePreferida(e.target.value)}
              className="w-full border rounded px-2 py-1 mt-1"
            >
              <option value="ANY">Cualquiera</option>
              <option value="PC">Paseo Colón</option>
              <option value="LH">Las Heras</option>
            </select>
          </div>

          {/* MODALIDAD */}
          <div>
            <label
              htmlFor="modalidad-select"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Modalidad
            </label>
            <select
              id="modalidad-select"
              value={modalidadPreferida}
              onChange={(e) => setModalidadPreferida(e.target.value)}
              className="w-full border rounded px-2 py-1 mt-1"
            >
              <option value="ANY">Cualquiera</option>
              <option value="Presencial">Presencial</option>
              <option value="Virtual">Virtual</option>
            </select>
          </div>

          {/* INPUT PARA MÁXIMO DE PLANES */}
          <div>
            <label
              htmlFor="max-planes-input"
              className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
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
              className="w-40 px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
            />
          </div>

          {/* SEPARADOR */}
          <div className="border-t dark:border-gray-700 pt-4">
            <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">
              📅 Actividades extracurriculares
            </h3>
            <ActividadesExtracurriculares
              onHorariosChange={setHorariosExcluidos}
            />
          </div>
        </div>
      </div>
    </div>
  );
}