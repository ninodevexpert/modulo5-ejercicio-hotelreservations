require("dotenv").config();

const path = require("path");
const express = require("express");
const OpenAI = require("openai");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";
const TARGET_TEMPERATURE = Number(process.env.OPENAI_TEMPERATURE || 0.3);
const MAX_TOOL_ROUNDS = 8;

// Cliente oficial de OpenAI. Lee OPENAI_API_KEY desde .env
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// "Base de datos" mock en memoria para el ejercicio.
const HOTEL_CATALOG = {
  madrid: [
    { hotel: "Gran Vía Palace", room_type: "doble", price_per_night: 120, rooms_left: 8 },
    { hotel: "Retiro Suites", room_type: "suite", price_per_night: 210, rooms_left: 3 },
  ],
  barcelona: [
    { hotel: "Ramblas Center", room_type: "doble", price_per_night: 140, rooms_left: 5 },
    { hotel: "Mediterráneo View", room_type: "suite", price_per_night: 240, rooms_left: 2 },
  ],
  valencia: [
    { hotel: "Ciudad de las Artes Inn", room_type: "doble", price_per_night: 110, rooms_left: 7 },
    { hotel: "Turia Premium", room_type: "suite", price_per_night: 190, rooms_left: 4 },
  ],
  sevilla: [
    { hotel: "Giralda Stay", room_type: "doble", price_per_night: 115, rooms_left: 6 },
    { hotel: "Alcázar Select", room_type: "suite", price_per_night: 205, rooms_left: 3 },
  ],
};

const ROOM_BASE_PRICE = {
  individual: 90,
  doble: 120,
  suite: 210,
};

// Prompt del asistente: define el comportamiento para todo el flujo.
const ASSISTANT_INSTRUCTIONS = `
Eres un asistente de reservas hoteleras para usuarios en español.

Reglas operativas:
1) Si el usuario pregunta disponibilidad, usa check_availability.
2) Si el usuario pide precio total, usa get_room_price.
3) Si el usuario confirma reserva y ya hay datos suficientes, usa create_reservation.
4) Si faltan datos, pregunta de forma concreta qué falta (ciudad, fechas, huéspedes, huésped principal, etc.).
5) Responde claro y breve, evitando inventar resultados fuera de las herramientas.
6) Estructura la respuesta en Markdown legible:
   - Separa introducción, resultados y siguiente paso con líneas en blanco.
   - Presenta hoteles u opciones mediante listas con guiones.
   - Presenta los datos que faltan mediante una lista numerada.
   - Usa **negrita** para nombres de hotel, precios y acciones importantes.
   - No uses tablas.
`;

// Definición de tools para Responses API (function calling).
const TOOLS = [
  {
    type: "function",
    name: "check_availability",
    description:
      "Verifica hoteles disponibles según ciudad, fechas y número de huéspedes.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        city: { type: "string", description: "Ciudad destino, por ejemplo Madrid" },
        check_in: { type: "string", description: "Fecha de entrada en formato YYYY-MM-DD" },
        check_out: { type: "string", description: "Fecha de salida en formato YYYY-MM-DD" },
        guests: {
          type: "integer",
          minimum: 1,
          description: "Número total de huéspedes, como entero positivo",
        },
      },
      required: ["city", "check_in", "check_out", "guests"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "get_room_price",
    description: "Calcula el precio total de una habitación para un número de noches.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        room_type: {
          type: "string",
          enum: ["individual", "doble", "suite"],
          description: "Tipo de habitación",
        },
        nights: {
          type: "integer",
          minimum: 1,
          description: "Cantidad de noches, como entero positivo",
        },
      },
      required: ["room_type", "nights"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "create_reservation",
    description: "Crea y confirma una reserva de hotel con datos del huésped y fechas.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        hotel: { type: "string", description: "Nombre del hotel" },
        guest_info: {
          type: "object",
          properties: {
            name: { type: "string", description: "Nombre completo del huésped principal" },
            email: { type: "string", description: "Correo del huésped principal" },
            phone: { type: "string", description: "Teléfono de contacto" },
          },
          required: ["name", "email", "phone"],
          additionalProperties: false,
        },
        dates: {
          type: "object",
          properties: {
            check_in: { type: "string", description: "Fecha de entrada en formato YYYY-MM-DD" },
            check_out: { type: "string", description: "Fecha de salida en formato YYYY-MM-DD" },
          },
          required: ["check_in", "check_out"],
          additionalProperties: false,
        },
      },
      required: ["hotel", "guest_info", "dates"],
      additionalProperties: false,
    },
  },
];

const RESERVATION_SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    city: { type: "string" },
    checkIn: { type: "string" },
    checkOut: { type: "string" },
    guests: { type: "string" },
    hotel: { type: "string" },
    roomType: { type: "string" },
    nights: { type: "string" },
    estimatedPrice: { type: "string" },
    reservationId: { type: "string" },
    status: { type: "string" },
  },
  required: [
    "city",
    "checkIn",
    "checkOut",
    "guests",
    "hotel",
    "roomType",
    "nights",
    "estimatedPrice",
    "reservationId",
    "status",
  ],
  additionalProperties: false,
};

function normalizeCity(city) {
  return String(city || "").trim().toLowerCase();
}

function parseDate(dateText) {
  const d = new Date(`${dateText}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function calculateNights(checkIn, checkOut) {
  const inDate = parseDate(checkIn);
  const outDate = parseDate(checkOut);

  if (!inDate || !outDate) return null;
  const diffMs = outDate.getTime() - inDate.getTime();
  const nights = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return nights > 0 ? nights : null;
}

// Implementación local de las tools del ejercicio.
function checkAvailability({ city, check_in, check_out, guests }) {
  const key = normalizeCity(city);
  const totalGuests = Number(guests);
  const nights = calculateNights(check_in, check_out);

  if (!key) throw new Error("La ciudad es obligatoria.");
  if (!nights) throw new Error("Las fechas no son válidas o el check-out no es posterior al check-in.");
  if (!Number.isInteger(totalGuests) || totalGuests < 1) {
    throw new Error("El número de huéspedes debe ser un entero positivo.");
  }

  const hotels = HOTEL_CATALOG[key] || [];

  const availability = hotels.map((item) => ({
    hotel: item.hotel,
    room_type: item.room_type,
    available: item.rooms_left > 0,
    price_per_night: item.price_per_night,
    total_estimated: item.price_per_night * nights,
  }));

  return {
    city,
    check_in,
    check_out,
    guests: totalGuests,
    nights,
    hotels_found: availability.length,
    availability,
  };
}

function getRoomPrice({ room_type, nights }) {
  const normalizedRoom = String(room_type || "").toLowerCase();
  const totalNights = Number(nights);

  if (!Object.hasOwn(ROOM_BASE_PRICE, normalizedRoom)) {
    throw new Error("El tipo de habitación no está disponible.");
  }
  if (!Number.isInteger(totalNights) || totalNights < 1) {
    throw new Error("El número de noches debe ser un entero positivo.");
  }

  const pricePerNight = ROOM_BASE_PRICE[normalizedRoom];

  return {
    room_type: normalizedRoom,
    nights: totalNights,
    price_per_night: pricePerNight,
    total_price: pricePerNight * totalNights,
    currency: "EUR",
  };
}

function createReservation({ hotel, guest_info, dates }) {
  if (!String(hotel || "").trim()) throw new Error("El hotel es obligatorio.");
  if (!guest_info?.name || !guest_info?.email || !guest_info?.phone) {
    throw new Error("Faltan datos del huésped principal.");
  }
  if (!calculateNights(dates?.check_in, dates?.check_out)) {
    throw new Error("Las fechas de la reserva no son válidas.");
  }

  const reservationId = `RSV-${Date.now().toString().slice(-8)}`;

  return {
    reservation_id: reservationId,
    hotel,
    guest: guest_info,
    dates,
    status: "confirmed",
    created_at: new Date().toISOString(),
  };
}

const TOOL_HANDLERS = {
  check_availability: checkAvailability,
  get_room_price: getRoomPrice,
  create_reservation: createReservation,
};

function safeJsonParse(text, fallback = {}) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function parseToolArguments(call) {
  try {
    return JSON.parse(call.arguments);
  } catch {
    throw new Error(`Argumentos JSON no válidos para la tool ${call.name}.`);
  }
}

async function executeFunctionCall(call) {
  /*
   * TODO 2 — Ejecutar la tool solicitada por el modelo.
   *
   * Pistas:
   * 1. Obtén el handler desde TOOL_HANDLERS usando call.name.
   * 2. Convierte call.arguments de JSON string a objeto con parseToolArguments.
   * 3. Ejecuta el handler pasando los argumentos.
   * 4. Devuelve un objeto con { tool, arguments, result }.
   * 5. Conviene que result tenga una forma estable:
   *      { ok: true, data: ... }
   *      { ok: false, error: ... }
   * 6. Una tool desconocida o un error de validación debe convertirse en un
   *    resultado que el modelo pueda leer y corregir; no cierres el servidor.
   */
  throw new Error("TODO 2: implementa executeFunctionCall(call).");
}

function extractAssistantText(response) {
  // En SDK moderno suele existir output_text; este fallback cubre estructuras alternativas.
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const chunks = [];
  for (const item of response.output || []) {
    if (item.type !== "message") continue;
    for (const content of item.content || []) {
      if (typeof content.text === "string") {
        chunks.push(content.text);
      }
    }
  }

  return chunks.join("\n").trim();
}

function extractFunctionCalls(response) {
  return (response.output || []).filter((item) => item.type === "function_call");
}

function streamChunk(text) {
  // Simula efecto de streaming hacia frontend para UX más fluida.
  const words = text.split(/(\s+)/).filter(Boolean);
  return words;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function supportsTemperature(modelName) {
  // Algunos modelos recientes (p.ej. familia gpt-5) no aceptan el parámetro `temperature`.
  return !String(modelName || "").toLowerCase().startsWith("gpt-5");
}

function withModelOptions(payload) {
  if (supportsTemperature(MODEL)) {
    return {
      ...payload,
      temperature: TARGET_TEMPERATURE,
    };
  }
  return payload;
}

function buildFunctionCallingRequest({ input, previousResponseId }) {
  return withModelOptions({
    model: MODEL,
    instructions: ASSISTANT_INSTRUCTIONS,
    input,
    previous_response_id: previousResponseId || undefined,
    tools: TOOLS,
    tool_choice: "auto",
    // Una reserva es una acción transaccional. Desactivar llamadas paralelas evita
    // que el modelo intente crear más de una reserva dentro de la misma respuesta.
    parallel_tool_calls: false,
    store: true,
  });
}

async function runAssistantWithFunctionCalling({
  userMessage,
  previousResponseId,
  onToolEvent,
  client = openai,
}) {
  /*
   * TODO 1 — Implementar el loop de Responses API + function calling.
   *
   * Flujo esperado:
   * 1. Llama a client.responses.create(...) usando buildFunctionCallingRequest.
   *    El primer input debe contener el mensaje del usuario.
   * 2. Extrae todos los elementos function_call con extractFunctionCalls.
   * 3. Si no quedan function calls, devuelve la respuesta final.
   * 4. Por cada call, invoca executeFunctionCall(call) y notifica
   *    onToolEvent para actualizar el panel de estado de la UI.
   * 5. Crea un input de tipo function_call_output por cada resultado:
   *      {
   *        type: "function_call_output",
   *        call_id: call.call_id,
   *        output: JSON.stringify(resultado)
   *      }
   * 6. Vuelve a llamar a responses.create usando response.id como
   *    previous_response_id.
   * 7. Repite hasta obtener texto final y protege el loop con MAX_TOOL_ROUNDS.
   *
   * Importante: el call_id debe conservarse exactamente.
   */
  void userMessage;
  void previousResponseId;
  void onToolEvent;
  void client;
  throw new Error("TODO 1: implementa el loop de function calling.");
}

async function buildStructuredReservationSummary({ userMessage, assistantReply, toolTrace }) {
  /*
   * TODO 3 — Generar el resumen mediante Structured Outputs.
   *
   * Realiza una nueva llamada a openai.responses.create con:
   * - MODEL e instrucciones específicas para resumir la reserva.
   * - userMessage, assistantReply y toolTrace como contexto.
   * - text.format.type = "json_schema".
   * - text.format.name = "reservation_summary".
   * - text.format.strict = true.
   * - text.format.schema = RESERVATION_SUMMARY_SCHEMA.
   *
   * Después extrae response.output_text, conviértelo desde JSON y devuélvelo.
   * Si no puede interpretarse, utiliza el fallback inferior.
   */
  void userMessage;
  void assistantReply;
  void toolTrace;

  return {
    city: "Pendiente",
    checkIn: "Pendiente",
    checkOut: "Pendiente",
    guests: "Pendiente",
    hotel: "Pendiente",
    roomType: "Pendiente",
    nights: "Pendiente",
    estimatedPrice: "Pendiente",
    reservationId: "Pendiente",
    status: "Pendiente",
  };
}

app.post("/api/chat/stream", async (req, res) => {
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const writeEvent = (event) => {
    res.write(`${JSON.stringify(event)}\n`);
  };

  if (!process.env.OPENAI_API_KEY) {
    writeEvent({
      type: "error",
      message: "Falta OPENAI_API_KEY en .env. Configúrala para usar el asistente.",
    });
    res.end();
    return;
  }

  const message = String(req.body?.message || "").trim();
  const previousResponseId = req.body?.previousResponseId || null;

  if (!message) {
    writeEvent({
      type: "error",
      message: "El mensaje está vacío.",
    });
    res.end();
    return;
  }

  const toolTrace = [];

  try {
    writeEvent({ type: "status", message: "Consultando modelo..." });

    const finalResponse = await runAssistantWithFunctionCalling({
      userMessage: message,
      previousResponseId,
      onToolEvent: (toolEvent) => {
        toolTrace.push(toolEvent);
        // El navegador solo necesita el nombre para mostrar el progreso.
        // Los argumentos y resultados permanecen en servidor (pueden contener PII).
        writeEvent({ type: "tool", tool: toolEvent.tool });
      },
    });

    const assistantReply =
      extractAssistantText(finalResponse) || "No pude generar una respuesta en este turno.";

    writeEvent({ type: "status", message: "Generando resumen estructurado..." });

    const summary = await buildStructuredReservationSummary({
      userMessage: message,
      assistantReply,
      toolTrace,
    });

    writeEvent({ type: "status", message: "Enviando respuesta en streaming..." });

    for (const delta of streamChunk(assistantReply)) {
      writeEvent({ type: "delta", delta });
      await sleep(20);
    }

    writeEvent({
      type: "done",
      responseId: finalResponse.id,
      fullText: assistantReply,
      summary,
    });

    res.end();
  } catch (error) {
    writeEvent({
      type: "error",
      message: error instanceof Error ? error.message : "Error desconocido en el servidor.",
    });
    res.end();
  }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, model: MODEL, hasApiKey: Boolean(process.env.OPENAI_API_KEY) });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor listo en http://localhost:${PORT}`);
  });
}

module.exports = {
  RESERVATION_SUMMARY_SCHEMA,
  TOOLS,
  buildFunctionCallingRequest,
  calculateNights,
  checkAvailability,
  executeFunctionCall,
  getRoomPrice,
  runAssistantWithFunctionCalling,
};
