from flask import Blueprint, jsonify, request
from scheduler import generar_planes, generar_estadisticas, obtener_datos_curso
from test_data import SELECCION_USUARIO

scheduler_bp = Blueprint('scheduler', __name__)

@scheduler_bp.route('/generar-planes', methods=['POST'])
def generar_planes_endpoint():
    """
    Genera planes a partir de una lista de códigos de cursos.
    Espera JSON con formato:
    {
        "cursos": ["CB100-1", "CB100-2", "61.03-1", "75.01-1"],
        "permitir_parciales": false  // Opcional, por defecto False
    }
    """
    try:
        data = request.get_json()
        
        # Validar input
        if not data or 'cursos' not in data:
            return jsonify({
                'success': False,
                'error': 'Se requiere un campo "cursos" con la lista de códigos'
            }), 400
        
        codigos = data['cursos']
        
        if not isinstance(codigos, list) or len(codigos) == 0:
            return jsonify({
                'success': False,
                'error': 'El campo "cursos" debe ser una lista no vacía'
            }), 400
        
        # Límite opcional
        max_planes = data.get('max_planes', 1000)
        
        # Permitir planes parciales (por defecto False)
        permitir_parciales = data.get('permitir_parciales', False)
        
        # Generar planes
        planes = generar_planes(codigos, max_planes=max_planes, permitir_parciales=permitir_parciales)
        # Si no hay planes, devolver error informativo
        if len(planes) == 0:
            return jsonify({
                'success': False,
                'error': 'No se pudieron generar planes sin solapamientos con las materias seleccionadas. Los horarios de los cursos elegidos se superponen completamente.',
                'planes': [],
                'total': 0
            }), 200
        stats = generar_estadisticas(planes, codigos)
        
        return jsonify({
            'success': True,
            'estadisticas': stats,
            'planes': planes,
            'total': len(planes)
        }), 200
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@scheduler_bp.route('/test-hardcoded', methods=['GET'])
def test_hardcoded():
    """Endpoint de prueba con datos hardcodeados"""
    try:
        planes = generar_planes(SELECCION_USUARIO)
        stats = generar_estadisticas(planes, SELECCION_USUARIO)
        
        return jsonify({
            'success': True,
            'cursos_seleccionados': SELECCION_USUARIO,
            'estadisticas': stats,
            'planes': planes[:10],  # Mostrar solo primeros 10
            'total': len(planes)
        }), 200
        
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