import test from "node:test";
import assert from "node:assert/strict";
import {
  BICHO_PADRAO,
  sortearReferencia,
  validarConfigBicho,
} from "../.test-runtime/bicho.mjs";
test("25 animals, distinct numbered IDs and configurable reference categories", () => {
  assert.equal(BICHO_PADRAO.animais.length, 25);
  assert.equal(new Set(BICHO_PADRAO.animais.map((a) => a.id)).size, 25);
  assert.equal(BICHO_PADRAO.animais[24].nome, "Vaca");
});
test("25% is the total favorites probability regardless of favorite count", () => {
  for (const favorites of [["01"], ["01", "02", "03"]]) {
    let hits = 0;
    for (let i = 0; i < 1000; i++) {
      let calls = 0;
      const result = sortearReferencia(
        BICHO_PADRAO.animais,
        favorites,
        25,
        () => (calls++ === 0 ? i / 1000 : 0.5),
      );
      if (favorites.includes(result.id)) hits++;
    }
    assert.equal(hits, 250);
  }
});
test("0%, 100%, no favorites, all favorites and disabled references are handled", () => {
  assert.notEqual(
    sortearReferencia(BICHO_PADRAO.animais, ["01"], 0, () => 0).id,
    "01",
  );
  assert.equal(
    sortearReferencia(BICHO_PADRAO.animais, ["01"], 100, () => 0.9).id,
    "01",
  );
  assert.equal(
    sortearReferencia(BICHO_PADRAO.animais, [], 25, () => 0).id,
    "01",
  );
  assert.equal(
    sortearReferencia(
      BICHO_PADRAO.animais,
      BICHO_PADRAO.animais.map((a) => a.id),
      25,
      () => 0.999,
    ).id,
    "25",
  );
  assert.throws(() =>
    sortearReferencia([{ id: "01", nome: "Teste", ativo: false }], [], 25),
  );
});
test("invalid campaign settings do not publish", () => {
  for (const chanceFavoritos of [-1, 101, NaN])
    assert.throws(() =>
      validarConfigBicho({ ...BICHO_PADRAO, chanceFavoritos }),
    );
  assert.throws(() => validarConfigBicho({ ...BICHO_PADRAO, repeticoes: 1.5 }));
});
