from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

DATABASE = 'scheduler.db'

def get_db():
    """Get database connection"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize the database with users table"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            padron TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    """
    Login/Register user with just padron (implicit registration)
    If padron exists -> login
    If padron doesn't exist -> register and login
    """
    try:
        data = request.get_json()
        padron = data.get('padron', '').strip()
        
        # Validation
        if not padron or len(padron) < 4:
            return jsonify({'error': 'Padrón debe tener al menos 4 caracteres'}), 400
        
        conn = get_db()
        cursor = conn.cursor()
        
        # Check if user exists
        cursor.execute('SELECT * FROM users WHERE padron = ?', (padron,))
        user = cursor.fetchone()
        
        if user:
            # User exists - update last login
            cursor.execute(
                'UPDATE users SET last_login = ? WHERE padron = ?',
                (datetime.now(), padron)
            )
            conn.commit()
            message = 'Login exitoso'
            is_new_user = False
        else:
            # User doesn't exist - create new user
            try:
                cursor.execute(
                    'INSERT INTO users (padron) VALUES (?)',
                    (padron,)
                )
                conn.commit()
                message = 'Usuario registrado exitosamente'
                is_new_user = True
            except sqlite3.IntegrityError:
                # Race condition: user was created between check and insert
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
    """Get all users (for testing/admin purposes)"""
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
        
        return jsonify({
            'user': dict(user)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/user/<padron>', methods=['DELETE'])
def delete_user(padron):
    """Delete a user (for testing purposes)"""
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
        
        # Total users
        cursor.execute('SELECT COUNT(*) as total FROM users')
        total = cursor.fetchone()['total']
        
        # New users today
        cursor.execute('''
            SELECT COUNT(*) as today 
            FROM users 
            WHERE DATE(created_at) = DATE('now')
        ''')
        today = cursor.fetchone()['today']
        
        # Active users today (logged in today)
        cursor.execute('''
            SELECT COUNT(*) as active 
            FROM users 
            WHERE DATE(last_login) = DATE('now')
        ''')
        active = cursor.fetchone()['active']
        
        conn.close()
        
        return jsonify({
            'total_users': total,
            'new_users_today': today,
            'active_users_today': active
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
        print('Database created successfully!')
    else:
        print('Database already exists')
    
    print('\n' + '='*50)
    print('🚀 Flask Backend Started')
    print('='*50)
    print('📍 Server: http://localhost:5000')
    print('📍 Health: http://localhost:5000/api/health')
    print('📍 Stats:  http://localhost:5000/api/stats')
    print('📍 Users:  http://localhost:5000/api/users')
    print('='*50 + '\n')
    
    app.run(debug=True, port=5000)