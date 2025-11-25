import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

import plan_analyzer
from plan_analyzer import analizar_plan

plan_test = [
    {
        'codigo': 'CB100-1',
        'materia': {'codigo': 'CB100', 'nombre': 'Algoritmos'},
        'clases': [
            {'dia': 0, 'hora_inicio': '09:00', 'hora_fin': '12:00', 'aula': '201-PC'},
            {'dia': 2, 'hora_inicio': '14:00', 'hora_fin': '17:00', 'aula': '201-PC'},
        ]
    },
    {
        'codigo': '61.03-1',
        'materia': {'codigo': '61.03', 'nombre': 'Física'},
        'clases': [
            {'dia': 1, 'hora_inicio': '08:00', 'hora_fin': '11:00', 'aula': '301-LH'},
        ]
    }
]

resultado = analizar_plan(plan_test)
print("Análisis del plan:")
print(f"Score: {resultado['score']}")
print(f"Ventajas: {len(resultado['ventajas'])}")
print(f"Desventajas: {len(resultado['desventajas'])}")

for ventaja in resultado['ventajas']:
    print(f"  ✓ {ventaja['icono']} {ventaja['texto']}")

for desventaja in resultado['desventajas']:
    print(f"  ! {desventaja['icono']} {desventaja['texto']}")