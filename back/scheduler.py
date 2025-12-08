from typing import List, Dict, Any
from itertools import combinations
import sqlite3

def get_db():
    conn = sqlite3.connect('scheduler.db')
    conn.row_factory = sqlite3.Row
    return conn

def clase_en_horarios_excluidos(clase: Dict, excluidos: List[Dict]) -> bool:
    for ex in excluidos:
        if clase['dia'] != ex['dia']:
            continue

        def to_min(h):
            h, m = map(int, h.split(':'))
            return h * 60 + m
        
        inicio_c = to_min(clase['hora_inicio'])
        fin_c = to_min(clase['hora_fin'])
        inicio_e = to_min(ex['hora_inicio'])
        fin_e = to_min(ex['hora_fin'])

        if not (fin_c <= inicio_e or fin_e <= inicio_c):
            return True
        
    return False

def curso_cumple_preferencias(curso: Dict, prefs: Dict[str, str]) -> bool:
    """
    Devuelve True si el curso coincide con las preferencias del usuario.
    - Los cursos con datos desconocidos o sin confirmar NO se filtran.
    """

    sede_pref = prefs.get("sede", "ANY")
    mod_pref = prefs.get("modalidad", "ANY")

    # Sede desconocida → se acepta siempre
    sede_curso = curso['sede']
    if sede_curso not in ("PC", "LH"):
        sede_ok = True
    else:
        sede_ok = (sede_pref == "ANY" or sede_curso == sede_pref)

    # Modalidad sin_confirmar o hibrida → se acepta siempre
    modalidad_curso = curso['modalidad']
    if modalidad_curso not in ("presencial", "virtual"):
        mod_ok = True
    else:
        mod_ok = (mod_pref == "ANY" or modalidad_curso == mod_pref)

    return sede_ok and mod_ok


def obtener_datos_curso(curso_codigo: str) -> Dict[str, Any]:
    """Obtiene todos los datos de un curso desde la BD"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Obtener info del curso y materia
    cursor.execute('''
        SELECT 
            c.codigo, c.numero_curso, c.catedra, c.periodo, c.sede, c.modalidad, c.votos_modalidad,
            m.codigo as materia_codigo, m.nombre as materia_nombre
        FROM cursos c
        JOIN materias m ON c.materia_codigo = m.codigo
        WHERE c.codigo = ?
    ''', (curso_codigo,))
    
    curso = cursor.fetchone()
    if not curso:
        print(f"No se encontro el curso con codigo {curso_codigo}")
        conn.close()
        return None
    
    # Obtener clases
    cursor.execute('''
        SELECT dia, hora_inicio, hora_fin
        FROM clases
        WHERE curso_codigo = ?
        ORDER BY dia, hora_inicio
    ''', (curso_codigo,))
    clases = [dict(row) for row in cursor.fetchall()]
    
    # Obtener docentes
    cursor.execute('''
        SELECT docente_nombre
        FROM curso_docentes
        WHERE curso_codigo = ?
    ''', (curso_codigo,))
    docentes = [row['docente_nombre'] for row in cursor.fetchall()]
    
    conn.close()
    
    return {
        'codigo': curso['codigo'],
        'numero_curso': curso['numero_curso'],
        'catedra': curso['catedra'],
        'periodo': curso['periodo'],
        'sede': curso['sede'],
        'modalidad': curso['modalidad'],
        'materia': {
            'codigo': curso['materia_codigo'],
            'nombre': curso['materia_nombre']
        },
        'clases': clases,
        'docentes': docentes
    }

def clases_se_solapan(clase1: Dict, clase2: Dict) -> bool:
    """
    Verifica si dos clases se solapan en horario.
    Cada clase tiene: dia (0-6), hora_inicio (HH:MM), hora_fin (HH:MM)
    """
    # Si son días diferentes, no se solapan
    if clase1['dia'] != clase2['dia']:
        return False
    
    # Convertir horarios a minutos desde medianoche para comparar
    def hora_a_minutos(hora_str: str) -> int:
        h, m = map(int, hora_str.split(':'))
        return h * 60 + m
    
    inicio1 = hora_a_minutos(clase1['hora_inicio'])
    fin1 = hora_a_minutos(clase1['hora_fin'])
    inicio2 = hora_a_minutos(clase2['hora_inicio'])
    fin2 = hora_a_minutos(clase2['hora_fin'])
    
    # Se solapan si hay intersección en los rangos
    return not (fin1 <= inicio2 or fin2 <= inicio1)

def cursos_se_solapan(curso1: Dict, curso2: Dict) -> bool:
    """
    Verifica si dos cursos tienen alguna clase que se solape
    """
    for clase1 in curso1['clases']:
        for clase2 in curso2['clases']:
            if clases_se_solapan(clase1, clase2):
                return True
    return False

def agrupar_cursos_por_materia(cursos: List[Dict]) -> Dict[str, List[Dict]]:
    """
    Agrupa cursos por materia.
    Retorna: {materia_codigo: [lista de cursos de esa materia]}
    """
    materias = {}
    for curso in cursos:
        materia_codigo = curso['materia']['codigo']
        if materia_codigo not in materias:
            materias[materia_codigo] = []
        materias[materia_codigo].append(curso)
    return materias

def generar_planes(codigos_cursos: List[str], max_planes: int = 1000, permitir_parciales: bool = False, horarios_excluidos: List[Dict] = None, preferencias: Dict[str, str] = None) -> List[List[Dict]]:
    """
    Genera todas las combinaciones posibles de cursos que cumplan:
    1. No se solapen horariamente
    2. A lo sumo un curso por materia
    3. Si permitir_parciales=False, solo devuelve planes con todas las materias
    
    Args:
        codigos_cursos: Lista de códigos de cursos seleccionados por el usuario
        max_planes: Límite máximo de planes a generar (para evitar explosión combinatoria)
        permitir_parciales: Si es False, solo devuelve planes que incluyen todas las materias
        
    Returns:
        Lista de planes válidos (cada plan es una lista de cursos)
    """

    if horarios_excluidos is None:
        horarios_excluidos = []

    if preferencias is None:
        preferencias = {"sede": "ANY", "modalidad": "ANY"}

    # 1. Obtener datos completos de todos los cursos
    cursos_datos = []
    for codigo in codigos_cursos:
        datos = obtener_datos_curso(codigo)
        if datos:
            cursos_datos.append(datos)
    
    if not cursos_datos:
        return []
    
    # 2. Determinar cuántas materias únicas hay
    materias_unicas = set(curso['materia']['codigo'] for curso in cursos_datos)
    total_materias = len(materias_unicas)

    # Filtrar por sede y modalidad
    cursos_filtrados_pref = []
    for curso in cursos_datos:
        if curso_cumple_preferencias(curso, preferencias):
            cursos_filtrados_pref.append(curso)

    cursos_datos = cursos_filtrados_pref

    # Filtrar cursos que tengan clases en horarios excluidos
    if horarios_excluidos:
        cursos_filtrados = []
        for curso in cursos_datos:
            tiene_prohibido = any(
                clase_en_horarios_excluidos(clase, horarios_excluidos)
                for clase in curso['clases']
            )
            if not tiene_prohibido:
                cursos_filtrados.append(curso)

        cursos_datos = cursos_filtrados
    
    # 3. Generar todos los subconjuntos posibles de cursos
    planes_validos = []
    
    # Iterar sobre todos los tamaños posibles de combinaciones
    for tamanio in range(1, len(cursos_datos) + 1):
        # Si ya encontramos suficientes planes, parar
        if len(planes_validos) >= max_planes:
            break
            
        # Generar todas las combinaciones de ese tamaño
        for combinacion in combinations(cursos_datos, tamanio):
            # Si ya encontramos suficientes planes, parar
            if len(planes_validos) >= max_planes:
                break
            
            # Verificar regla 2: a lo sumo un curso por materia
            materias_en_plan = {}
            valido_materias = True
            for curso in combinacion:
                materia_codigo = curso['materia']['codigo']
                if materia_codigo in materias_en_plan:
                    valido_materias = False
                    break
                materias_en_plan[materia_codigo] = curso
            
            if not valido_materias:
                continue
            
            # Si no se permiten planes parciales, verificar que incluya todas las materias
            if not permitir_parciales and len(materias_en_plan) != total_materias:
                continue
            
            # Verificar regla 1: no se solapan horariamente
            sin_solapamientos = True
            for i in range(len(combinacion)):
                for j in range(i + 1, len(combinacion)):
                    if cursos_se_solapan(combinacion[i], combinacion[j]):
                        sin_solapamientos = False
                        break
                if not sin_solapamientos:
                    break
            
            if sin_solapamientos:
                planes_validos.append(list(combinacion))
    
    # 4. Ordenar planes por cantidad de materias (de mayor a menor)
    # Los planes con más materias son más valiosos
    planes_validos.sort(key=lambda p: len(p), reverse=True)
    
    return planes_validos

def generar_estadisticas(planes: List[List[Dict]], codigos_originales: List[str]) -> Dict:
    """Genera estadísticas sobre los planes generados"""
    if not planes:
        return {
            'total_planes': 0,
            'total_cursos_seleccionados': len(codigos_originales),
            'max_materias_simultaneas': 0,
            'min_materias_simultaneas': 0,
            'promedio_materias': 0,
            'materias_incluidas': [],
            'cursos_nunca_usados': [],
            'mensaje': 'No se pudieron generar planes sin solapamientos. Los cursos seleccionados se solapan completamente.'
        }
    
    # Calcular estadísticas
    max_materias = max(len(plan) for plan in planes)
    min_materias = min(len(plan) for plan in planes)
    promedio_materias = sum(len(plan) for plan in planes) / len(planes)
    
    # Obtener todas las materias únicas incluidas en algún plan
    materias_incluidas = set()
    cursos_usados = set()
    
    for plan in planes:
        for curso in plan:
            materias_incluidas.add(curso['materia']['codigo'])
            cursos_usados.add(curso['codigo'])
    
    # Cursos que nunca aparecen en ningún plan
    cursos_nunca_usados = [codigo for codigo in codigos_originales if codigo not in cursos_usados]

    # Obtener los nombres de las materias y cátedras que no aparecen en ningún plan
    info_nunca_usados = []
    for curso in cursos_nunca_usados:
        info = obtener_datos_curso(curso)
        info_nunca_usados.append(f"{info['materia']['nombre']} - {info['catedra']}")

    return {
        'total_planes': len(planes),
        'total_cursos_seleccionados': len(codigos_originales),
        'max_materias_simultaneas': max_materias,
        'min_materias_simultaneas': min_materias,
        'promedio_materias': round(promedio_materias, 2),
        'materias_incluidas': list(materias_incluidas),
        'cursos_nunca_usados': cursos_nunca_usados,
        'advertencia_nunca_usados': f"Los siguientes cursos no aparecen en ningún plan:\n {'\n'.join(info_nunca_usados)}" if info_nunca_usados else None,
        'mensaje': f'Se generaron {len(planes)} planes válidos con hasta {max_materias} materias simultáneas'
    }