from flask import Blueprint, jsonify, request
from feedback import (
    init_feedback_tables,
    enviar_feedback,
    obtener_modalidad_curso,
    obtener_feedbacks_pendientes,
    obtener_todos_cursos_con_modalidades
)

feedback_bp = Blueprint('feedback', __name__)

# Inicializar tablas al cargar
init_feedback_tables()

@feedback_bp.route('/enviar', methods=['POST'])
def enviar_feedback_endpoint():
    """
    Envía feedback sobre la modalidad de un curso
    
    Esperado:
    {
        "curso_codigo": "61.03-1",
        "modalidad": "presencial",
        "sede": "PC",
        "padron": "12345"
    }
    """
    try:
        data = request.get_json()
        
        required_fields = ['curso_codigo', 'modalidad', 'padron']
        if not all(field in data for field in required_fields):
            return jsonify({
                'success': False,
                'error': 'Faltan campos requeridos'
            }), 400
        
        resultado = enviar_feedback(
            curso_codigo=data['curso_codigo'],
            modalidad=data['modalidad'],
            sede=data.get('sede'),
            padron=data['padron']
        )
        
        status_code = 200 if resultado['success'] else 400
        return jsonify(resultado), status_code
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@feedback_bp.route('/curso/<curso_codigo>/modalidad', methods=['GET'])
def obtener_modalidad_endpoint(curso_codigo):
    """Obtiene la modalidad confirmada de un curso"""
    try:
        modalidad = obtener_modalidad_curso(curso_codigo)
        
        if modalidad:
            return jsonify({
                'success': True,
                'modalidad': modalidad
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Sin modalidad confirmada aún'
            }), 404
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@feedback_bp.route('/curso/<curso_codigo>/feedbacks', methods=['GET'])
def obtener_feedbacks_endpoint(curso_codigo):
    """Obtiene estadísticas de feedbacks pendientes para un curso"""
    try:
        feedbacks = obtener_feedbacks_pendientes(curso_codigo)
        
        return jsonify({
            'success': True,
            'feedbacks': feedbacks
        }), 200
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@feedback_bp.route('/todos-cursos', methods=['GET'])
def obtener_todos_cursos_endpoint():
    """Obtiene todos los cursos con sus modalidades"""
    try:
        cursos = obtener_todos_cursos_con_modalidades()
        
        return jsonify({
            'success': True,
            'cursos': cursos,
            'total': len(cursos)
        }), 200
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500