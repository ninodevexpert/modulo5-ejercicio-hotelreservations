# Prompt Maestro: Ejercicio 1 - Asistente de Reservas con Function Calling

Quiero que implementes un proyecto web de **asistente de reservas hoteleras** siguiendo exactamente estas fases, restricciones y criterios de calidad.

## 1) Contexto del ejercicio

Debes construir una app de chat para reservas de hotel donde el asistente pueda:

- consultar disponibilidad,
- calcular precios,
- confirmar reservas,

usando **OpenAI Responses API** con **function calling** en un flujo conversacional real.

Funciones requeridas:

- `check_availability(city, check_in, check_out, guests)`
- `get_room_price(room_type, nights)`
- `create_reservation(hotel, guest_info, dates)`

Requisitos clave:

- `Streaming` para experiencia fluida.
- `Structured Output` para generar un resumen de reserva consistente.
- `Temperature objetivo: 0.3` (aplícalo solo si el modelo lo soporta).

---

## 2) Flujo de trabajo por ramas (obligatorio)

### Fase 1: rama base UI

1. Crear rama desde `main` llamada `codex/start-exercise`.
2. Implementar **solo UI** (sin API ni backend).
3. Debe quedar un chat funcional visualmente, con:
   - listado de mensajes,
   - input + botón enviar,
   - indicador de estado,
   - panel lateral de resumen de reserva,
   - diseño simple y responsive.

### Fase 2: rama funcional

1. Crear rama `codex/end-exercise` naciendo de `codex/start-exercise`.
2. Integrar backend y OpenAI Responses API.
3. Conectar la UI al backend para flujo real de conversación.

---

## 3) Requisitos técnicos de implementación

## Frontend

- Mantener una UI simple pero clara.
- Consumir un endpoint de streaming del backend (por ejemplo NDJSON o SSE).
- Renderizar respuesta del asistente en tiempo real (deltas/chunks).
- Actualizar el panel de resumen con el resultado estructurado.
- Si la app se abre con `file://`, mostrar aviso claro de que debe ejecutarse por `http://localhost:<port>`.

## Backend

- Usar Node.js + Express.
- Servir archivos estáticos del frontend.
- Endpoint de salud (`/health`) y endpoint de chat por streaming (ej: `/api/chat/stream`).
- Implementar las 3 funciones del ejercicio con datos mock en memoria (sin DB real).
- Integrar **Responses API** con:
  - `tools` definidas con schema JSON,
  - loop de function calling (`function_call` -> ejecutar función -> `function_call_output`),
  - soporte conversacional multi-turn con `previous_response_id`.

## Structured Output

- Hacer una llamada para obtener resumen en JSON con `json_schema` estricto.
- El resumen debe incluir, como mínimo:
  - `city`, `checkIn`, `checkOut`, `guests`, `hotel`, `roomType`, `nights`, `estimatedPrice`, `reservationId`, `status`.
- Si falta información, usar `"Pendiente"`.

## Temperatura / compatibilidad de modelos

- Usar temperatura objetivo `0.3`.
- Si el modelo no soporta `temperature`, omitir el parámetro automáticamente para evitar error 400.

## Schemas strict

- Si una tool usa `strict: true`, los objetos deben cumplir reglas estrictas de `required`.
- Asegura que `required` incluya todas las keys necesarias para evitar errores de validación.

---

## 4) Variables de entorno y configuración

Crear en raíz:

- `.env` (con placeholder de API key)
- `.env.example`
- `.gitignore` que ignore `.env` y `node_modules`

Variables esperadas:

- `OPENAI_API_KEY=`
- `OPENAI_MODEL=`
- `PORT=`
- opcional: `OPENAI_TEMPERATURE=0.3`

---

## 5) Calidad del código y documentación

- Dejar el código de integración con OpenAI **comentado de forma pedagógica**:
  - dónde se define `tools`,
  - cómo funciona el loop de function calling,
  - cómo se usa `previous_response_id`,
  - cómo se arma el structured output,
  - cómo se hace streaming al cliente.
- Actualizar `README.md` con:
  - pasos de instalación y ejecución,
  - arquitectura resumida,
  - explicación de fases,
  - troubleshooting básico (ej. error por abrir `file://`).

---

## 6) Criterios de aceptación

La entrega se considera correcta si:

1. Existe rama `codex/start-exercise` con base UI sin backend.
2. Existe rama `codex/end-exercise` con integración funcional.
3. El chat funciona en `http://localhost:<port>` con respuestas del modelo.
4. El backend ejecuta tools mediante function calling real.
5. Se usa structured output para poblar el resumen.
6. Hay streaming visible en la UI.
7. El proyecto no depende de base de datos ni servicios externos aparte de OpenAI.
8. `.env` está preparado para que yo agregue mi API key.

---

## 7) Formato de entrega esperado

Quiero que devuelvas:

1. Resumen de cambios por archivo.
2. Instrucciones exactas para ejecutar localmente.
3. Lista de comprobaciones realizadas.
4. Si hay limitaciones conocidas, explícitalas.

Implementa primero, verifica después y entrega el resultado final completo.
