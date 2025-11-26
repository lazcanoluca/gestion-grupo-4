import requests
import json

def importar_desde_archivo(archivo_path):
    """
    Lee un archivo de texto con el contenido del SIU y lo envía al backend
    """
    with open(archivo_path, 'r', encoding='utf-8') as f:
        texto_siu = f.read()
    
    response = requests.post(
        'http://localhost:5000/api/siu/parse-siu',
        json={
            'texto': texto_siu,
            'padron': '100000'  # Opcional
        }
    )
    
    if response.ok:
        data = response.json()
        print(f"✅ Importación exitosa!")
        print(f"📊 Estadísticas:")
        print(f"   - Periodos: {data['stats']['periodos']}")
        print(f"   - Materias: {data['stats']['total_materias']}")
        print(f"   - Cursos: {data['stats']['total_cursos']}")
        print(f"   - Guardados en BD: {data['stats']['saved_to_db']}")
    else:
        print(f"❌ Error: {response.json()}")

if __name__ == '__main__':
    # Guarda el texto del SIU en un archivo llamado "siu_data.txt"
    importar_desde_archivo('siu_data.txt')