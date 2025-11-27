import sqlite3
from datetime import datetime
from typing import Dict, List, Optional

def get_db():
    conn = sqlite3.connect('scheduler.db')
    conn.row_factory = sqlite3.Row
    return conn

def enviar_feedback(curso_codigo: str, modalidad: str, sede: Optional[str], padron: str) -> Dict:
    """
    Guarda el feedback de un usuario sobre la modalidad de un curso
    
    modalidad: 'virtual', 'presencial', 'hibrido'
    sede: 'PC', 'LH' o None si es virtual
    """
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Validar que el curso existe
        cursor.execute('SELECT codigo FROM cursos WHERE codigo = ?', (curso_codigo,))
        if not cursor.fetchone():
            return {'success': False, 'error': 'Curso no encontrado'}
        
        # Validar modalidad
        if modalidad not in ['virtual', 'presencial', 'hibrido']:
            return {'success': False, 'error': 'Modalidad inválida'}
        
        # Validar sede si no es virtual
        if modalidad != 'virtual' and sede not in ['PC', 'LH', None]:
            return {'success': False, 'error': 'sede inválido'}
        
        # Guardar feedback
        # Si el usuario ya voto por primera vez, se inserta
        # Si el usuario voto antes, se actualiza su voto (no se suma un voto nuevo)
        cursor.execute('''
            INSERT INTO feedback_modalidad (curso_codigo, modalidad, sede, usuario_padron)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(curso_codigo, usuario_padron)
            DO UPDATE SET modalidad=excluded.modalidad, sede=excluded.sede
        ''', (curso_codigo, modalidad, sede, padron))
        
        conn.commit()
        conn.close()
        
        # Recalcular consenso
        recalcular_consenso(curso_codigo)
        
        return {'success': True, 'message': 'Feedback enviado correctamente'}
    
    except Exception as e:
        return {'success': False, 'error': str(e)}

def recalcular_consenso(curso_codigo: str, umbral: int = 3) -> bool:
    """
    Recalcula el consenso de un curso.
    Si hay al menos 'umbral' votos para una modalidad, se confirma en la tabla cursos.
    
    Retorna True si se actualizó el consenso
    """
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Obtener todos los feedbacks para este curso
        cursor.execute('''
            SELECT modalidad, sede, COUNT(*) as votos
            FROM feedback_modalidad
            WHERE curso_codigo = ?
            GROUP BY modalidad, sede
            ORDER BY votos DESC
        ''', (curso_codigo,))
        
        resultados = cursor.fetchall()
        
        if not resultados:
            conn.close()
            return False
        
        # Obtener el voto más popular
        voto_top = resultados[0]
        
        # Si el voto top supera el umbral, actualizar en cursos
        if voto_top['votos'] >= umbral:
            modalidad = voto_top['modalidad']
            sede = voto_top['sede']
            votos = voto_top['votos']
            
            cursor.execute('''
                UPDATE cursos
                SET modalidad = ?, sede = ?, votos_modalidad = ?
                WHERE codigo = ?
            ''', (modalidad, sede, votos, curso_codigo))
            
            conn.commit()
            conn.close()
            return True
        
        conn.close()
        return False
    
    except Exception as e:
        print(f"Error al recalcular consenso: {e}")
        return False

def obtener_modalidad_curso(curso_codigo: str) -> Optional[Dict]:
    """Obtiene la modalidad confirmada de un curso"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT modalidad, sede, votos_modalidad
            FROM cursos
            WHERE codigo = ?
        ''', (curso_codigo,))
        
        resultado = cursor.fetchone()
        conn.close()
        
        if resultado and resultado['modalidad'] != 'sin_confirmar':
            return {
                'modalidad': resultado['modalidad'],
                'sede': resultado['sede'],
                'votos_totales': resultado['votos_modalidad']
            }
        
        return None
    
    except Exception as e:
        print(f"Error al obtener modalidad: {e}")
        return None

def obtener_feedbacks_pendientes(curso_codigo: str) -> Dict:
    """Obtiene estadísticas de feedbacks pendientes para un curso"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT modalidad, sede, COUNT(*) as votos
            FROM feedback_modalidad
            WHERE curso_codigo = ?
            GROUP BY modalidad, sede
            ORDER BY votos DESC
        ''', (curso_codigo,))
        
        resultados = cursor.fetchall()
        conn.close()
        
        if not resultados:
            return {'votaciones': [], 'total_votos': 0}
        
        total_votos = sum(row['votos'] for row in resultados)
        
        votaciones = [
            {
                'modalidad': row['modalidad'],
                'sede': row['sede'],
                'votos': row['votos'],
                'porcentaje': round((row['votos'] / total_votos) * 100, 1) if total_votos > 0 else 0,
                'falta_para_confirmar': max(0, 3 - row['votos'])
            }
            for row in resultados
        ]
        
        return {'votaciones': votaciones, 'total_votos': total_votos}
    
    except Exception as e:
        print(f"Error al obtener feedbacks pendientes: {e}")
        return {'votaciones': [], 'total_votos': 0}

def obtener_todos_cursos_con_modalidades() -> List[Dict]:
    """Obtiene todos los cursos con sus modalidades"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT 
                c.codigo,
                m.nombre as materia_nombre,
                c.numero_curso,
                c.catedra,
                c.modalidad,
                c.sede,
                c.votos_modalidad
            FROM cursos c
            JOIN materias m ON c.materia_codigo = m.codigo
            ORDER BY m.nombre, c.numero_curso
        ''')
        
        resultados = cursor.fetchall()
        conn.close()
        
        return [
            {
                'codigo': row['codigo'],
                'materia_nombre': row['materia_nombre'],
                'numero_curso': row['numero_curso'],
                'catedra': row['catedra'],
                'modalidad': row['modalidad'],
                'sede': row['sede'],
                'votos_totales': row['votos_modalidad']
            }
            for row in resultados
        ]
    
    except Exception as e:
        print(f"Error al obtener cursos con modalidades: {e}")
        return []

def filtrar_cursos_por_modalidad(modalidad: str, sede: Optional[str] = None) -> List[Dict]:
    """
    Filtra cursos por modalidad.
    
    modalidad: 'virtual', 'presencial', 'hibrido', 'sin_confirmar'
    sede: 'PC', 'LH' (solo si modalidad es presencial/hibrido)
    """
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        if sede:
            cursor.execute('''
                SELECT c.codigo, m.nombre as materia_nombre, c.numero_curso, c.catedra, c.modalidad, c.sede
                FROM cursos c
                JOIN materias m ON c.materia_codigo = m.codigo
                WHERE c.modalidad = ? AND c.sede = ?
                ORDER BY m.nombre
            ''', (modalidad, sede))
        else:
            cursor.execute('''
                SELECT c.codigo, m.nombre as materia_nombre, c.numero_curso, c.catedra, c.modalidad, c.sede
                FROM cursos c
                JOIN materias m ON c.materia_codigo = m.codigo
                WHERE c.modalidad = ?
                ORDER BY m.nombre
            ''', (modalidad,))
        
        resultados = cursor.fetchall()
        conn.close()
        
        return [
            {
                'codigo': row['codigo'],
                'materia_nombre': row['materia_nombre'],
                'numero_curso': row['numero_curso'],
                'catedra': row['catedra'],
                'modalidad': row['modalidad'],
                'sede': row['sede']
            }
            for row in resultados
        ]
    
    except Exception as e:
        print(f"Error al filtrar cursos: {e}")
        return []