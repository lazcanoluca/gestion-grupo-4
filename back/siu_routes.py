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

def parsear_docentes(docentes_str):
    """
    Parsear string de docentes y devolver lista limpia
    Ej: "Juan Perez, Maria Lopez" -> ["Juan Perez", "Maria Lopez"]
    """
    if not docentes_str:
        return []
    
    # Separar por comas y limpiar espacios
    docentes = [d.strip() for d in docentes_str.split(',')]
    
    # Filtrar strings vacíos
    docentes = [d for d in docentes if d]
    
    return docentes


@siu_bp.route('/parse-siu', methods=['POST'])
def parse_siu():
    """
    Endpoint que recibe el texto copiado del SIU, lo parsea y GUARDA en la BD normalizada.
    """
    try:
        data = request.get_json()
        
        if not data or 'texto' not in data:
            return jsonify({
                'success': False,
                'error': 'No se proporcionó el texto del SIU'
            }), 400
        
        raw_text = data['texto']
        padron = data.get('padron')
        
        if not raw_text or not raw_text.strip():
            return jsonify({
                'success': False,
                'error': 'El texto está vacío'
            }), 400
        
        # Ejecutar el parser de JavaScript
        backend_dir = os.path.dirname(os.path.abspath(__file__))
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
        
        # Parsear el JSON
        try:
            parsed_data = json.loads(result.stdout)
            
            if not parsed_data or len(parsed_data) == 0:
                return jsonify({
                    'success': False,
                    'error': 'No se pudieron extraer materias del texto proporcionado'
                }), 400
            
            # 🔥 GUARDAR EN LA BASE DE DATOS NORMALIZADA
            conn = get_db()
            cursor = conn.cursor()
            saved_count = 0
            
            for periodo_data in parsed_data:
                periodo = periodo_data['periodo']
                
                for materia in periodo_data['materias']:
                    # 1. Insertar materia
                    cursor.execute('''
                        INSERT OR REPLACE INTO materias (codigo, nombre)
                        VALUES (?, ?)
                    ''', (materia['codigo'], materia['nombre']))
                    
                    # 2. Insertar cada curso de la materia
                    for curso_codigo in materia['cursos']:
                        # Buscar el curso completo en la lista de cursos
                        curso = next(
                            (c for c in periodo_data['cursos'] if c['codigo'] == curso_codigo),
                            None
                        )
                        
                        if curso:
                            # Extraer información del curso
                            numero_curso = curso.get('numero', curso_codigo.split('-')[-1])
                            catedra = curso.get('catedra')
                            
                            # 3. Insertar curso
                            cursor.execute('''
                                INSERT OR REPLACE INTO cursos 
                                (codigo, materia_codigo, numero_curso, catedra, periodo)
                                VALUES (?, ?, ?, ?, ?)
                            ''', (curso_codigo, materia['codigo'], numero_curso, catedra, periodo))
                            
                            # Limpiar docentes y clases anteriores
                            cursor.execute('DELETE FROM curso_docentes WHERE curso_codigo = ?', (curso_codigo,))
                            cursor.execute('DELETE FROM clases WHERE curso_codigo = ?', (curso_codigo,))
                            
                            # 4. Parsear y guardar docentes
                            docentes_lista = parsear_docentes(curso['docentes'])
                            for nombre_docente in docentes_lista:
                                if not nombre_docente.strip():
                                    continue
                                
                                # Insertar docente
                                cursor.execute('''
                                    INSERT OR IGNORE INTO docentes (nombre)
                                    VALUES (?)
                                ''', (nombre_docente,))
                                
                                # Asociar docente con curso
                                cursor.execute('''
                                    INSERT OR IGNORE INTO curso_docentes (curso_codigo, docente_nombre)
                                    VALUES (?, ?)
                                ''', (curso_codigo, nombre_docente))
                            
                            # 5. Guardar clases
                            for clase in curso['clases']:
                                cursor.execute('''
                                    INSERT INTO clases 
                                    (curso_codigo, dia, hora_inicio, hora_fin, tipo)
                                    VALUES (?, ?, ?, ?, ?)
                                ''', (
                                    curso_codigo,
                                    clase['dia'],
                                    clase['inicio'],
                                    clase['fin'],
                                    clase.get('tipo')
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
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Error interno del servidor',
            'details': str(e)
        }), 500


@siu_bp.route('/materias', methods=['GET'])
def get_materias():
    """
    Obtener lista de todas las materias
    """
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT codigo, nombre, creditos
            FROM materias
            ORDER BY nombre
        ''')
        
        materias = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return jsonify({
            'success': True,
            'materias': materias,
            'total': len(materias)
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@siu_bp.route('/materias/<codigo>/cursos', methods=['GET'])
def get_cursos_de_materia(codigo):
    """
    🔥 NUEVO: Obtener todos los cursos de una materia específica
    Ejemplo: GET /api/siu/materias/61.03/cursos
    """
    try:
        periodo = request.args.get('periodo')  # Filtro opcional
        
        conn = get_db()
        cursor = conn.cursor()
        
        # Verificar que la materia existe
        cursor.execute('SELECT * FROM materias WHERE codigo = ?', (codigo,))
        materia = cursor.fetchone()
        
        if not materia:
            conn.close()
            return jsonify({
                'success': False,
                'error': f'Materia {codigo} no encontrada'
            }), 404
        
        # Query base para cursos
        query = '''
            SELECT codigo, numero_curso, catedra, periodo
            FROM cursos
            WHERE materia_codigo = ?
        '''
        params = [codigo]
        
        if periodo:
            query += ' AND periodo = ?'
            params.append(periodo)
        
        query += ' ORDER BY CAST(numero_curso AS INTEGER)'
        
        cursor.execute(query, params)
        cursos = cursor.fetchall()
        
        result = []
        for curso in cursos:
            codigo_curso = curso['codigo']
            numero = curso['numero_curso']
            catedra = curso['catedra']
            
            # Construir nombre del curso: "Curso 2: Buchwald" o "Curso 1"
            if catedra:
                nombre_curso = f"Curso {numero}: {catedra}"
            else:
                nombre_curso = f"Curso {numero}"
            
            # Obtener docentes
            cursor.execute('''
                SELECT docente_nombre as nombre
                FROM curso_docentes
                WHERE curso_codigo = ?
            ''', (codigo_curso,))
            docentes = [row['nombre'] for row in cursor.fetchall()]
            
            # Obtener clases
            cursor.execute('''
                SELECT dia, hora_inicio, hora_fin, tipo, aula
                FROM clases
                WHERE curso_codigo = ?
                ORDER BY dia, hora_inicio
            ''', (codigo_curso,))
            clases = [dict(row) for row in cursor.fetchall()]
            
            result.append({
                'codigo': curso['codigo'],
                'nombre': nombre_curso,
                'numero_curso': curso['numero_curso'],
                'catedra': curso['catedra'],
                'periodo': curso['periodo'],
                'docentes': docentes,
                'clases': clases
            })
        
        conn.close()
        
        return jsonify({
            'success': True,
            'materia': {
                'codigo': materia['codigo'],
                'nombre': materia['nombre'],
                'creditos': materia['creditos']
            },
            'cursos': result,
            'total': len(result)
        }), 200
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@siu_bp.route('/cursos', methods=['GET'])
def get_cursos():
    """
    Obtener todos los cursos con información completa
    Puede filtrar por periodo o materia usando query params
    """
    try:
        periodo = request.args.get('periodo')
        materia_codigo = request.args.get('materia')
        
        conn = get_db()
        cursor = conn.cursor()
        
        # Query base
        query = '''
            SELECT 
                c.codigo, c.numero_curso, c.catedra, c.periodo,
                m.codigo as materia_codigo, m.nombre as materia_nombre
            FROM cursos c
            JOIN materias m ON c.materia_codigo = m.codigo
            WHERE 1=1
        '''
        params = []
        
        if periodo:
            query += ' AND c.periodo = ?'
            params.append(periodo)
        
        if materia_codigo:
            query += ' AND m.codigo = ?'
            params.append(materia_codigo)
        
        query += ' ORDER BY m.nombre, c.numero_curso'
        
        cursor.execute(query, params)
        cursos = cursor.fetchall()
        
        result = []
        for curso in cursos:
            codigo_curso = curso['codigo']
            
            # Obtener docentes
            cursor.execute('''
                SELECT docente_nombre as nombre
                FROM curso_docentes
                WHERE curso_codigo = ?
            ''', (codigo_curso,))
            docentes = [row['nombre'] for row in cursor.fetchall()]
            
            # Obtener clases
            cursor.execute('''
                SELECT dia, hora_inicio, hora_fin, tipo
                FROM clases
                WHERE curso_codigo = ?
                ORDER BY dia, hora_inicio
            ''', (codigo_curso,))
            clases = [dict(row) for row in cursor.fetchall()]
            
            result.append({
                'codigo': curso['codigo'],
                'numero_curso': curso['numero_curso'],
                'catedra': curso['catedra'],
                'periodo': curso['periodo'],
                'materia': {
                    'codigo': curso['materia_codigo'],
                    'nombre': curso['materia_nombre']
                },
                'docentes': docentes,
                'clases': clases
            })
        
        conn.close()
        
        return jsonify({
            'success': True,
            'cursos': result,
            'total': len(result)
        }), 200
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@siu_bp.route('/cursos/<codigo>', methods=['GET'])
def get_curso(codigo):
    """
    Obtener un curso específico por su código completo (ej: "61.03-1")
    """
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Obtener curso y materia
        cursor.execute('''
            SELECT 
                c.codigo, c.numero_curso, c.catedra, c.periodo,
                m.codigo as materia_codigo, m.nombre as materia_nombre
            FROM cursos c
            JOIN materias m ON c.materia_codigo = m.codigo
            WHERE c.codigo = ?
        ''', (codigo,))
        
        curso = cursor.fetchone()
        if not curso:
            conn.close()
            return jsonify({
                'success': False,
                'error': 'Curso no encontrado'
            }), 404
        
        # Obtener docentes
        cursor.execute('''
            SELECT docente_nombre as nombre
            FROM curso_docentes
            WHERE curso_codigo = ?
        ''', (codigo,))
        docentes = [row['nombre'] for row in cursor.fetchall()]
        
        # Obtener clases
        cursor.execute('''
            SELECT dia, hora_inicio, hora_fin, tipo
            FROM clases
            WHERE curso_codigo = ?
            ORDER BY dia, hora_inicio
        ''', (codigo,))
        clases = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return jsonify({
            'success': True,
            'curso': {
                'codigo': curso['codigo'],
                'numero_curso': curso['numero_curso'],
                'catedra': curso['catedra'],
                'periodo': curso['periodo'],
                'materia': {
                    'codigo': curso['materia_codigo'],
                    'nombre': curso['materia_nombre']
                },
                'docentes': docentes,
                'clases': clases
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@siu_bp.route('/test-parser', methods=['GET'])
def test_parser():
    """
    Endpoint de prueba para verificar que Node.js está disponible
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