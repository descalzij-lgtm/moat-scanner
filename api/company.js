/* ============================================================
   Moat Scanner · Serverless function (Vercel)
   GET /api/company?ticker=AAPL

   Lee la API key desde process.env.FMP_API_KEY (NUNCA se expone
   al navegador). Consulta Financial Modeling Prep con
   Promise.allSettled para tolerar fallos parciales, normaliza y
   devuelve un objeto JSON limpio.
   ============================================================ */

const { normalizeFMP } = require("../lib/normalize");

const FMP_BASE = "https://financialmodelingprep.com/stable";

module.exports = async function handler(req, res) {
  // CORS básico (mismo origen en Vercel; abierto para pruebas locales)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido." });

  const key = process.env.FMP_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "Falta configurar FMP_API_KEY en el servidor (variable de entorno)." });
  }

  const ticker = String((req.query.ticker || "")).trim().toUpperCase();
  if (!ticker || !/^[A-Z0-9.\-]{1,12}$/.test(ticker)) {
    return res.status(400).json({ error: "Ticker inválido. Ejemplo: /api/company?ticker=AAPL" });
  }

  const t = encodeURIComponent(ticker);
  const epL = (p) => `${FMP_BASE}/${p}?symbol=${t}&limit=5&apikey=${key}`;
  const urls = {
    profile: `${FMP_BASE}/profile?symbol=${t}&apikey=${key}`,
    income: epL("income-statement"),
    balance: epL("balance-sheet-statement"),
    cash: epL("cash-flow-statement"),
    ratios: epL("ratios"),
    metrics: epL("key-metrics"),
    growth: epL("financial-growth"),
  };

  const keys = Object.keys(urls);
  try {
    const results = await Promise.allSettled(
      keys.map((k) =>
        fetch(urls[k]).then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          return r.json();
        })
      )
    );

    const data = {};
    const errors = [];
    results.forEach((r, i) => {
      const k = keys[i];
      if (r.status === "fulfilled" && r.value && !r.value["Error Message"] && !r.value.error) {
        data[k] = r.value;
      } else {
        errors.push(k);
      }
    });

    if (!data.profile || !data.profile[0]) {
      // Distinguir límite de API de ticker inexistente
      const rejected = results.find((r) => r.status === "rejected");
      const code = rejected && rejected.reason ? String(rejected.reason.message || "") : "";
      if (/429/.test(code)) return res.status(429).json({ error: "Límite de la API alcanzado (429). Reintentá más tarde." });
      if (/401|403/.test(code)) return res.status(502).json({ error: "API key inválida o sin permisos en el servidor." });
      return res.status(404).json({ error: `Sin datos de perfil para "${ticker}". Verificá el símbolo.` });
    }

    const normalized = normalizeFMP(ticker, data, errors);

    // Cache liviano en el edge (datos fundamentales cambian poco intradía)
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json(normalized);
  } catch (e) {
    return res.status(502).json({ error: "No se pudieron obtener los datos de FMP: " + (e.message || e) });
  }
};
