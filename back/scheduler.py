from typing import List, Dict, Any
from itertools import combinations
import sqlite3

def get_db():
    conn = sqlite3.connect('scheduler.db')
    conn.row_factory = sqlite3.Row
    return conn

def curso_cumple_preferencias(curso: Dict, prefs: Dict[str, str]) -> bool:
    """
    Devuelve True si el curso coincide con las preferencias del usuario.
    - Los cursos con datos desconocidos o sin confirmar NO se filtran.
    """
    sede_pref = prefs.get("sede", "ANY")
    mod_pref = prefs.get("modalidad", "ANY")

    # Sede desconocida → se acepta siempre
    sede_curso = curso.get('sede', 'desconocida')
    if sede_curso not in ("PC", "LH"):
        sede_ok = True
    else:
        sede_ok = (sede_pref == "ANY" or sede_curso == sede_pref)

    # Modalidad sin_confirmar → se acepta siempre
    modalidad_curso = curso.get('modalidad', 'sin_confirmar')
    if modalidad_curso not in ("Presencial", "Virtual"):
        mod_ok = True
    else:
        mod_ok = (mod_pref == "ANY" or modalidad_curso == mod_pref)

    return sede_ok and mod_ok


def obtener_datos_curso(curso_codigo: str) -> Dict[str, Any]:
    """Obtiene todos los datos de un curso desde la BD"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Obtener info del curso y materia (incluir sede y modalidad si existen)
    cursor.execute('''
        SELECT 
            c.codigo, c.numero_curso, c.catedra, c.periodo,
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
    
    # Obtener clases (sin tipo ni aula)
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
    
    # Intentar obtener sede y modalidad (pueden no existir en la tabla)
    try:
        cursor.execute('''
            SELECT sede, modalidad
            FROM cursos
            WHERE codigo = ?
        ''', (curso_codigo,))
        extra = cursor.fetchone()
        sede = extra['sede'] if extra and 'sede' in extra.keys() else 'desconocida'
        modalidad = extra['modalidad'] if extra and 'modalidad' in extra.keys() else 'sin_confirmar'
    except:
        sede = 'desconocida'
        modalidad = 'sin_confirmar'
    
    conn.close()
    
    return {
        'codigo': curso['codigo'],
        'numero_curso': curso['numero_curso'],
        'catedra': curso['catedra'],
        'periodo': curso['periodo'],
        'sede': sede,
        'modalidad': modalidad,
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
    if clase1['dia'] != clase2['dia']:
        return False
    
    def hora_a_minutos(hora_str: str) -> int:
        h, m = map(int, hora_str.split(':'))
        return h * 60 + m
    
    inicio1 = hora_a_minutos(clase1['hora_inicio'])
    fin1 = hora_a_minutos(clase1['hora_fin'])
    inicio2 = hora_a_minutos(clase2['hora_inicio'])
    fin2 = hora_a_minutos(clase2['hora_fin'])
    
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

def curso_se_solapa_con_horarios_excluidos(
    curso: Dict, 
    horarios_excluidos: List[Dict]
) -> bool:
    """
    Verifica si alguna clase del curso se solapa con horarios excluidos
    
    Args:
        curso: Diccionario con datos del curso (incluyendo clases)
        horarios_excluidos: Lista de dicts con {dia, hora_inicio, hora_fin}
    
    Returns:
        True si hay solapamiento, False si no
    """
    if not horarios_excluidos:
        return False
    
    for clase in curso['clases']:
        for horario_excluido in horarios_excluidos:
            if clases_se_solapan(clase, horario_excluido):
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

def generar_planes(
    codigos_cursos: List[str], 
    max_planes: int = 1000, 
    permitir_parciales: bool = False,
    horarios_excluidos: List[Dict] = None,
    preferencias: Dict[str, str] = None
) -> List[List[Dict]]:
    """
    Genera todas las combinaciones posibles de cursos que cumplan:
    1. No se solapen horariamente
    2. A lo sumo un curso por materia
    3. No se solapen con horarios excluidos (actividades extracurriculares)
    4. Cumplan con las preferencias de sede y modalidad
    5. Si permitir_parciales=False, solo devuelve planes con todas las materias
    
    Args:
        codigos_cursos: Lista de códigos de cursos seleccionados por el usuario
        max_planes: Límite máximo de planes a generar
        permitir_parciales: Si es False, solo devuelve planes que incluyen todas las materias
        horarios_excluidos: Lista de horarios bloqueados (actividades extracurriculares)
        preferencias: Dict con 'sede' y 'modalidad'
        
    Returns:
        Lista de planes válidos (cada plan es una lista de cursos)
    """
    if horarios_excluidos is None:
        horarios_excluidos = []
    
    if preferencias is None:
        preferencias = {'sede': 'ANY', 'modalidad': 'ANY'}
    
    # 1. Obtener datos completos de todos los cursos
    cursos_datos = []
    for codigo in codigos_cursos:
        datos = obtener_datos_curso(codigo)
        if datos:
            cursos_datos.append(datos)
    
    if not cursos_datos:
        return []
    
    # 2. Filtrar cursos según preferencias de sede/modalidad
    cursos_filtrados_prefs = []
    cursos_excluidos_prefs = []
    
    for curso in cursos_datos:
        if curso_cumple_preferencias(curso, preferencias):
            cursos_filtrados_prefs.append(curso)
        else:
            cursos_excluidos_prefs.append(curso)
    
    if cursos_excluidos_prefs:
        print(f"⚠️ {len(cursos_excluidos_prefs)} curso(s) excluidos por preferencias de sede/modalidad")
        for curso in cursos_excluidos_prefs:
            print(f"  - {curso['materia']['nombre']} (Curso {curso['numero_curso']})")
    
    if not cursos_filtrados_prefs:
        return []
    
    # 3. Filtrar cursos que se solapan con horarios excluidos
    cursos_validos = []
    cursos_excluidos_horarios = []
    
    for curso in cursos_filtrados_prefs:
        if curso_se_solapa_con_horarios_excluidos(curso, horarios_excluidos):
            cursos_excluidos_horarios.append(curso)
        else:
            cursos_validos.append(curso)
    
    if cursos_excluidos_horarios:
        print(f"⚠️ {len(cursos_excluidos_horarios)} curso(s) excluidos por solapamiento con actividades extracurriculares")
        for curso in cursos_excluidos_horarios:
            print(f"  - {curso['materia']['nombre']} (Curso {curso['numero_curso']})")
    
    if not cursos_validos:
        return []
    
    # 4. Determinar cuántas materias únicas hay
    materias_unicas = set(curso['materia']['codigo'] for curso in cursos_validos)
    total_materias = len(materias_unicas)
    
    # 5. Generar todos los subconjuntos posibles de cursos
    planes_validos = []
    
    for tamanio in range(1, len(cursos_validos) + 1):
        if len(planes_validos) >= max_planes:
            break
            
        for combinacion in combinations(cursos_validos, tamanio):
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
    
    # 6. Ordenar planes por cantidad de materias (de mayor a menor)
    planes_validos.sort(key=lambda p: len(p), reverse=True)
    
    return planes_validos

def generar_estadisticas(
    planes: List[List[Dict]], 
    codigos_originales: List[str],
    horarios_excluidos: List[Dict] = None
) -> Dict:
    """Genera estadísticas sobre los planes generados"""
    if horarios_excluidos is None:
        horarios_excluidos = []
    
    if not planes:
        mensaje = 'No se pudieron generar planes sin solapamientos.'
        if horarios_excluidos:
            mensaje += f' Tienes {len(horarios_excluidos)} horarios bloqueados que pueden estar limitando las opciones.'
        
        return {
            'total_planes': 0,
            'total_cursos_seleccionados': len(codigos_originales),
            'max_materias_simultaneas': 0,
            'min_materias_simultaneas': 0,
            'promedio_materias': 0,
            'materias_incluidas': [],
            'cursos_nunca_usados': [],
            'horarios_bloqueados': len(horarios_excluidos),
            'mensaje': mensaje
        }
    
    max_materias = max(len(plan) for plan in planes)
    min_materias = min(len(plan) for plan in planes)
    promedio_materias = sum(len(plan) for plan in planes) / len(planes)
    
    materias_incluidas = set()
    cursos_usados = set()
    
    for plan in planes:
        for curso in plan:
            materias_incluidas.add(curso['materia']['codigo'])
            cursos_usados.add(curso['codigo'])
    
    cursos_nunca_usados = [codigo for codigo in codigos_originales if codigo not in cursos_usados]

    info_nunca_usados = []
    for curso in cursos_nunca_usados:
        info = obtener_datos_curso(curso)
        if info:
            info_nunca_usados.append(f"{info['materia']['nombre']} - {info['catedra']}")

    mensaje = f'Se generaron {len(planes)} planes válidos con hasta {max_materias} materias simultáneas'
    if horarios_excluidos:
        mensaje += f' (considerando {len(horarios_excluidos)} horarios bloqueados)'

    return {
        'total_planes': len(planes),
        'total_cursos_seleccionados': len(codigos_originales),
        'max_materias_simultaneas': max_materias,
        'min_materias_simultaneas': min_materias,
        'promedio_materias': round(promedio_materias, 2),
        'materias_incluidas': list(materias_incluidas),
        'cursos_nunca_usados': cursos_nunca_usados,
        'horarios_bloqueados': len(horarios_excluidos),
        'advertencia_nunca_usados': f"Los siguientes cursos no aparecen en ningún plan:\n {'\n'.join(info_nunca_usados)}" if info_nunca_usados else None,
        'mensaje': mensaje
    }