const test = require("node:test");
const assert = require("node:assert/strict");

const {
  TOOLS,
  calculateNights,
  checkAvailability,
  getRoomPrice,
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

test("la plantilla incluye tres tools con schemas estrictos", () => {
  assert.equal(TOOLS.length, 3);

  for (const tool of TOOLS) {
    assert.equal(tool.type, "function");
    assert.equal(tool.strict, true);
    assertStrictObjectSchema(tool.parameters);
  }
});

test("la lógica local calcula noches válidas", () => {
  assert.equal(calculateNights("2027-03-20", "2027-03-23"), 3);
  assert.equal(calculateNights("2027-03-23", "2027-03-20"), null);
});

test("checkAvailability devuelve el catálogo mock preparado", () => {
  const result = checkAvailability({
    city: "Madrid",
    check_in: "2027-03-20",
    check_out: "2027-03-23",
    guests: 2,
  });

  assert.equal(result.nights, 3);
  assert.equal(result.hotels_found, 2);
  assert.equal(result.availability[0].total_estimated, 360);
});

test("getRoomPrice calcula un total determinista", () => {
  const result = getRoomPrice({ room_type: "suite", nights: 3 });
  assert.equal(result.total_price, 630);
  assert.equal(result.currency, "EUR");
});

test.todo("TODO 1: completar el loop de function calling");
test.todo("TODO 2: ejecutar tools y devolver function_call_output");
test.todo("TODO 3: generar el resumen con Structured Outputs");
