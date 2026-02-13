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
};

addMessage(
  "assistant",
  "Hola, soy tu asistente de reservas. Puedo ayudarte a encontrar hotel, estimar precio y preparar la confirmación."
);

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = messageInput.value.trim();
  if (!message) return;

  handleUserMessage(message);
  messageInput.value = "";
});

quickActions.forEach((button) => {
  button.addEventListener("click", () => {
    const prompt = button.dataset.prompt;
    handleUserMessage(prompt);
  });
});

function handleUserMessage(message) {
  addMessage("user", message);
  updateSummaryFromText(message);
  renderSummary();

  assistantStatus.textContent = "Procesando solicitud del usuario (simulado UI).";

  const typingId = addMessage("assistant typing", "Escribiendo respuesta...");
  window.setTimeout(() => {
    removeMessage(typingId);

    const reply = buildAssistantReply(message);
    addMessage("assistant", reply);

    assistantStatus.textContent = "Respuesta generada. Listo para siguiente interacción.";
  }, 500);
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

function removeMessage(messageId) {
  const node = document.getElementById(messageId);
  if (node) node.remove();
}

function updateSummaryFromText(text) {
  const normalized = text.toLowerCase();

  const cityMatch = normalized.match(
    /(madrid|barcelona|valencia|sevilla|málaga|bilbao|granada|zaragoza)/i
  );
  if (cityMatch) {
    summaryState.city = capitalize(cityMatch[0]);
  }

  const guestsMatch = normalized.match(/(\d+)\s*(hu[eé]spedes|personas?)/i);
  if (guestsMatch) {
    summaryState.guests = guestsMatch[1];
  }

  if (/suite/i.test(normalized)) {
    summaryState.roomType = "Suite";
  } else if (/doble/i.test(normalized)) {
    summaryState.roomType = "Doble";
  } else if (/individual|single/i.test(normalized)) {
    summaryState.roomType = "Individual";
  }

  const nightsMatch = normalized.match(/(\d+)\s*noches?/i);
  if (nightsMatch) {
    summaryState.nights = nightsMatch[1];
    summaryState.estimatedPrice = `${Number(nightsMatch[1]) * 110} € (estimado)`;
  }

  const dayMonthRange = normalized.match(/del\s+(\d{1,2})\s+al\s+(\d{1,2})/i);
  if (dayMonthRange) {
    summaryState.checkIn = `${dayMonthRange[1]} (por definir mes)`;
    summaryState.checkOut = `${dayMonthRange[2]} (por definir mes)`;

    const nights = Number(dayMonthRange[2]) - Number(dayMonthRange[1]);
    if (nights > 0) {
      summaryState.nights = String(nights);
      summaryState.estimatedPrice = `${nights * 110} € (estimado)`;
    }
  }

  if (summaryState.city !== "Pendiente" && summaryState.hotel === "Pendiente") {
    summaryState.hotel = `Hotel Central ${summaryState.city}`;
  }
}

function renderSummary() {
  const fields = document.querySelectorAll("[data-field]");
  fields.forEach((field) => {
    const key = field.dataset.field;
    field.textContent = summaryState[key];
  });
}

function buildAssistantReply(message) {
  const cityText =
    summaryState.city !== "Pendiente"
      ? `en ${summaryState.city}`
      : "en la ciudad que prefieras";

  if (/precio|coste|cu[aá]nto/i.test(message)) {
    return `Puedo mostrarte un estimado ${cityText}. En esta UI solo simulamos el cálculo; luego conectaremos get_room_price.`;
  }

  if (/confirm|reserv|crear/i.test(message)) {
    return "Perfecto. En esta fase la confirmación es visual: el siguiente paso será conectar create_reservation en backend.";
  }

  return `Te ayudo con disponibilidad ${cityText}. Esta vista ya representa el flujo conversacional; después integraremos check_availability y el resto de funciones.`;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}
