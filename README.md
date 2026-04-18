# ProcurePilot

ProcurePilot is a hackathon-ready MVP for an AI-powered, crisis-aware procurement copilot built for SMEs in Southeast Asia. It helps procurement and operations teams compare suppliers fast, explain trade-offs clearly, surface risk, and find substitute options when supply gets disrupted.

## Problem

SME procurement teams often make urgent purchasing decisions with fragmented supplier information:

- pricing lives in spreadsheets or inbox threads
- lead times change during disruptions
- supplier risk is hard to compare quickly
- substitute options are not obvious when stock tightens

During events like oil shocks, logistics bottlenecks, or sudden price spikes, that slows decisions and increases operational risk.

## Solution

ProcurePilot turns an urgent procurement brief into a live sourcing workspace:

- compares regional suppliers side by side
- ranks vendors with transparent weighted scoring
- flags risky suppliers and timing issues
- suggests substitute items when the shortlist is weak
- explains the recommendation in plain business language
- runs the recommendation through a server-side Lua procurement agent

## Key Features

- Startup-style landing dashboard with SME procurement metrics
- Guided agent-led sourcing interview that asks one procurement question at a time
- Recommendation tiles that the user can click to choose a supplier path
- Supplier sandbox negotiation flow after a recommendation is selected
- New request flow with realistic sample scenarios
- Mock supplier network tailored to Southeast Asia
- Transparent supplier ranking engine with live weight sliders
- AI recommendation cards:
  best overall, lowest cost, fastest delivery, best balanced
- Substitute finder for constrained or risky items
- Crisis / risk insights panel with low, medium, high signals
- Minimal UI with one request form and one recommendation dashboard
- SQLite-backed request persistence
- Lua tool-backed server-side assessment flow compiled with `lua-cli`
- Live Lua chat route for plain-English procurement briefs
- Lua tool-backed supplier negotiation simulation for demo-ready price improvement

## Demo Data

The app ships with:

- 18 regional supplier profiles
- 15 procurement items across maintenance, packaging, chemicals, spare parts, electronics, office supplies, and safety equipment
- 7 seeded procurement requests
- realistic pricing, lead times, MOQ, reliability, stock, and risk signals

## Transparent Scoring Model

Suppliers are scored with normalized factors where higher is better overall:

- lower price
- shorter lead time
- higher reliability
- higher stock availability
- lower supplier risk
- stronger urgency fit against the required-by date

Buyers can change the weights live from the dashboard and instantly re-rank the shortlist.

## Demo Flow

1. Open the dashboard and show the top KPI cards.
2. Click an urgent request such as industrial lubricant or generator spare parts.
3. Walk through the best overall recommendation and the plain-English rationale.
4. Adjust the scoring sliders to show transparent decision logic.
5. Scroll to the supplier comparison table and crisis insights.
6. Show substitute options and copy/export the RFQ-ready summary.
7. Open the New Request page and preload another scenario to prove the flow is reusable.

## Tech Stack

- Next.js 16
- TypeScript
- Tailwind CSS
- SQLite via `better-sqlite3`
- Lua Agentic AI tooling via `lua-cli`
- Lucide React icons

## Local Setup

From this `procurepilot` directory:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

For the live Lua agent chat panel, ProcurePilot uses:

- `LUA_API_KEY` if it is set in your environment
- otherwise your local Lua CLI credentials file at `~/.lua-cli/credentials`

The project is already initialized against a Lua agent through [`lua.skill.yaml`](./lua.skill.yaml). If you want to rebind it to a different agent, run:

```bash
lua init --force
```

Production checks:

```bash
npm run lint
npm run build
npm run lua:compile
npx lua push all --ci --force --auto-deploy
```

## Deploying To Vercel

This app is ready for Vercel as a standard Next.js project.

If you import the whole workspace/repository into Vercel:

1. Create a new Vercel project.
2. Set the Root Directory to `procurepilot`.
3. Keep the detected framework as `Next.js`.
4. No environment variables are required for local seeded usage.
5. Deploy.

If you upload or connect only the `procurepilot` folder, no extra configuration is needed.

The project also includes a lightweight [`vercel.json`](./vercel.json), a Node engine declaration in `package.json`, and a Lua manifest in [`lua.skill.yaml`](./lua.skill.yaml).

Important note:
- the web app itself runs locally and the Lua-backed assessment route works now
- `lua compile` works locally
- cloud sync for the Lua agent is still skipped until you add your Lua `agentId`, `orgId`, and API credentials

## Project Structure

```text
src/
  app/
    api/
      agent/assess/route.ts
      requests/route.ts
    page.tsx
    request/page.tsx
  components/
    dashboard-view.tsx
    request-form.tsx
    site-shell.tsx
  lib/
    data.ts
    format.ts
    procurement-schemas.ts
    scoring.ts
    server/
      database.ts
      request-repository.ts
    types.ts
    lua/
      runtime.ts
  skills/
    procurement-ops.skill.ts
    tools/
      CompareUrgencyImpactTool.ts
      RunProcurementAssessmentTool.ts
      SystemHealthCheckTool.ts
      ValidateProcurementRequestTool.ts
```

## 30-Second Demo Walkthrough

"ProcurePilot helps SME buyers source urgent items during disruptions. I open one request, the server-side Lua agent ranks suppliers across price, lead time, stock, and risk, and I get a recommended vendor with a plain-English reason. If the shortlist looks risky, the app surfaces substitutes and crisis signals. I can also adjust the scoring weights live without leaving the page."

## 1-Minute Pitch For Judges

"ProcurePilot is a crisis-aware procurement copilot built for SMEs that cannot afford slow sourcing decisions during supply shocks. When an urgent item is needed, the app saves the request into a real backend, runs a Lua-based procurement agent server-side, ranks suppliers transparently, flags delivery and risk issues, and recommends the best vendor in business language that a buyer or operations manager can trust. Instead of juggling spreadsheets, emails, and gut feel, teams get a clear, explainable decision in one place with a minimal interface that is easy to use under pressure."

## 3 Value Propositions For SME Customers

- Make urgent purchasing decisions faster without sacrificing visibility into risk.
- Compare suppliers and substitutes in one view instead of piecing data together manually.
- Explain procurement decisions clearly to managers, owners, and finance teams.
