const SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]


export function parseSIU(rawdata) {
  // en windows los saltos de linea son \r\n, asi que los borramos para que el parser funcione sin importar el sistema operativo
  rawdata = rawdata.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  const result = [];

  console.error("DEBUG: Rawdata length =", rawdata.length);
  console.error("DEBUG: Primeros 300 chars =", rawdata.slice(0, 300));

  const periodoPattern = /Período lectivo:\s*([^\n]+)\n([\s\S]*?)(?=Período lectivo:|$)/g;
  
  const periodos = [];
  let periodoMatch;
  
  while ((periodoMatch = periodoPattern.exec(rawdata)) !== null) {
    const periodoNombre = periodoMatch[1].trim();
    const periodoFullText = periodoMatch[2];
    
    console.error(`Found periodo: ${periodoNombre}`);
    console.error(`  Periodo text length: ${periodoFullText.length}`);
    
    periodos.push({
      periodo: periodoNombre,
      raw: periodoFullText,
      materias: [],
      cursos: [],
    });
  }

  console.error(`Total periodos found: ${periodos.length}`);

  for (let periodo of periodos) {
    console.error(`\nProcessing periodo: ${periodo.periodo}`);

    const materiaPattern = /Actividad:\s*([^\n(]+)\s*\(([^)]+)\)([\s\S]*?)(?=Actividad:|$)/g;
    let materiaMatch;
    
    while ((materiaMatch = materiaPattern.exec(periodo.raw)) !== null) {
      const materiaNombre = materiaMatch[1].trim();
      const materiaCodigo = materiaMatch[2].trim();
      const materiaFullText = materiaMatch[3];
      
      console.error(`  Found materia: ${materiaNombre} (${materiaCodigo})`);
      
      const materia = {
        nombre: materiaNombre,
        codigo: materiaCodigo,
        cursos: [],
      };

      const cursosPattern = /Comisión:\s*([^\n]+)\n[\s\S]*?Docentes:\s*([^\n]+)\n[\s\S]*?Tipo de clase\s+Día\s+Horario(?:\s+Aula)?\n([\s\S]*?)(?=Comisión:|Actividad:|$)/g;
      let cursoMatch;
      
      while ((cursoMatch = cursosPattern.exec(materiaFullText)) !== null) {
        const comisionRaw = cursoMatch[1].trim();
        const docentes = cursoMatch[2].trim().replace(/\(.*?\)/g, "").trim();
        const clasesText = cursoMatch[3];
        
        // 🔥 ARREGLO: Parsear correctamente la comisión
        // Formato: "CURSO: 02-Buchwald" o "CURSO: 1" o "02-Buchwald" o "1"
        let numeroCurso = comisionRaw;
        let nombreCatedra = null;
        
        // Si tiene "CURSO:" lo sacamos
        let comision = comisionRaw.replace(/^CURSO:\s*/i, '').trim();
        
        // Si tiene guión, separamos número de nombre
        if (comision.includes('-')) {
          const parts = comision.split('-');
          numeroCurso = parts[0].trim();
          nombreCatedra = parts.slice(1).join('-').trim(); // Por si hay más guiones
        } else {
          numeroCurso = comision;
          nombreCatedra = null;
        }
        
        // Limpiar ceros a la izquierda: "02" -> "2"
        numeroCurso = numeroCurso.replace(/^0+/, '') || '0';
        
        const cursoCodigo = `${materiaCodigo}-${numeroCurso}`;
        console.error(`    Found curso: ${cursoCodigo}`);
        console.error(`      Numero: ${numeroCurso}`);
        console.error(`      Catedra: ${nombreCatedra || 'N/A'}`);
        console.error(`      Docentes: ${docentes}`);
        console.error(`      Clases text length: ${clasesText.length}`);

        const clases = [];
        const lines = clasesText.split('\n');
        
        for (let claseLine of lines) {
          claseLine = claseLine.trim();
          if (!claseLine) continue;
          
          let diaEncontrado = null;
          let diaIndex = -1;
          
          // buscar si la linea dice algun día de la semana
          for (let i = 0; i < SEMANA.length; i++) {
            if (claseLine.includes(SEMANA[i])) {
              diaEncontrado = SEMANA[i];
              diaIndex = i;
              break;
            }
          }
          
          if (diaEncontrado === null) {
            continue;
          }

          // parseo
          const parts = claseLine.split('\t').map(p => p.trim()).filter(p => p);
          
          if (parts.length < 3) {
            console.error(`      Skipping line (not enough parts): ${claseLine}`);
            continue;
          }
          
          // el horario tiene formato "HH:MM a HH:MM"
          let horario = null;
          for (let part of parts) {
            if (/\d{2}:\d{2}\s+a\s+\d{2}:\d{2}/.test(part)) {
              horario = part;
              break;
            }
          }
          
          if (!horario) {
            console.error(`      Skipping line (no valid horario): ${claseLine}`);
            continue;
          }
          
          const [inicio, fin] = horario.split(/\s+a\s+/);
          const clase = {
            dia: diaIndex,
            inicio: inicio.trim(),
            fin: fin.trim(),
          };
          
          console.error(`      Parsed clase: ${diaEncontrado} ${inicio} a ${fin}`);
          clases.push(clase);
        }

        if (clases.length === 0) {
          console.error(`      No valid clases found, skipping curso`);
          continue;
        }

        periodo.cursos.push({
          materia: materiaCodigo,
          codigo: cursoCodigo,
          numero: numeroCurso,
          catedra: nombreCatedra,
          docentes: docentes,
          clases,
        });
        materia.cursos.push(cursoCodigo);
      }

      if (materia.cursos.length === 0) {
        console.error(`    No cursos found for materia, skipping`);
        continue;
      }
      
      periodo.materias.push(materia);
    }

    if (periodo.materias.length === 0) {
      console.error(`  No materias found for periodo, skipping`);
      continue;
    }
    
    result.push({
      periodo: periodo.periodo,
      materias: periodo.materias,
      cursos: periodo.cursos,
      timestamp: Date.now(),
    });
  }
  
  console.error(`\nFinal result: ${result.length} periodo(s)`);
  return result;
}