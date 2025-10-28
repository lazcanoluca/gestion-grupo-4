from flask import Blueprint, request, jsonify
import subprocess
import json
import os
import sqlite3

siu_bp = Blueprint('siu', __name__)

def get_db():
    """Get database connection"""
    conn = sqlite3.connect('scheduler.db')
    conn.row_factory = sqlite3.Row
    return conn

@siu_bp.route('/parse-siu', methods=['POST'])
def parse_siu():
    """
    Endpoint que recibe el texto copiado del SIU, lo parsea y GUARDA en la BD.
    """
    try:
        data = request.get_json()
        
        if not data or 'texto' not in data:
            return jsonify({
                'success': False,
                'error': 'No se proporcionó el texto del SIU'
            }), 400
        
        raw_text = data['texto']
        padron = data.get('padron')  # Opcional: asociar a un usuario
        
        if not raw_text or not raw_text.strip():
            return jsonify({
                'success': False,
                'error': 'El texto está vacío'
            }), 400
        
        # Obtener la ruta del directorio del backend
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Ejecutar el parser de JavaScript
        result = subprocess.run(
            ['node', os.path.join(backend_dir, 'run_siuparser.mjs')],
            input=raw_text,
            capture_output=True,
            text=True,
            encoding='utf-8',
            timeout=30
        )
        
        if result.returncode != 0:
            print("Error en el parser:")
            print(result.stderr)
            return jsonify({
                'success': False,
                'error': 'Error al procesar el texto del SIU',
                'details': result.stderr
            }), 500
        
        # Parsear el JSON devuelto
        try:
            parsed_data = json.loads(result.stdout)
            
            if not parsed_data or len(parsed_data) == 0:
                return jsonify({
                    'success': False,
                    'error': 'No se pudieron extraer materias del texto proporcionado'
                }), 400
            
            # 🔥 GUARDAR EN LA BASE DE DATOS
            conn = get_db()
            cursor = conn.cursor()
            
            saved_count = 0
            for periodo in parsed_data:
                for materia in periodo['materias']:
                    for curso_codigo in materia['cursos']:
                        # Buscar el curso completo
                        curso = next(
                            (c for c in periodo['cursos'] if c['codigo'] == curso_codigo),
                            None
                        )
                        
                        if curso:
                            # Insertar curso en la BD
                            cursor.execute('''
                                INSERT OR REPLACE INTO cursos 
                                (codigo, materia_nombre, materia_codigo, periodo, docentes, clases_json, padron)
                                VALUES (?, ?, ?, ?, ?, ?, ?)
                            ''', (
                                curso['codigo'],
                                materia['nombre'],
                                materia['codigo'],
                                periodo['periodo'],
                                curso['docentes'],
                                json.dumps(curso['clases']),
                                padron
                            ))
                            saved_count += 1
            
            conn.commit()
            conn.close()
            
            # Calcular estadísticas
            stats = {
                'periodos': len(parsed_data),
                'total_materias': sum(len(p['materias']) for p in parsed_data),
                'total_cursos': sum(len(p['cursos']) for p in parsed_data),
                'saved_to_db': saved_count
            }
            
            return jsonify({
                'success': True,
                'data': parsed_data,
                'stats': stats
            }), 200
            
        except json.JSONDecodeError as e:
            print(f"Error al decodificar JSON: {e}")
            return jsonify({
                'success': False,
                'error': 'Error al procesar la respuesta del parser'
            }), 500
    
    except subprocess.TimeoutExpired:
        return jsonify({
            'success': False,
            'error': 'El procesamiento tardó demasiado tiempo'
        }), 504
    
    except Exception as e:
        print(f"Error inesperado: {e}")
        return jsonify({
            'success': False,
            'error': 'Error interno del servidor',
            'details': str(e)
        }), 500


@siu_bp.route('/cursos', methods=['GET'])
def get_cursos():
    """
    Obtener todos los cursos guardados (opcionalmente filtrados por padrón)
    """
    try:
        padron = request.args.get('padron')
        
        conn = get_db()
        cursor = conn.cursor()
        
        if padron:
            cursor.execute('''
                SELECT * FROM cursos 
                WHERE padron = ? OR padron IS NULL
                ORDER BY periodo, materia_nombre, codigo
            ''', (padron,))
        else:
            cursor.execute('''
                SELECT * FROM cursos 
                ORDER BY periodo, materia_nombre, codigo
            ''')
        
        cursos = cursor.fetchall()
        conn.close()
        
        # Convertir a lista de diccionarios y parsear JSON de clases
        result = []
        for curso in cursos:
            curso_dict = dict(curso)
            curso_dict['clases'] = json.loads(curso_dict['clases_json'])
            del curso_dict['clases_json']
            result.append(curso_dict)
        
        return jsonify({
            'success': True,
            'cursos': result,
            'total': len(result)
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@siu_bp.route('/materias', methods=['GET'])
def get_materias():
    """
    Obtener lista de materias únicas (sin duplicados de cursos)
    """
    try:
        padron = request.args.get('padron')
        
        conn = get_db()
        cursor = conn.cursor()
        
        if padron:
            cursor.execute('''
                SELECT DISTINCT materia_codigo, materia_nombre, periodo
                FROM cursos 
                WHERE padron = ? OR padron IS NULL
                ORDER BY periodo, materia_nombre
            ''', (padron,))
        else:
            cursor.execute('''
                SELECT DISTINCT materia_codigo, materia_nombre, periodo
                FROM cursos 
                ORDER BY periodo, materia_nombre
            ''')
        
        materias = cursor.fetchall()
        conn.close()
        
        return jsonify({
            'success': True,
            'materias': [dict(m) for m in materias],
            'total': len(materias)
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@siu_bp.route('/cursos/<codigo>', methods=['GET'])
def get_curso(codigo):
    """
    Obtener un curso específico por su código
    """
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM cursos WHERE codigo = ?', (codigo,))
        curso = cursor.fetchone()
        conn.close()
        
        if not curso:
            return jsonify({
                'success': False,
                'error': 'Curso no encontrado'
            }), 404
        
        curso_dict = dict(curso)
        curso_dict['clases'] = json.loads(curso_dict['clases_json'])
        del curso_dict['clases_json']
        
        return jsonify({
            'success': True,
            'curso': curso_dict
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@siu_bp.route('/test-parser', methods=['GET'])
def test_parser():
    """
    Endpoint de prueba que verifica que el parser de Node.js esté funcionando.
    """
    try:
        result = subprocess.run(
            ['node', '--version'],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        return jsonify({
            'success': True,
            'node_version': result.stdout.strip(),
            'parser_ready': True
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Node.js no está disponible',
            'details': str(e)
        }), 500