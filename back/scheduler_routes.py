from flask import Blueprint, jsonify, request
from scheduler import generar_planes, generar_estadisticas, obtener_datos_curso, curso_cumple_preferencias
from plan_analyzer import analizar_plan

scheduler_bp = Blueprint('scheduler', __name__)

@scheduler_bp.route('/generar-planes', methods=['POST'])
def generar_planes_endpoint():
    """
    Genera planes a partir de una lista de códigos de cursos.
    Espera JSON con formato:
    {
        "cursos": ["CB100-1", "CB100-2", "61.03-1", "75.01-1"],
        "prioridades": {
            "CB100-1": 5,   // 5 es la prioridad más alta
            "CB100-2": 3
        }
        "permitir_parciales": false  // Opcional, por defecto False
        "max_planes"
        "preferencias": {
            "sede": "ANY", // ANY | PC | LH
            "modalidad": "ANY", // ANY | presencial | virtual
        }
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'cursos' not in data:
            return jsonify({
                'success': False,
                'error': 'Se requiere un campo "cursos" con la lista de códigos'
            }), 400
        
        codigos = data['cursos']
        prioridades = data.get('prioridades', {})
        max_planes = data.get('max_planes', 1000)
        permitir_parciales = data.get('permitir_parciales', False)
        preferencias = data.get('preferencias', {
            'sede': 'ANY',
            'modalidad': 'ANY'
        })
        horarios_excluidos = data.get('horarios_excluidos', [])

        # codigos_filtrados = []
        # for codigo in codigos_originales:
        #     info = obtener_datos_curso(codigo)
        #     if info and curso_cumple_preferencias(info, preferencias):
        #         codigos_filtrados.append(codigo)

        # if not isinstance(codigos_filtrados, list) or len(codigos_filtrados) == 0:
        #     return jsonify({
        #         'success': False,
        #         'error': 'El campo "cursos" debe ser una lista no vacía'
        #     }), 400

        # Generar planes
        planes = generar_planes(codigos, max_planes=max_planes, permitir_parciales=permitir_parciales, horarios_excluidos=horarios_excluidos, preferencias=preferencias)
        
        if len(planes) == 0:
            return jsonify({
                'success': False,
                'error': 'No se pudieron generar planes sin solapamientos',
                'planes': [],
                'total': 0
            }), 200
        
        # Calcular prioridad acumulada para cada plan
        planes_con_prioridad = []
        for plan in planes:
            prioridad_total = sum(
                prioridades.get(curso['codigo'], 3) for curso in plan  # Default: 3
            )

            analisis = analizar_plan(plan)

            planes_con_prioridad.append({
                'cursos': plan,
                'prioridad_total': prioridad_total,
                'analisis': analisis
            })
        
        # Ordenar por prioridad descendente (5 = máxima prioridad)
        planes_con_prioridad.sort(key=lambda p: p['prioridad_total'], reverse=True)
        
        # Extraer cursos manteniendo compatibilidad
        planes_ordenados = [p['cursos'] for p in planes_con_prioridad]
        prioridades_totales = [p['prioridad_total'] for p in planes_con_prioridad]
        analisis_planes = [p['analisis'] for p in planes_con_prioridad]

        stats = generar_estadisticas(planes_ordenados, codigos)
        stats['prioridades_totales'] = prioridades_totales[:10]  # Primeros 10
        
        respuesta = {
            'success': True,
            'estadisticas': stats,
            'planes': planes_ordenados,
            'analisis': analisis_planes,
            'total': len(planes_ordenados)
        }
        
        if stats.get("advertencia_nunca_usados"):
            respuesta['tipo_advertencia'] = 'advertencia_nunca_usados'
            respuesta['advertencia'] = stats["advertencia_nunca_usados"]
        
        return jsonify(respuesta), 200
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@scheduler_bp.route('/curso/<codigo>', methods=['GET'])
def get_curso_detalle(codigo):
    """Obtiene detalles de un curso específico"""
    try:
        curso = obtener_datos_curso(codigo)
        if not curso:
            return jsonify({
                'success': False,
                'error': 'Curso no encontrado'
            }), 404
        
        return jsonify({
            'success': True,
            'curso': curso
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500