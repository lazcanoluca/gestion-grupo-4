from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
from datetime import datetime
import os

# Importar el blueprint del SIU
from siu_routes import siu_bp
from scheduler_routes import scheduler_bp
from feedback_routes import feedback_bp

app = Flask(__name__)
CORS(app)

DATABASE = 'scheduler.db'

def get_db():
    """Get database connection"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize the database with normalized tables using natural primary keys"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Tabla de usuarios - PADRON como PRIMARY KEY
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            padron TEXT PRIMARY KEY,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 1. MATERIAS - CODIGO como PRIMARY KEY
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS materias (
            codigo TEXT PRIMARY KEY,
            nombre TEXT NOT NULL,
            creditos INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 2. CURSOS - codigo_completo (ej: "61.03-1") como PRIMARY KEY
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cursos (
            codigo TEXT PRIMARY KEY,
            materia_codigo TEXT NOT NULL,
            numero_curso TEXT NOT NULL,
            catedra TEXT,
            periodo TEXT NOT NULL,
            sede TEXT DEFAULT 'Sede desconocida',
            modalidad TEXT DEFAULT 'sin_confirmar',
            votos_modalidad INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (materia_codigo) REFERENCES materias(codigo) ON DELETE CASCADE,
            UNIQUE(materia_codigo, numero_curso, periodo)
        )
    ''')
    
    # 3. DOCENTES - Nombre como PRIMARY KEY
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS docentes (
            nombre TEXT PRIMARY KEY,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 4. CURSO_DOCENTES - Relación muchos a muchos
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS curso_docentes (
            curso_codigo TEXT NOT NULL,
            docente_nombre TEXT NOT NULL,
            PRIMARY KEY (curso_codigo, docente_nombre),
            FOREIGN KEY (curso_codigo) REFERENCES cursos(codigo) ON DELETE CASCADE,
            FOREIGN KEY (docente_nombre) REFERENCES docentes(nombre) ON DELETE CASCADE
        )
    ''')
    
    # 5. CLASES - Horarios de cada curso
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS clases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            curso_codigo TEXT NOT NULL,
            dia INTEGER NOT NULL,
            hora_inicio TEXT NOT NULL,
            hora_fin TEXT NOT NULL,
            FOREIGN KEY (curso_codigo) REFERENCES cursos(codigo) ON DELETE CASCADE
        )
    ''')
    
    # 6. INSCRIPCIONES - Qué cursos eligió cada usuario
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS inscripciones (
            padron TEXT NOT NULL,
            curso_codigo TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (padron, curso_codigo),
            FOREIGN KEY (padron) REFERENCES users(padron) ON DELETE CASCADE,
            FOREIGN KEY (curso_codigo) REFERENCES cursos(codigo) ON DELETE CASCADE
        )
    ''')

    # 7. FEEDBACK DE MODALIDADES - Votos de usuarios
    # Importante el unique para que un usuario no pueda votar más de una vez por el mismo curso.
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS feedback_modalidad (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            curso_codigo TEXT NOT NULL,
            modalidad TEXT NOT NULL,
            sede TEXT,
            usuario_padron TEXT,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (curso_codigo) REFERENCES cursos(codigo) ON DELETE CASCADE,
            UNIQUE(curso_codigo, usuario_padron)
        )
    ''')
    
    # Índices
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_cursos_materia ON cursos(materia_codigo)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_cursos_periodo ON cursos(periodo)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_cursos_modalidad ON cursos(modalidad)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_clases_curso ON clases(curso_codigo)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_inscripciones_padron ON inscripciones(padron)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_feedback_curso ON feedback_modalidad(curso_codigo)')
    
    conn.commit()
    conn.close()

# Registrar blueprints
app.register_blueprint(siu_bp, url_prefix='/api/siu')
app.register_blueprint(scheduler_bp, url_prefix='/api/scheduler')
app.register_blueprint(feedback_bp, url_prefix='/api/feedback')

@app.route('/api/login', methods=['POST'])
def login():
    """Login/Register user with padron"""
    try:
        data = request.get_json()
        padron = data.get('padron', '').strip()
        
        if not padron or len(padron) < 4:
            return jsonify({'error': 'Padrón debe tener al menos 4 caracteres'}), 400
        
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE padron = ?', (padron,))
        user = cursor.fetchone()
        
        if user:
            cursor.execute(
                'UPDATE users SET last_login = ? WHERE padron = ?',
                (datetime.now(), padron)
            )
            conn.commit()
            message = 'Login exitoso'
            is_new_user = False
        else:
            try:
                cursor.execute('INSERT INTO users (padron) VALUES (?)', (padron,))
                conn.commit()
                message = 'Usuario registrado exitosamente'
                is_new_user = True
            except sqlite3.IntegrityError:
                message = 'Login exitoso'
                is_new_user = False
        
        conn.close()
        
        return jsonify({
            'message': message,
            'padron': padron,
            'is_new_user': is_new_user
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users', methods=['GET'])
def get_users():
    """Get all users"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT padron, created_at, last_login 
            FROM users 
            ORDER BY last_login DESC
        ''')
        users = cursor.fetchall()
        conn.close()
        
        return jsonify({
            'users': [dict(user) for user in users],
            'total': len(users)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/user/<padron>', methods=['GET'])
def get_user(padron):
    """Get specific user information"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE padron = ?', (padron,))
        user = cursor.fetchone()
        conn.close()
        
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        return jsonify({'user': dict(user)}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/user/<padron>', methods=['DELETE'])
def delete_user(padron):
    """Delete a user"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM users WHERE padron = ?', (padron,))
        deleted = cursor.rowcount
        conn.commit()
        conn.close()
        
        if deleted == 0:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        return jsonify({
            'message': f'Usuario {padron} eliminado exitosamente'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get database statistics"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) as total FROM users')
        total_users = cursor.fetchone()['total']
        
        cursor.execute('''
            SELECT COUNT(*) as today 
            FROM users 
            WHERE DATE(created_at) = DATE('now')
        ''')
        new_users = cursor.fetchone()['today']
        
        cursor.execute('''
            SELECT COUNT(*) as active 
            FROM users 
            WHERE DATE(last_login) = DATE('now')
        ''')
        active_users = cursor.fetchone()['active']
        
        cursor.execute('SELECT COUNT(*) as total FROM materias')
        total_materias = cursor.fetchone()['total']
        
        cursor.execute('SELECT COUNT(*) as total FROM cursos')
        total_cursos = cursor.fetchone()['total']
        
        cursor.execute('SELECT COUNT(*) as total FROM docentes')
        total_docentes = cursor.fetchone()['total']
        
        conn.close()
        
        return jsonify({
            'total_users': total_users,
            'new_users_today': new_users,
            'active_users_today': active_users,
            'total_materias': total_materias,
            'total_cursos': total_cursos,
            'total_docentes': total_docentes
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok', 
        'message': 'Backend is running',
        'database': 'connected' if os.path.exists(DATABASE) else 'not found'
    }), 200

if __name__ == '__main__':
    # Initialize database on startup
    if not os.path.exists(DATABASE):
        print('Creating database...')
        init_db()
        print('✅ Database created successfully!')
    else:
        print('Database already exists')
        init_db()  # Asegurar que todas las tablas existan
    
    print('\n' + '='*50)
    print('🚀 Flask Backend Started')
    print('='*50)
    print('📍 Server: http://localhost:5000')
    print('📍 Health: http://localhost:5000/api/health')
    print('📍 Stats:  http://localhost:5000/api/stats')
    print('📍 Users:  http://localhost:5000/api/users')
    print('\n📚 SIU Endpoints:')
    print('📍 Parse SIU: POST http://localhost:5000/api/siu/parse-siu')
    print('📍 Ver materias: GET http://localhost:5000/api/siu/materias')
    print('📍 Ver cursos: GET http://localhost:5000/api/siu/cursos')
    print('📍 Cursos de materia: GET http://localhost:5000/api/siu/materias/<codigo>/cursos')
    print('='*50 + '\n')
    
    app.run(debug=True, port=5000)
