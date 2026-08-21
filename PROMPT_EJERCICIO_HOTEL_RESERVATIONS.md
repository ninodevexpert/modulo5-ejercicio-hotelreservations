# Enunciado — Function calling con Responses API

Completa el backend de este asistente de reservas sin modificar la interfaz.

## Objetivo

Implementar un flujo conversacional capaz de:

1. Consultar disponibilidad mediante `check_availability`.
2. Calcular precios mediante `get_room_price`.
3. Confirmar reservas mediante `create_reservation`.
4. Mantener contexto entre turnos con `previous_response_id`.
5. Actualizar el resumen lateral mediante Structured Outputs.

## Requisitos

- Usa OpenAI Responses API, no Chat Completions.
- Procesa todos los elementos `function_call` devueltos por el modelo.
- Ejecuta la función local correspondiente.
- Devuelve cada resultado como `function_call_output` usando el mismo `call_id`.
- Continúa el loop hasta recibir una respuesta sin llamadas pendientes.
- Mantén un límite máximo de rondas.
- Conserva los eventos NDJSON que consume `app.js`.
- No expongas argumentos o resultados completos de tools al navegador.
- Usa el JSON Schema incluido para generar el resumen estructurado.

## Punto de partida

La UI, Express, los datos mock, las funciones locales, los schemas y los
helpers ya están preparados. Busca `TODO 1`, `TODO 2` y `TODO 3` en
`server.js` y completa únicamente esos bloques.

## Criterios de aceptación

- El chat mantiene una conversación de varios turnos.
- El modelo consulta disponibilidad antes de inventar resultados.
- Una reserva solo se crea cuando el usuario la confirma y aporta sus datos.
- El panel lateral refleja los datos conocidos y muestra `Pendiente` en el resto.
- `npm test` no presenta fallos y los tests TODO se sustituyen por tests reales.
