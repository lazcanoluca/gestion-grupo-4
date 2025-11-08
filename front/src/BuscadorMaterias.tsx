import { useEffect, useState } from "react";

interface Materia {
  codigo: string;
  nombre: string;
  creditos: number | null;
}

export function BuscadorMaterias() {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [filtro, setFiltro] = useState("");
  const [materiasFiltradas, setMateriasFiltradas] = useState<Materia[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchMaterias = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("http://localhost:5000/api/siu/materias");
        const data = await response.json();

        if (!data.success) throw new Error(data.error || "Error al obtener materias");
        setMaterias(data.materias);
        setMateriasFiltradas(data.materias);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al obtener materias");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMaterias();
  }, []);

  useEffect(() => {
    const texto = filtro.toLowerCase();
    setMateriasFiltradas(
      materias.filter((m) => m.nombre.toLowerCase().includes(texto))
    );
  }, [filtro, materias]);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Buscar Materias
      </h2>

      <input
        type="text"
        placeholder="Escribí el nombre de la materia..."
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        className="w-full p-2 border rounded-md mb-4 shadow-sm focus:ring focus:ring-indigo-200"
      />

      {isLoading && <p className="text-gray-500">Cargando materias...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!isLoading && !error && materiasFiltradas.length === 0 && (
        <p className="text-gray-500">No se encontraron materias.</p>
      )}

      <ul className="max-h-80 overflow-y-auto border rounded-md bg-white shadow-sm divide-y">
        {materiasFiltradas.map((materia) => (
          <li
            key={materia.codigo}
            className="p-3 hover:bg-indigo-50 cursor-pointer flex justify-between items-center"
          >
            <span className="text-gray-800">{materia.nombre}</span>
            <span className="text-sm text-gray-500">{materia.codigo}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
