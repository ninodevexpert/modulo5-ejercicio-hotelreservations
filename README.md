# modulo5-ejercicio-hotelreservations

Edición 2 - Ejercicio 1: Asistente de reservas hoteleras con OpenAI Responses API.

## Estado del proyecto

Implementación completa del flujo conversacional con:

- UI de chat + panel de resumen de reserva
- Backend Express
- Function calling real con Responses API
- Soporte multi-turn con `previous_response_id`
- Streaming al frontend mediante NDJSON
- Structured Output (`json_schema`) para resumen consistente

## Funciones del ejercicio implementadas

- `check_availability(city, check_in, check_out, guests)`
- `get_room_price(room_type, nights)`
- `create_reservation(hotel, guest_info, dates)`

Se usan datos mock en memoria para practicar el flujo completo sin base de datos.

## Stack

- Node.js + Express
- OpenAI SDK (`responses.create`)
- Frontend HTML/CSS/JS vanilla

## Configuración

1. Instala dependencias:

```bash
npm install
```

2. Configura variables en `.env`:

```env
OPENAI_API_KEY=tu_api_key
OPENAI_MODEL=gpt-5-mini
OPENAI_TEMPERATURE=0.3
PORT=3000
```

3. Inicia la app:

```bash
npm run dev
```

4. Abre el navegador en:

- `http://localhost:3000`

## Estructura principal

- `server.js`: API backend, tools, loop de function calling, structured output y streaming
- `app.js`: cliente del chat, consumo de stream y actualización de resumen
- `index.html`: layout de la interfaz
- `styles.css`: estilos de UI
- `.env.example`: plantilla de variables de entorno
- `PROMPT_EJERCICIO_HOTEL_RESERVATIONS.md`: prompt maestro para pedir esta implementación desde cero

## Notas de implementación

- Temperatura objetivo `0.3` para precisión; solo se envía si el modelo soporta `temperature`.
- Si el modelo no soporta `temperature` (por ejemplo algunos `gpt-5`), la app evita el error 400 omitiendo ese parámetro.
- Los schemas de tools están en modo estricto (`strict: true`) y con `required` compatibles.
- El resumen lateral del chat se alimenta desde Structured Output, no por parsing manual de texto libre.

## Troubleshooting

- Error CORS con `file://`:
  - No abras `index.html` por doble click.
  - Ejecuta el servidor y entra por `http://localhost:3000`.

- Error de API key:
  - Verifica que `.env` tenga `OPENAI_API_KEY` válido.

- Error de modelo/parámetros:
  - Cambia `OPENAI_MODEL` si estás usando uno no disponible en tu cuenta.

## Scripts

- `npm run dev`: levanta el servidor local
- `npm start`: equivalente para ejecución normal
