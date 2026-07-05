# Moat Scanner — versión producto

Análisis fundamental visual de empresas con IA · **Descalzi Finanzas**

Esta es la versión **producto**, lista para desplegar en **Vercel**. A diferencia de la demo de un solo archivo, acá la **API key de Financial Modeling Prep queda oculta en el backend** (variable de entorno `FMP_API_KEY`). El navegador nunca ve la key: el frontend llama a `/api/company?ticker=…` y una función serverless consulta FMP, normaliza los datos y devuelve un objeto limpio.

---

## Estructura

```
produccion/
├── index.html          Frontend (mismo dashboard premium que la demo, sin campo de key)
├── api/
│   └── company.js      Función serverless: GET /api/company?ticker=AAPL
├── lib/
│   └── normalize.js    Normalización de datos de FMP (compartida / testeable)
├── vercel.json         Config de Vercel (runtime + cache)
├── package.json
├── .env.example        Plantilla de variables de entorno
└── .gitignore
```

El scoring, los módulos (Moat Battle, Red Flag Scanner, Investment Committee, etc.) y las exportaciones (PDF, Excel, placa PNG) corren en el navegador, igual que en la demo. Lo único que cambia es **de dónde vienen los datos**.

---

## Cómo desplegar en Vercel (paso a paso)

1. **Conseguí una API key** de Financial Modeling Prep con acceso a los endpoints `/stable`: https://site.financialmodelingprep.com/developer/docs

2. **Subí la carpeta `produccion/` a un repositorio** de GitHub (o GitLab/Bitbucket).

3. **Importá el repo en Vercel** → https://vercel.com/new
   - Framework preset: **Other** (no hace falta build).
   - Root directory: la carpeta que contiene `index.html` y `api/`.

4. **Cargá la variable de entorno** en Vercel:
   - Project → **Settings → Environment Variables**
   - Name: `FMP_API_KEY`  ·  Value: *tu key real*  ·  Environments: Production (y Preview si querés).

5. **Deploy.** Al terminar vas a tener una URL tipo `https://moat-scanner.vercel.app`.
   Probá el endpoint: `https://tu-app.vercel.app/api/company?ticker=AAPL`

### Alternativa por CLI

```bash
npm i -g vercel
cd produccion
vercel            # primer deploy (preview)
vercel env add FMP_API_KEY     # pegás la key cuando la pida
vercel --prod     # deploy a producción
```

---

## Desarrollo local

```bash
cd produccion
npm i -g vercel
cp .env.example .env          # editá .env y poné tu FMP_API_KEY
vercel dev                    # levanta frontend + /api en http://localhost:3000
```

> Abrir `index.html` con doble clic **no** ejecuta la función `/api`. Para probar la ruta backend usá `vercel dev` (o desplegá). Sin backend, el frontend sigue funcionando con **Modo demo** y **Carga manual**.

---

## El endpoint

`GET /api/company?ticker=AAPL`

Respuesta `200`: objeto normalizado (`ticker`, `companyName`, `sector`, `price`, `marketCap`, `revenue`, `grossMargin`, `roic`, `netDebtToEbitda`, `peRatio`, `freeCashFlow`, `missingData[]`, `endpointErrors[]`, …). Los ratios vienen como **fracción** (0.24 = 24%); el frontend los formatea con punto de miles y sin decimales.

Errores: `400` ticker inválido · `404` sin datos de perfil · `429` límite de API · `500` falta `FMP_API_KEY` · `502` fallo al consultar FMP.

---

## Seguridad

- La key **nunca** se expone en el navegador ni se hardcodea en el frontend.
- Se lee sólo desde `process.env.FMP_API_KEY` en la función serverless.
- No subas tu `.env` a Git (ya está en `.gitignore`).

---

## Advertencia profesional

Este análisis tiene fines educativos e informativos. No constituye recomendación de inversión, asesoramiento financiero personalizado ni oferta de compra o venta de valores negociables. Toda decisión de inversión debe ser evaluada por el usuario o por un asesor registrado.
