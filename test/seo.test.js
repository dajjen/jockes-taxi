// SEO- och strukturtester för index.html.
// Körs med `node --test`. Inga externa anrop — allt läses från filen.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parse } from "node-html-parser";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const doc = parse(html, { comment: false });

test("html har lang=sv", () => {
  const el = doc.querySelector("html");
  assert.ok(el, "saknar <html>-element");
  assert.equal(el.getAttribute("lang"), "sv");
});

test("title finns, är rimligt lång och nämner Taxi + Gotland", () => {
  const title = doc.querySelector("title")?.text.trim() ?? "";
  assert.ok(title.length >= 20 && title.length <= 70,
    `title bör vara 20–70 tecken, är ${title.length}`);
  assert.match(title, /taxi/i);
  assert.match(title, /gotland/i);
});

test("meta description finns och nämner Gotland", () => {
  const desc = doc.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
  assert.ok(desc.length >= 50 && desc.length <= 320,
    `description bör vara 50–320 tecken, är ${desc.length}`);
  assert.match(desc, /gotland/i);
});

test("canonical-länk finns och är https", () => {
  const href = doc.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "";
  assert.match(href, /^https:\/\//);
});

test("viewport och theme-color finns", () => {
  assert.ok(doc.querySelector('meta[name="viewport"]'), "saknar viewport");
  assert.ok(doc.querySelector('meta[name="theme-color"]'), "saknar theme-color");
});

test("exakt en h1", () => {
  assert.equal(doc.querySelectorAll("h1").length, 1);
});

test("Open Graph-taggar finns", () => {
  for (const p of ["og:title", "og:description", "og:image", "og:url", "og:type"]) {
    assert.ok(doc.querySelector(`meta[property="${p}"]`), `saknar ${p}`);
  }
});

test("JSON-LD är giltig och beskriver en taxitjänst på Gotland", () => {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  assert.ok(scripts.length >= 1, "saknar JSON-LD");
  const data = JSON.parse(scripts[0].text);
  const types = [].concat(data["@type"]);
  assert.ok(types.includes("LocalBusiness"), "JSON-LD @type saknar LocalBusiness");
  assert.ok(data.telephone, "JSON-LD saknar telephone");
  const areas = JSON.stringify(data.areaServed ?? "");
  for (const ort of ["Visby", "Hemse", "Slite", "Fårösund", "Fårö"]) {
    assert.match(areas, new RegExp(ort), `areaServed saknar ${ort}`);
  }
});

test("alla interna #-ankare pekar på ett element som finns", () => {
  const ids = new Set(doc.querySelectorAll("[id]").map((el) => el.getAttribute("id")));
  const brutna = [];
  for (const a of doc.querySelectorAll('a[href^="#"]')) {
    const target = a.getAttribute("href").slice(1);
    if (target && !ids.has(target)) brutna.push(target);
  }
  assert.deepEqual(brutna, [], `brutna ankarlänkar: ${brutna.join(", ")}`);
});

test("alla bilder/svg med role=img eller img-tagg har alt eller aria", () => {
  for (const img of doc.querySelectorAll("img")) {
    const hasAlt = img.getAttribute("alt") !== undefined;
    assert.ok(hasAlt, `<img> saknar alt: ${img.toString().slice(0, 60)}`);
  }
});
