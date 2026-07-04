// Strukturtester för recensionsformuläret i index.html.
// Körs med `node --test`. Verifierar kontraktet mot send-review.php.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parse } from "node-html-parser";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const doc = parse(readFileSync(join(root, "index.html"), "utf8"));
const form = doc.querySelector("form.review-form");

test("formuläret finns och postar till send-review.php", () => {
  assert.ok(form, "hittar inget .review-form");
  assert.equal(form.getAttribute("action"), "/send-review.php");
  assert.equal(form.getAttribute("method"), "post");
});

test("obligatoriska fält finns och är required", () => {
  const namn = form.querySelector('input[name="namn"]');
  const recension = form.querySelector('textarea[name="recension"]');
  const betyg = form.querySelector('select[name="betyg"]');
  assert.ok(namn && namn.hasAttribute("required"), "namn saknas/ej required");
  assert.ok(recension && recension.hasAttribute("required"), "recension saknas/ej required");
  assert.ok(betyg && betyg.hasAttribute("required"), "betyg saknas/ej required");
});

test("betyg har fem alternativ (1–5)", () => {
  const opts = form.querySelectorAll('select[name="betyg"] option');
  const values = opts.map((o) => o.getAttribute("value")).sort();
  assert.deepEqual(values, ["1", "2", "3", "4", "5"]);
});

test("e-postfältet är av typ email och valfritt", () => {
  const epost = form.querySelector('input[name="epost"]');
  assert.ok(epost, "epost-fält saknas");
  assert.equal(epost.getAttribute("type"), "email");
  assert.ok(!epost.hasAttribute("required"), "epost ska vara valfritt");
});

test("honungsfälla finns och är dold", () => {
  const hp = form.querySelector('input[name="webbplats"]');
  assert.ok(hp, "honeypot-fält saknas");
  // Ligger i en behållare med klassen .hp (döljs utanför skärmen i CSS).
  assert.ok(hp.closest(".hp"), "honeypot ligger inte i .hp-behållare");
});

test("skicka-knapp och statusruta finns", () => {
  assert.ok(form.querySelector('button[type="submit"]'), "submit-knapp saknas");
  const status = doc.querySelector("#form-status");
  assert.ok(status, "statusruta #form-status saknas");
  assert.equal(status.getAttribute("aria-live"), "polite");
});
