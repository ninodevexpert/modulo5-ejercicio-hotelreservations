# Asistente de reservas — plantilla de inicio

Proyecto base para practicar **OpenAI Responses API**, **function calling**,
continuidad multi-turn y **Structured Outputs**.

La interfaz y la estructura principal del backend ya están preparadas. El
objetivo del ejercicio es completar únicamente la integración con OpenAI y la
orquestación de las tools.

## Qué incluye la plantilla

- UI completa de chat, resumen de reserva y monitor de estado.
- Backend Express y endpoint NDJSON `POST /api/chat/stream`.
- Cliente oficial de OpenAI configurado mediante variables de entorno.
- Catálogo de hoteles y lógica de negocio mock.
- Funciones locales listas para usar:
  - `check_availability`
  - `get_room_price`
  - `create_reservation`
- Definiciones estrictas de las tres tools.
- JSON Schema del resumen de reserva.
- Helpers de parsing, configuración y extracción de respuestas.
- Tests de la base y tests pendientes que marcan los objetivos del ejercicio.

## Trabajo del alumno

Busca `TODO` en [server.js](./server.js). Debes completar tres bloques:

1. **Loop de function calling**
   - Primera llamada a `client.responses.create`.
   - Lectura de los elementos `function_call`.
   - Continuación mediante `previous_response_id`.
   - Límite de rondas para evitar loops infinitos.

2. **Ejecución de tools**
   - Parsear `call.arguments`.
   - Localizar y ejecutar el handler correspondiente.
   - Crear resultados estables de éxito o error.
   - Conservar el `call_id` al construir cada `function_call_output`.

3. **Resumen estructurado**
   - Nueva llamada a Responses API.
   - Configurar `text.format` con `json_schema`.
   - Utilizar `RESERVATION_SUMMARY_SCHEMA` y `strict: true`.
   - Devolver `Pendiente` cuando falte información.

No es necesario modificar la UI ni crear una base de datos.

## Instalación

```bash
npm install
cp .env.example .env
```

Completa tu clave en `.env`:

```env
OPENAI_API_KEY=tu_api_key
OPENAI_MODEL=gpt-5-mini
PORT=3000
```

Inicia la aplicación:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Contrato con el frontend

El backend debe mantener estos eventos NDJSON:

- `status`: actualización de fase.
- `tool`: nombre de la función que se está ejecutando.
- `delta`: fragmento de texto del asistente.
- `done`: respuesta completa, `responseId` y resumen.
- `error`: error recuperable mostrado en el chat.

El frontend ya conserva el último `responseId` y lo envía como
`previousResponseId` en el siguiente turno.

## Tests

```bash
npm test
```

Al inicio deben pasar los tests de infraestructura y aparecer tres tests
marcados como `TODO`. Cuando completes el ejercicio, sustituye esos tests
pendientes por comprobaciones reales del loop, las tools y el resumen.

## Referencia

[Function calling — documentación oficial de OpenAI](https://developers.openai.com/api/docs/guides/function-calling)
