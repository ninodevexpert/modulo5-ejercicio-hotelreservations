# modulo5-ejercicio-hotelreservations

Edición 2: Ejercicio 1 Reserva de hoteles.

## Estado actual (fase 1)

Implementación de **solo UI** para un asistente de reservas hoteleras:

- Chat conversacional (usuario/asistente)
- Respuestas simuladas para flujo de disponibilidad, precio y confirmación
- Panel lateral de resumen de reserva que se actualiza desde el texto del chat
- Acciones rápidas para iniciar conversaciones de ejemplo

No hay integración con backend, OpenAI API ni function calling real todavía.

## Ejecutar la UI

Como es una UI en HTML/CSS/JS vanilla, puedes abrir `index.html` directamente en el navegador.

También puedes levantar un servidor estático simple desde la carpeta del proyecto, por ejemplo:

```bash
python3 -m http.server 8080
```

Y abrir `http://localhost:8080`.
