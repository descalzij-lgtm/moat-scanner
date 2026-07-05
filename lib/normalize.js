/* ============================================================
   Moat Scanner · Normalización de datos de Financial Modeling Prep
   Se ejecuta SOLO en el backend. Devuelve un objeto limpio y
   finalizado, con la misma convención que usa el frontend
   (ratios como fracción, montos absolutos, N/D => null).
   ============================================================ */

function num(x) {
  return (x === null || x === undefined || x === "" || isNaN(x)) ? null : Number(x);
}
function pick(arr, i = 0) {
  return (arr && arr[i]) ? arr[i] : {};
}

function finalizeNormalization(o) {
  if (o.freeCashFlow === null && o.operatingCashFlow !== null && o.capex !== null)
    o.freeCashFlow = o.operatingCashFlow + o.capex;
  if (o.netDebt === null && o.totalDebt !== null && o.cashAndEquivalents !== null)
    o.netDebt = o.totalDebt - o.cashAndEquivalents;
  o.fcfMargin = (o.freeCashFlow !== null && o.revenue) ? o.freeCashFlow / o.revenue : null;
  o.cashConversion = (o.freeCashFlow !== null && o.netIncome) ? o.freeCashFlow / o.netIncome : null;
  const keyFields = {
    revenue: "Ingresos", netIncome: "Utilidad neta", freeCashFlow: "Free cash flow",
    roic: "ROIC", netDebtToEbitda: "Deuda neta/EBITDA", peRatio: "P/E",
    grossMargin: "Margen bruto", revenueGrowth: "Crecimiento de ingresos"
  };
  o.missingData = Object.keys(keyFields).filter(k => o[k] === null).map(k => keyFields[k]);
  return o;
}

/**
 * @param {string} ticker
 * @param {object} d  { profile, income, balance, cash, ratios, metrics, growth } (arrays de FMP)
 * @param {string[]} errors  endpoints que fallaron
 */
function normalizeFMP(ticker, d, errors) {
  const p = pick(d.profile), inc = pick(d.income), bal = pick(d.balance), cf = pick(d.cash),
        rt = pick(d.ratios), km = pick(d.metrics), gr = pick(d.growth);
  const incSeries = d.income || [];

  let cagr = null;
  if (incSeries.length >= 2) {
    const newest = num(incSeries[0].revenue),
          oldest = num(incSeries[incSeries.length - 1].revenue),
          yrs = incSeries.length - 1;
    if (newest && oldest && oldest > 0 && yrs > 0) cagr = Math.pow(newest / oldest, 1 / yrs) - 1;
  }

  const o = {
    source: "Financial Modeling Prep", fetchedAt: new Date().toISOString(),
    ticker: (p.symbol || ticker).toUpperCase(), companyName: p.companyName || ticker,
    exchange: p.exchange || p.exchangeShortName || null, country: p.country || null,
    sector: p.sector || null, industry: p.industry || null, description: p.description || null,
    currency: p.currency || "USD", price: num(p.price), marketCap: num(p.marketCap || p.mktCap),
    enterpriseValue: num(km.enterpriseValue),
    revenue: num(inc.revenue), revenueGrowth: num(gr.revenueGrowth), revenueCAGR5: cagr,
    grossMargin: num(rt.grossProfitMargin), operatingMargin: num(rt.operatingProfitMargin), netMargin: num(rt.netProfitMargin),
    ebitda: num(inc.ebitda), ebit: num(inc.operatingIncome), netIncome: num(inc.netIncome),
    eps: num(inc.eps || inc.epsdiluted), epsGrowth: num(gr.epsgrowth),
    cashAndEquivalents: num(bal.cashAndCashEquivalents), totalDebt: num(bal.totalDebt),
    netDebt: num(bal.netDebt), totalEquity: num(bal.totalStockholdersEquity),
    totalAssets: num(bal.totalAssets), totalLiabilities: num(bal.totalLiabilities),
    operatingCashFlow: num(cf.operatingCashFlow || cf.netCashProvidedByOperatingActivities),
    capex: num(cf.capitalExpenditure), freeCashFlow: num(cf.freeCashFlow),
    roe: num(rt.returnOnEquity || km.roe), roa: num(rt.returnOnAssets), roic: num(km.roic || rt.returnOnCapitalEmployed),
    debtToEquity: num(rt.debtEquityRatio || rt.debtToEquity), netDebtToEbitda: num(rt.netDebtToEBITDA),
    peRatio: num(rt.priceEarningsRatio || km.peRatio), evToEbitda: num(km.evToEBITDA || rt.enterpriseValueMultiple),
    evToSales: num(km.evToSales), priceToBook: num(rt.priceToBookRatio), priceToSales: num(rt.priceToSalesRatio),
    fcfYield: num(km.freeCashFlowYield), dividendYield: num(rt.dividendYield), payoutRatio: num(rt.payoutRatio),
    beta: num(p.beta),
    high52: num(p.range ? String(p.range).split("-").pop().trim() : null),
    low52: num(p.range ? String(p.range).split("-")[0].trim() : null),
    change1y: null, avgVolume: num(p.averageVolume || p.volAvg),
    endpointErrors: errors || []
  };
  return finalizeNormalization(o);
}

module.exports = { num, pick, normalizeFMP, finalizeNormalization };
