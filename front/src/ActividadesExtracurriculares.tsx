import { useState } from "react";

interface HorarioBloqueado {
  dia: number;
  hora_inicio: string;
  hora_fin: string;
}

interface Props {
  onHorariosChange: (horarios: HorarioBloqueado[]) => void;
}

const DIAS_SEMANA = [
  { id: 0, nombre: "Lunes" },
  { id: 1, nombre: "Martes" },
  { id: 2, nombre: "Miércoles" },
  { id: 3, nombre: "Jueves" },
  { id: 4, nombre: "Viernes" },
  { id: 5, nombre: "Sábado" },
];

// Horarios de 8:00 a 22:00 en bloques de 1 hora
const HORARIOS_DIA = [
  { inicio: "08:00", fin: "09:00" },
  { inicio: "09:00", fin: "10:00" },
  { inicio: "10:00", fin: "11:00" },
  { inicio: "11:00", fin: "12:00" },
  { inicio: "12:00", fin: "13:00" },
  { inicio: "13:00", fin: "14:00" },
  { inicio: "14:00", fin: "15:00" },
  { inicio: "15:00", fin: "16:00" },
  { inicio: "16:00", fin: "17:00" },
  { inicio: "17:00", fin: "18:00" },
  { inicio: "18:00", fin: "19:00" },
  { inicio: "19:00", fin: "20:00" },
  { inicio: "20:00", fin: "21:00" },
  { inicio: "21:00", fin: "22:00" },
];

export function ActividadesExtracurriculares({ onHorariosChange }: Props) {
  const [diasExpandidos, setDiasExpandidos] = useState<Set<number>>(new Set());
  const [horariosSeleccionados, setHorariosSeleccionados] = useState<
    Set<string>
  >(new Set());

  const toggleDia = (diaId: number) => {
    const newSet = new Set(diasExpandidos);
    if (newSet.has(diaId)) {
      newSet.delete(diaId);
    } else {
      newSet.add(diaId);
    }
    setDiasExpandidos(newSet);
  };

  const generarKey = (dia: number, inicio: string, fin: string) => {
    return `${dia}-${inicio}-${fin}`;
  };

  const toggleHorario = (dia: number, inicio: string, fin: string) => {
    const key = generarKey(dia, inicio, fin);
    const newSet = new Set(horariosSeleccionados);

    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }

    setHorariosSeleccionados(newSet);

    // Convertir Set a array de objetos para enviar al padre
    const horariosArray: HorarioBloqueado[] = Array.from(newSet).map(
      (keyStr) => {
        const [diaStr, horaInicio, horaFin] = keyStr.split("-");
        return {
          dia: parseInt(diaStr),
          hora_inicio: horaInicio,
          hora_fin: horaFin,
        };
      }
    );

    onHorariosChange(horariosArray);
  };

  const contarHorariosDia = (dia: number) => {
    return Array.from(horariosSeleccionados).filter((key) =>
      key.startsWith(`${dia}-`)
    ).length;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-600">
          Selecciona los horarios que no quieres ocupar
        </p>
        {horariosSeleccionados.size > 0 && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
            {horariosSeleccionados.size} bloqueados
          </span>
        )}
      </div>

      <div className="space-y-1 max-h-[500px] overflow-y-auto">
        {DIAS_SEMANA.map((dia) => {
          const isExpanded = diasExpandidos.has(dia.id);
          const horariosCount = contarHorariosDia(dia.id);

          return (
            <div key={dia.id} className="border rounded-lg overflow-hidden">
              {/* Header del día */}
              <button
                onClick={() => toggleDia(dia.id)}
                className="w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg
                    className={`w-4 h-4 transition-transform ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  <span className="font-medium">{dia.nombre}</span>
                </div>

                {horariosCount > 0 && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                    {horariosCount}
                  </span>
                )}
              </button>

              {/* Lista de horarios */}
              {isExpanded && (
                <div className="p-2 bg-white space-y-1">
                  {HORARIOS_DIA.map((horario) => {
                    const key = generarKey(dia.id, horario.inicio, horario.fin);
                    const isSelected = horariosSeleccionados.has(key);

                    return (
                      <label
                        key={key}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-red-50 hover:bg-red-100"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() =>
                            toggleHorario(dia.id, horario.inicio, horario.fin)
                          }
                          className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                        />
                        <span className="text-sm">
                          {horario.inicio} - {horario.fin}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}