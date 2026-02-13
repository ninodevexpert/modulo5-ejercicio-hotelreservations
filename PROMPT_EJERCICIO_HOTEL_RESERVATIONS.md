# Prompt sugerido para arrancar el proyecto

Quiero que actúes como un experto en desarrollo web full stack y me ayudes a llevar esta aplicación de chat de reservas hoteleras desde una base visual a una versión funcional real, manteniendo el estilo simple que ya tiene y priorizando claridad de código por encima de complejidad innecesaria.

Partimos de una web que ya tiene la interfaz de chat, panel de resumen de reserva y flujo visual básico. Ahora necesito que integres la funcionalidad completa para que el asistente pueda conversar de verdad con OpenAI, tomar decisiones durante la conversación y ejecutar acciones de negocio mediante function calling.

El objetivo es que el asistente pueda resolver el flujo típico de una reserva: primero consultar disponibilidad, luego calcular el precio, y finalmente confirmar la reserva cuando el usuario lo solicite. Para eso quiero que implementes estas funciones en backend (pueden usar datos mock en memoria, sin base de datos): `check_availability(city, check_in, check_out, guests)`, `get_room_price(room_type, nights)`, y `create_reservation(hotel, guest_info, dates)`.

Necesito que uses OpenAI Responses API (no Chat Completions), y que integres function calling correctamente: el modelo decide cuándo llamar funciones, el backend ejecuta la función correspondiente, devuelve el resultado al modelo y el modelo continúa la conversación hasta dar una respuesta final útil para el usuario. También quiero que la conversación mantenga contexto entre turnos usando `previous_response_id` para que se sienta realmente conversacional.

Para la experiencia de usuario, quiero streaming de respuesta para que el texto aparezca progresivamente en el chat y no como un bloque al final. Además, quiero que el panel lateral de resumen se actualice con datos consistentes usando Structured Output con JSON Schema (por ejemplo ciudad, fechas, huéspedes, hotel, tipo de habitación, noches, precio estimado, estado y `reservationId`). Si falta algún dato, quiero que aparezca `Pendiente`.

Configura el proyecto para que la API key se gestione en un archivo `.env` (yo completaré `OPENAI_API_KEY`). Incluye también `.env.example` y deja todo listo para ejecutar en local con comandos simples. Asegúrate de que la app funcione correctamente en `http://localhost` y que no dependa de abrir `index.html` con `file://`.

Quiero el código comentado de forma didáctica en las partes clave: definición de tools, loop de function calling, uso de `previous_response_id`, generación del resumen estructurado y manejo del streaming hacia el frontend. No necesito sobreingeniería: prefiero una implementación limpia, clara y mantenible.

Mantén temperatura objetivo `0.3` para precisión, pero si el modelo elegido no soporta el parámetro `temperature`, evita romper la app y aplica una solución compatible automáticamente.

Al final, entrégame un resumen claro de lo que cambiaste archivo por archivo, cómo ejecutar el proyecto, qué validaste y cualquier limitación conocida.
