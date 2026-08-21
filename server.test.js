const test = require("node:test");
const assert = require("node:assert/strict");

const {
  TOOLS,
  calculateNights,
  executeFunctionCall,
  runAssistantWithFunctionCalling,
} = require("./server");

function assertStrictObjectSchema(schema) {
  if (!schema || schema.type !== "object") return;

  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(
    [...schema.required].sort(),
    Object.keys(schema.properties).sort()
  );

  Object.values(schema.properties).forEach(assertStrictObjectSchema);
}

test("todas las tools usan schemas compatibles con strict mode", () => {
  assert.equal(TOOLS.length, 3);

  for (const tool of TOOLS) {
    assert.equal(tool.type, "function");
    assert.equal(tool.strict, true);
    assertStrictObjectSchema(tool.parameters);
  }
});

test("calcula noches válidas y rechaza rangos incorrectos", () => {
  assert.equal(calculateNights("2027-03-20", "2027-03-23"), 3);
  assert.equal(calculateNights("2027-03-23", "2027-03-20"), null);
  assert.equal(calculateNights("fecha-invalida", "2027-03-20"), null);
});

test("ejecuta una function call y devuelve un resultado estructurado", async () => {
  const execution = await executeFunctionCall({
    name: "get_room_price",
    arguments: JSON.stringify({ room_type: "suite", nights: 3 }),
  });

  assert.equal(execution.tool, "get_room_price");
  assert.equal(execution.result.ok, true);
  assert.equal(execution.result.data.total_price, 630);
  assert.equal(execution.result.data.currency, "EUR");
});

test("convierte errores de una tool en outputs que el modelo puede corregir", async () => {
  const execution = await executeFunctionCall({
    name: "get_room_price",
    arguments: JSON.stringify({ room_type: "suite", nights: 0 }),
  });

  assert.equal(execution.result.ok, false);
  assert.match(execution.result.error, /entero positivo/);
});

test("continúa por previous_response_id y conserva el call_id", async () => {
  const requests = [];
  const toolEvents = [];
  const responses = [
    {
      id: "resp_tool",
      output: [
        {
          type: "function_call",
          call_id: "call_price",
          name: "get_room_price",
          arguments: JSON.stringify({ room_type: "doble", nights: 2 }),
        },
      ],
    },
    {
      id: "resp_final",
      output: [{ type: "message", content: [{ type: "output_text", text: "Total: 240 EUR" }] }],
      output_text: "Total: 240 EUR",
    },
  ];

  const client = {
    responses: {
      async create(request) {
        requests.push(request);
        return responses.shift();
      },
    },
  };

  const finalResponse = await runAssistantWithFunctionCalling({
    userMessage: "¿Cuánto cuestan dos noches en habitación doble?",
    previousResponseId: "resp_previous",
    onToolEvent: (event) => toolEvents.push(event),
    client,
  });

  assert.equal(finalResponse.id, "resp_final");
  assert.equal(requests.length, 2);
  assert.equal(requests[0].previous_response_id, "resp_previous");
  assert.equal(requests[0].tool_choice, "auto");
  assert.equal(requests[0].parallel_tool_calls, false);
  assert.equal(requests[0].store, true);
  assert.equal(requests[1].previous_response_id, "resp_tool");
  assert.equal(requests[1].input[0].type, "function_call_output");
  assert.equal(requests[1].input[0].call_id, "call_price");
  assert.equal(JSON.parse(requests[1].input[0].output).data.total_price, 240);
  assert.equal(toolEvents.length, 1);
});
