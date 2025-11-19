# tests/test_generar_planes_con_prioridades.py
import json
import urllib.request

def test_con_prioridades():
    data = json.dumps({
        'cursos': ['TA045-1', 'TA045-2', 'TC017-1', 'TC017-2', 'TC017-3', 'TA048-1', 'TA048-2', 'TA048-3'],
        'prioridades': {
            'TA045-1': 5,   # Alta prioridad
            'TA045-2': 2,   # Baja prioridad
            'TC017-1': 5,   
            'TC017-2': 3,   
            'TC017-3': 2,   
            'TA048-1': 5,   
            'TA048-2': 3,   
            'TA048-3': 2,   
        },
        'max_planes': 10
    }).encode('utf-8')
    
    req = urllib.request.Request(
        'http://localhost:5000/api/scheduler/generar-planes',
        data=data,
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            print("✅ Planes generados!")
            print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == '__main__':
    test_con_prioridades()