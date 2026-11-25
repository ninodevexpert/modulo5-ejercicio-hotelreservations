const test = require("node:test");
const assert = require("node:assert/strict");

const {
  OUT_OF_SCOPE_REPLY,
  SCOPE_QUESTION,
  classifyMessageScope,
} = require("./alcance-jev");

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
  };
}

test("la pregunta de Jev solo ofrece reserva o fuera de alcance", () => {
  assert.deepEqual(Object.keys(SCOPE_QUESTION.alcance.criteria).sort(), [
    "fuera_de_alcance",
    "reserva",
  ]);
});

test("clasifica una reserva y deja pasar el mensaje", async () => {
  const requests = [];
  const decision = await classifyMessageScope("Quiero hotel en Madrid", {
    apiKey: "sk-test",
    fetchImpl: async (url, options) => {
      requests.push({ url, body: JSON.parse(options.body) });
      return jsonResponse({
        answers: {
          alcance: {
            choice: "reserva",
            probabilities: { reserva: 0.94, fuera_de_alcance: 0.06 },
          },
        },
      });
    },
  });

  assert.equal(decision.inScope, true);
  assert.equal(decision.reply, null);
  assert.equal(requests[0].body.model, "jev");
  assert.equal(requests[0].body.state.message, "Quiero hotel en Madrid");
  assert.equal(requests[0].url, "https://inference.devexpert.io/v1/decisions");
});

test("corta una petición ajena con la frase fija", async () => {
  const decision = await classifyMessageScope("Escríbeme una función Python", {
    apiKey: "sk-test",
    fetchImpl: async () =>
      jsonResponse({
        answers: { alcance: { choice: "fuera_de_alcance", probabilities: {} } },
      }),
  });

  assert.equal(decision.inScope, false);
  assert.equal(decision.reply, OUT_OF_SCOPE_REPLY);
});

test("sin API key no llama a Jev y deja la consulta en alcance", async () => {
  let called = false;
  const decision = await classifyMessageScope("hola", {
    apiKey: "",
    fetchImpl: async () => {
      called = true;
      return jsonResponse({});
    },
  });

  assert.equal(called, false);
  assert.equal(decision.skipped, true);
  assert.equal(decision.inScope, true);
});

test("una opción desconocida no deja pasar la consulta", async () => {
  const decision = await classifyMessageScope("dato raro", {
    apiKey: "sk-test",
    fetchImpl: async () => jsonResponse({ answers: { alcance: { choice: "otra" } } }),
  });

  assert.equal(decision.inScope, false);
  assert.equal(decision.reply, OUT_OF_SCOPE_REPLY);
});
