#!/usr/bin/env node
// Zero-dependency HTTP server that exposes the buy-vs-rent model as a JSON
// API. The model itself lives in src/lib and is pure JS — this file is just
// the transport.
//
// Endpoints
//   GET  /api/health             → { ok: true, version, defaults }
//   POST /api/simulate           → run the full simulation with body inputs
//   POST /api/closing-costs      → just the closing-cost breakdown
//   POST /api/sweep              → run a list of overrides and return the
//                                  final delta for each (useful for charts)
//
// Run
//   npm run api                  # default port 8787
//   PORT=4000 npm run api        # custom port
//
// CORS is enabled for all origins so a static frontend served from another
// host (e.g. Python http.server on :8000) can call it directly.

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { simulate } from "../src/lib/model.js";
import {
  computeClosingCosts,
  computeGstHstOnNewHome,
  computeLandTransferTax,
  PROVINCE_CODES,
  PROVINCES,
} from "../src/lib/closing-costs.js";
import { DEFAULT_INPUTS } from "../src/lib/defaults.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, "..", "package.json"), "utf8"));

const port = Number(process.env.PORT || 8787);
const allowOrigin = process.env.CORS_ORIGIN || "*";

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "cache-control": "no-store",
    ...headers,
  });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

function readJsonBody(req, { maxBytes = 1_000_000 } = {}) {
  return new Promise((resolveBody, reject) => {
    let bytes = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolveBody({});
      try {
        resolveBody(JSON.parse(raw));
      } catch (err) {
        reject(new Error(`invalid JSON: ${err.message}`));
      }
    });
    req.on("error", reject);
  });
}

function mergeInputs(body) {
  return { ...DEFAULT_INPUTS, ...(body || {}) };
}

const handlers = {
  "GET /api/health": (_req, res) => {
    send(res, 200, {
      ok: true,
      service: pkg.name,
      version: pkg.version,
      defaults: DEFAULT_INPUTS,
      provinces: PROVINCE_CODES.map((code) => ({ code, name: PROVINCES[code].name })),
    });
  },

  "POST /api/simulate": async (req, res) => {
    const body = await readJsonBody(req);
    const inputs = mergeInputs(body);
    const result = simulate(inputs);
    send(res, 200, { inputs, result });
  },

  "POST /api/closing-costs": async (req, res) => {
    const body = await readJsonBody(req);
    const args = {
      price: body.price ?? body.propertyPrice ?? DEFAULT_INPUTS.propertyPrice,
      province: body.province ?? DEFAULT_INPUTS.province,
      firstTimeBuyer: body.firstTimeBuyer ?? false,
      newConstruction: body.newConstruction ?? false,
      includeTorontoLtt: body.includeTorontoLtt ?? false,
      otherClosingCosts: body.otherClosingCosts ?? DEFAULT_INPUTS.otherClosingCosts,
      cmhcPremium: body.cmhcPremium ?? 0,
    };
    const result = computeClosingCosts(args);
    send(res, 200, { args, result });
  },

  // Convenience endpoint for charts. Body shape:
  //   { base: <inputs>, overrides: [ { label, patch }, ... ] }
  // Returns an array of { label, delta, breakeven, ... }.
  "POST /api/sweep": async (req, res) => {
    const body = await readJsonBody(req);
    const base = mergeInputs(body.base);
    const overrides = Array.isArray(body.overrides) ? body.overrides : [];
    const baseline = simulate(base);
    const rows = overrides.map(({ label, patch }) => {
      const r = simulate({ ...base, ...(patch || {}) });
      return {
        label,
        delta: r.final.delta,
        deltaVsBaseline: r.final.delta - baseline.final.delta,
        breakeven: r.final.breakeven,
        closingCosts: r.closingCosts,
      };
    });
    send(res, 200, { baseline: { delta: baseline.final.delta, breakeven: baseline.final.breakeven }, rows });
  },

  "GET /api/closing-costs/preview": (req, res) => {
    // Quick GET helper for sanity checking. Accepts query params.
    const url = new URL(req.url, "http://x");
    const q = url.searchParams;
    const result = computeClosingCosts({
      price: Number(q.get("price") ?? DEFAULT_INPUTS.propertyPrice),
      province: q.get("province") ?? "ON",
      firstTimeBuyer: q.get("ftb") === "true",
      newConstruction: q.get("new") === "true",
      includeTorontoLtt: q.get("toronto") === "true",
      otherClosingCosts: Number(q.get("other") ?? DEFAULT_INPUTS.otherClosingCosts),
      cmhcPremium: Number(q.get("cmhc") ?? 0),
    });
    send(res, 200, result);
  },

  // Per-component helpers, for when the caller already has CMHC etc. and just
  // needs one chunk of the breakdown.
  "POST /api/ltt": async (req, res) => {
    const body = await readJsonBody(req);
    send(res, 200, computeLandTransferTax(body || {}));
  },
  "POST /api/gst-hst": async (req, res) => {
    const body = await readJsonBody(req);
    send(res, 200, computeGstHstOnNewHome(body || {}));
  },
};

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": allowOrigin,
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "86400",
    });
    res.end();
    return;
  }

  const url = new URL(req.url || "/", "http://x");
  const key = `${req.method} ${url.pathname}`;
  const handler = handlers[key];
  if (!handler) {
    return send(res, 404, {
      error: "not found",
      method: req.method,
      path: url.pathname,
      routes: Object.keys(handlers),
    });
  }
  try {
    await handler(req, res);
  } catch (err) {
    send(res, 400, { error: err?.message || String(err) });
  }
});

server.listen(port, () => {
  console.log(`Buy-vs-Rent API listening on http://localhost:${port}`);
  for (const route of Object.keys(handlers)) console.log(`  ${route}`);
});

// Be a good neighbor to dev tooling.
process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("SIGINT", () => server.close(() => process.exit(0)));
