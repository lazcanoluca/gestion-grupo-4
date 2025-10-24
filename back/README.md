# Backend - Scheduler de Materias

## Instalación

1. Crear un entorno virtual (recomendado):
```bash
python -m venv venv
```

2. Activar el entorno virtual:
- Windows: `.\venv\Scripts\activate`
- Mac/Linux: `source venv/bin/activate`

3. Instalar dependencias:
```bash
pip install -r requirements.txt
```

## Ejecutar el servidor
```bash
python app.py
```

El servidor estará disponible en: `http://localhost:5000`

## Endpoints disponibles

- `POST /api/login` - Login/registro con padrón
- `GET /api/users` - Listar todos los usuarios
- `GET /api/stats` - Estadísticas del sistema
- `GET /api/health` - Estado del servidor