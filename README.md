# modulo5-ejercicio-hotelreservations

Edición 2: Ejercicio 1 Reserva de hoteles.

## Implementación actual (rama `codex/end-exercise`)

Se integró una versión funcional del ejercicio usando **OpenAI Responses API** con:

- Function calling real en backend
- Flujo conversacional multi-turn con `previous_response_id`
- Streaming de respuesta al frontend (NDJSON)
- Structured Output (`json_schema`) para resumen de reserva
- UI de chat conectada al backend

## Herramientas del ejercicio implementadas

- `check_availability(city, check_in, check_out, guests)`
- `get_room_price(room_type, nights)`
- `create_reservation(hotel, guest_info, dates)`

Estas tools están implementadas en `server.js` con datos mock en memoria para practicar el flujo completo sin base de datos.

## Configuración

1. Instala dependencias:

```bash
npm install
```

2. Edita `.env` y agrega tu API key:

```env
OPENAI_API_KEY=tu_api_key_aqui
OPENAI_MODEL=gpt-5-mini
PORT=3000
```

3. Levanta el servidor:

```bash
npm run dev
```

4. Abre en navegador:

- `http://localhost:3000`

## Estructura relevante

- `server.js`: backend Express + integración Responses API
- `index.html`: estructura de la UI
- `styles.css`: estilos
- `app.js`: cliente del chat con consumo de stream
- `.env.example`: ejemplo de variables de entorno

## Notas de implementación

- `temperature` objetivo `0.3` para priorizar precisión (se envía solo en modelos que soportan ese parámetro).
- La UI consume `POST /api/chat/stream` y renderiza deltas en tiempo real.
- El resumen lateral se llena desde Structured Output, no desde regex local.
- Todo el código clave de API está comentado para facilitar el aprendizaje.
