const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const quickActions = document.querySelectorAll(".quick-actions button");
const assistantStatus = document.getElementById("assistantStatus");
const statusCard = document.querySelector(".status-card");
const statusPhase = document.getElementById("statusPhase");

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
let pendingScrollFrame = null;

if (window.location.protocol === "file:") {
  addMessage(
    "assistant",
    "Esta app requiere servidor HTTP. Ejecuta `npm install` y `npm run dev`, luego abre http://localhost:3000."
  );
  updateAssistantStatus(
    "Error de entorno: estás usando file:// en lugar de http://localhost:3000.",
    "error"
  );
  setInputEnabled(false);
} else {
  addMessage(
    "assistant",
    "Hola, soy tu asistente de reservas. Pídeme disponibilidad, precios o confirmación y usaré function calling en backend."
  );
}

renderSummary();
if (window.location.protocol !== "file:") {
  updateAssistantStatus("Esperando consulta del usuario.", "waiting");
}

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
  updateAssistantStatus("Enviando consulta al servidor...", "sending");

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
    updateAssistantStatus("Error al procesar el turno.", "error");
  } finally {
    chatState.isSending = false;
    setInputEnabled(true);
    messageInput.focus({ preventScroll: true });
    scrollChatToLatest();
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
      updateAssistantStatus(event.message, "sending");
      break;
    }

    case "tool": {
      updateAssistantStatus(`Consultando disponibilidad: ${event.tool}`, "tool");
      break;
    }

    case "delta": {
      startMessageStream(assistantMessageId);
      setMessageClass(assistantMessageId, "assistant");
      appendMessageText(assistantMessageId, event.delta);
      updateAssistantStatus("Preparando una respuesta personalizada...", "responding");
      break;
    }

    case "done": {
      chatState.previousResponseId = event.responseId || null;
      const finalText = event.fullText || getMessageText(assistantMessageId) || "Sin respuesta.";
      setMessageClass(assistantMessageId, "assistant");
      renderAssistantMessage(assistantMessageId, finalText);

      applySummary(event.summary);
      updateAssistantStatus("Turno completado. Listo para continuar.", "complete");
      break;
    }

    case "error": {
      setMessageClass(assistantMessageId, "assistant");
      setMessageText(assistantMessageId, `Error: ${event.message}`);
      updateAssistantStatus("Error en el servidor.", "error");
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
    const nextValue = summaryState[key] || "Pendiente";
    const hasChanged = field.textContent !== nextValue;

    field.textContent = nextValue;
    field.classList.toggle("is-pending", nextValue === "Pendiente");

    if (hasChanged && nextValue !== "Pendiente") {
      field.classList.remove("is-updated");
      void field.offsetWidth;
      field.classList.add("is-updated");
    }
  });
}

function updateAssistantStatus(message, state) {
  const phaseLabels = {
    waiting: "En espera",
    sending: "Conectando",
    tool: "Consultando",
    responding: "Respondiendo",
    complete: "Completado",
    error: "Revisar",
  };

  assistantStatus.textContent = message;
  statusPhase.textContent = phaseLabels[state] || phaseLabels.waiting;
  statusCard.dataset.state = state;
}

function addMessage(roleClass, text) {
  const id = crypto.randomUUID();
  const element = document.createElement("article");
  element.id = id;
  element.className = `message ${roleClass}`;
  element.textContent = text;
  if (roleClass.includes("typing")) {
    element.setAttribute("aria-label", "El asistente está escribiendo");
  }

  chatMessages.appendChild(element);
  scrollChatToLatest();
  return id;
}

function setMessageText(messageId, text) {
  const node = document.getElementById(messageId);
  if (!node) return;
  node.textContent = text;
  scrollChatToLatest();
}

function appendMessageText(messageId, text) {
  const node = document.getElementById(messageId);
  if (!node) return;
  node.textContent += text;
  scrollChatToLatest();
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

function startMessageStream(messageId) {
  const node = document.getElementById(messageId);
  if (!node || node.dataset.streamStarted === "true") return;

  node.dataset.streamStarted = "true";
  node.removeAttribute("aria-label");
  node.textContent = "";
}

function renderAssistantMessage(messageId, text) {
  const node = document.getElementById(messageId);
  if (!node) return;

  node.classList.add("formatted");
  node.innerHTML = formatAssistantText(text);
  scrollChatToLatest();
}

function formatAssistantText(text) {
  const normalized = String(text)
    .trim()
    .replace(/\s+-\s+(?=[A-ZÁÉÍÓÚÑ])/g, "\n- ")
    .replace(/\s+(\d+)[.)]\s+(?=[A-ZÁÉÍÓÚÑ])/g, "\n$1. ")
    .replace(/\s+(¿(?:Quieres|Necesitas|Prefieres|Deseas))/g, "\n\n$1");
  const lines = normalized.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const html = [];
  let listType = null;

  const closeList = () => {
    if (!listType) return;
    html.push(`</${listType}>`);
    listType = null;
  };

  for (const line of lines) {
    const unordered = line.match(/^[-•]\s+(.+)/);
    const ordered = line.match(/^\d+[.)]\s+(.+)/);

    if (unordered || ordered) {
      const nextListType = unordered ? "ul" : "ol";
      if (listType !== nextListType) {
        closeList();
        listType = nextListType;
        html.push(`<${listType}>`);
      }
      html.push(`<li>${formatInlineMarkdown((unordered || ordered)[1])}</li>`);
      continue;
    }

    closeList();
    html.push(`<p>${formatInlineMarkdown(line)}</p>`);
  }

  closeList();
  return html.join("");
}

function formatInlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function scrollChatToLatest() {
  if (pendingScrollFrame !== null) {
    cancelAnimationFrame(pendingScrollFrame);
  }

  pendingScrollFrame = requestAnimationFrame(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
    pendingScrollFrame = null;
  });
}

function setInputEnabled(enabled) {
  messageInput.disabled = !enabled;
  chatForm.querySelector("button[type='submit']").disabled = !enabled;
  quickActions.forEach((button) => {
    button.disabled = !enabled;
  });
}
