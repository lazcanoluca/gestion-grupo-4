from typing import List, Dict, Any
from collections import defaultdict

def analizar_plan(cursos: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Analiza un plan y devuelve sus características (ventajas/desventajas)
    
    Devuelve:
        Dict con:
        - ventajas: lista de dicts con {tipo, texto, icono}
        - desventajas: lista de dicts con {tipo, texto, icono}
        - score: puntaje general (0-100)

    Lista de ventajas y desventajas actuales:

    Ventajas:
        - Días libres
        - Carga equilibrada entre días
    Desventajas:
        - Huecos grandes entre clases (+2 horas)
        - Cambio de sede en un mismo día
        - Días muy cargados (4+ materias)
        - Clases temprano (antes de las 9)
    """
    ventajas = []
    desventajas = []
    
    # Organizar clases por día
    clases_por_dia = defaultdict(list)
    for curso in cursos:
        for clase in curso['clases']:
            clases_por_dia[clase['dia']].append({
                'curso': curso,
                'clase': clase
            })
    
    # Días libres
    dias_con_clases = set(clases_por_dia.keys())
    dias_totales = 6  # No se toma el domingo
    dias_libres = dias_totales - len(dias_con_clases)
    
    if dias_libres >= 2:
        ventajas.append({
            'tipo': 'dias_libres',
            'texto': f'{dias_libres} días sin clases',
            'icono': '🌴',
            'color': 'green'
        })
    elif dias_libres == 1:
        ventajas.append({
            'tipo': 'dias_libres',
            'texto': '1 día sin clases',
            'icono': '🌴',
            'color': 'green'
        })
    
    # Clases espaciadas en un mismo día
    # (Asumimos que un hueco grande es >= 2 horas)
    HORAS_NOMBRE = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    
    for dia, clases_dia in clases_por_dia.items():
        if len(clases_dia) < 2:
            continue
            
        clases_ordenadas = sorted(clases_dia, key=lambda x: x['clase']['hora_inicio'])
        
        for i in range(len(clases_ordenadas) - 1):
            fin_actual = clases_ordenadas[i]['clase']['hora_fin']
            inicio_siguiente = clases_ordenadas[i + 1]['clase']['hora_inicio']
            
            fin_h, fin_m = map(int, fin_actual.split(':'))
            inicio_h, inicio_m = map(int, inicio_siguiente.split(':'))
            
            hueco_minutos = (inicio_h * 60 + inicio_m) - (fin_h * 60 + fin_m)
            
            if hueco_minutos >= 120:
                horas_hueco = hueco_minutos // 60
                desventajas.append({
                    'tipo': 'hueco_grande',
                    'texto': f'{HORAS_NOMBRE[dia]}: {horas_hueco}h libre entre clases',
                    'icono': '⏰',
                    'color': 'yellow'
                })
    
    # Sedes diferentes en un mismo día
    # (asumiendo que tenemos info de sede/aula)
    for dia, clases_dia in clases_por_dia.items():
        if len(clases_dia) < 2:
            continue
        
        # Extraer sedes únicas (asumimos que aulas con letras similares = misma sede)
        # Por ahora, detectamos si hay "PC" vs otras aulas
        sedes = set()
        for item in clases_dia:
            aula = item['clase'].get('aula', '')
            if 'PC' in aula or 'pc' in aula.lower():
                sedes.add('Paseo Colón')
            elif 'LH' in aula or 'lh' in aula.lower():
                sedes.add('Las Heras')
            elif aula and aula != 'Aula a determinar':
                sedes.add('Sede Principal')
        
        if len(sedes) > 1:
            desventajas.append({
                'tipo': 'cambio_sede',
                'texto': f'{HORAS_NOMBRE[dia]}: Cambio de sede',
                'icono': '🚌',
                'color': 'red'
            })
    
    # Días muy cargados
    for dia, clases_dia in clases_por_dia.items():
        if len(clases_dia) >= 4:
            total_materias = len(set(item['curso']['materia']['codigo'] for item in clases_dia))
            desventajas.append({
                'tipo': 'dia_cargado',
                'texto': f'{HORAS_NOMBRE[dia]}: {total_materias} materias en un día',
                'icono': '😰',
                'color': 'orange'
            })
    
    # Clases muy temprano (antes de las 9)
    clases_tempranas = []
    for dia, clases_dia in clases_por_dia.items():
        for item in clases_dia:
            hora_inicio = int(item['clase']['hora_inicio'].split(':')[0])
            if hora_inicio < 9:
                clases_tempranas.append(HORAS_NOMBRE[dia])
                break
    
    if len(clases_tempranas) >= 3:
        desventajas.append({
            'tipo': 'clases_tempranas',
            'texto': f'{len(clases_tempranas)} días con clases antes de las 9',
            'icono': '🌅',
            'color': 'yellow'
        })
    
    # Distribución equilibrada
    cantidad_por_dia = [len(clases) for clases in clases_por_dia.values()]
    if cantidad_por_dia:
        max_clases = max(cantidad_por_dia)
        min_clases = min(cantidad_por_dia)
        if max_clases - min_clases <= 2:
            ventajas.append({
                'tipo': 'equilibrado',
                'texto': 'Carga equilibrada entre días',
                'icono': '⚖️',
                'color': 'blue'
            })
    
    score = 50  # default score
    score += len(ventajas) * 10
    score -= len(desventajas) * 20
    score = max(0, min(100, score))  # clamp entre 0-100
    
    return {
        'ventajas': ventajas,
        'desventajas': desventajas,
        'score': score,
        'total_flags': len(ventajas) + len(desventajas)
    }