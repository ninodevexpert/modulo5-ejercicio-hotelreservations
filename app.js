const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const quickActions = document.querySelectorAll(".quick-actions button");
const assistantStatus = document.getElementById("assistantStatus");

const summaryState = {
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

const chatState = {
  isSending: false,
  previousResponseId: null,
};

if (window.location.protocol === "file:") {
  addMessage(
    "assistant",
    "Esta app requiere servidor HTTP. Ejecuta `npm install` y `npm run dev`, luego abre http://localhost:3000."
  );
  assistantStatus.textContent = "Error de entorno: estás usando file:// en lugar de http://localhost:3000.";
  setInputEnabled(false);
} else {
  addMessage(
    "assistant",
    "Hola, soy tu asistente de reservas. Pídeme disponibilidad, precios o confirmación y usaré function calling en backend."
  );
}

renderSummary();

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = messageInput.value.trim();
  if (!message || chatState.isSending) return;

  messageInput.value = "";
  await handleUserMessage(message);
});

quickActions.forEach((button) => {
  button.addEventListener("click", async () => {
    if (chatState.isSending) return;
    const prompt = button.dataset.prompt;
    await handleUserMessage(prompt);
  });
});

async function handleUserMessage(message) {
  chatState.isSending = true;
  setInputEnabled(false);

  addMessage("user", message);
  const assistantMessageId = addMessage("assistant typing", "");
  setMessageText(assistantMessageId, "Escribiendo...");
  assistantStatus.textContent = "Enviando consulta al servidor...";

  try {
    const response = await fetch("/api/chat/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        previousResponseId: chatState.previousResponseId,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error("No se pudo abrir el stream de respuesta.");
    }

    await consumeNdjsonStream(response.body, (event) => {
      handleServerEvent(event, assistantMessageId);
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error inesperado en cliente.";
    setMessageClass(assistantMessageId, "assistant");
    setMessageText(assistantMessageId, `Error: ${errorMessage}`);
    assistantStatus.textContent = "Error al procesar el turno.";
  } finally {
    chatState.isSending = false;
    setInputEnabled(true);
    messageInput.focus();
  }
}

async function consumeNdjsonStream(stream, onEvent) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const parsed = JSON.parse(line);
      onEvent(parsed);
    }
  }

  if (buffer.trim()) {
    onEvent(JSON.parse(buffer));
  }
}

function handleServerEvent(event, assistantMessageId) {
  switch (event.type) {
    case "status": {
      assistantStatus.textContent = event.message;
      break;
    }

    case "tool": {
      assistantStatus.textContent = `Ejecutando tool: ${event.tool}`;
      break;
    }

    case "delta": {
      setMessageClass(assistantMessageId, "assistant");
      appendMessageText(assistantMessageId, event.delta);
      break;
    }

    case "done": {
      chatState.previousResponseId = event.responseId || null;
      if (!getMessageText(assistantMessageId).trim()) {
        setMessageClass(assistantMessageId, "assistant");
        setMessageText(assistantMessageId, event.fullText || "Sin respuesta.");
      }

      applySummary(event.summary);
      assistantStatus.textContent = "Turno completado. Listo para continuar.";
      break;
    }

    case "error": {
      setMessageClass(assistantMessageId, "assistant");
      setMessageText(assistantMessageId, `Error: ${event.message}`);
      assistantStatus.textContent = "Error en el servidor.";
      break;
    }

    default:
      break;
  }
}

function applySummary(summary) {
  if (!summary || typeof summary !== "object") return;

  summaryState.city = safeValue(summary.city);
  summaryState.checkIn = safeValue(summary.checkIn);
  summaryState.checkOut = safeValue(summary.checkOut);
  summaryState.guests = safeValue(summary.guests);
  summaryState.hotel = safeValue(summary.hotel);
  summaryState.roomType = safeValue(summary.roomType);
  summaryState.nights = safeValue(summary.nights);
  summaryState.estimatedPrice = safeValue(summary.estimatedPrice);
  summaryState.reservationId = safeValue(summary.reservationId);
  summaryState.status = safeValue(summary.status);

  renderSummary();
}

function safeValue(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "Pendiente";
  }
  return String(value);
}

function renderSummary() {
  const fields = document.querySelectorAll("[data-field]");
  fields.forEach((field) => {
    const key = field.dataset.field;
    field.textContent = summaryState[key] || "Pendiente";
  });
}

function addMessage(roleClass, text) {
  const id = crypto.randomUUID();
  const element = document.createElement("article");
  element.id = id;
  element.className = `message ${roleClass}`;
  element.textContent = text;

  chatMessages.appendChild(element);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return id;
}

function setMessageText(messageId, text) {
  const node = document.getElementById(messageId);
  if (!node) return;
  node.textContent = text;
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendMessageText(messageId, text) {
  const node = document.getElementById(messageId);
  if (!node) return;
  node.textContent += text;
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function getMessageText(messageId) {
  const node = document.getElementById(messageId);
  return node ? node.textContent : "";
}

function setMessageClass(messageId, roleClass) {
  const node = document.getElementById(messageId);
  if (!node) return;
  node.className = `message ${roleClass}`;
}

function setInputEnabled(enabled) {
  messageInput.disabled = !enabled;
  chatForm.querySelector("button[type='submit']").disabled = !enabled;
}
