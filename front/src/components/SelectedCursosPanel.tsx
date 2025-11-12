interface CursoSeleccionadoMini {
  codigo: string
  materiaNombre: string
  cursoNombre: string
}

interface SelectedCursosPanelProps {
  cursos: CursoSeleccionadoMini[]
  onGenerarPlanes: () => void
  onRemove: (codigo: string) => void
}

export function SelectedCursosPanel({ cursos, onGenerarPlanes, onRemove }: SelectedCursosPanelProps) {
  const hayCursos = cursos.length > 0

  return (
    <div className="border-t border-gray-200 pt-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800">Cursos seleccionados</h3>
        <span className="text-sm text-gray-500">{cursos.length}</span>
      </div>

      {!hayCursos ? (
        <p className="text-sm text-gray-500">
          Todavía no agregaste cursos. Busca una materia para empezar.
        </p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {cursos.map((curso) => (
            <div
              key={curso.codigo}
              className="bg-white border border-gray-200 rounded-lg p-3"
            >
              <p className="text-sm font-semibold text-gray-800">{curso.materiaNombre}</p>
              <p className="text-xs text-gray-600">{curso.cursoNombre}</p>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onGenerarPlanes}
        disabled={!hayCursos}
        className={`mt-4 w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${hayCursos
          ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
          : 'bg-gray-300 cursor-not-allowed'
          }`}
      >
        {hayCursos ? `Generar Planes (${cursos.length} seleccionados)` : 'Generar Planes'}
      </button>
    </div>
  )
}
