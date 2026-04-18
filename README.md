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
- generates an RFQ-ready summary for the next step

## Key Features

- Startup-style landing dashboard with SME procurement metrics
- New request flow with realistic sample scenarios
- Mock supplier network tailored to Southeast Asia
- Transparent supplier ranking engine with live weight sliders
- AI recommendation cards:
  best overall, lowest cost, fastest delivery, best balanced
- Substitute finder for constrained or risky items
- Crisis / risk insights panel with low, medium, high signals
- RFQ draft copy + export recommendation summary
- Local-only demo architecture with seeded mock data and no backend dependency

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
- Local mock data + localStorage persistence
- Lucide React icons

## Local Setup

From this `procurepilot` directory:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

Production checks:

```bash
npm run lint
npm run build
```

## Deploying To Vercel

This app is ready for Vercel as a standard Next.js project.

If you import the whole workspace/repository into Vercel:

1. Create a new Vercel project.
2. Set the Root Directory to `procurepilot`.
3. Keep the detected framework as `Next.js`.
4. No environment variables are required for this MVP.
5. Deploy.

If you upload or connect only the `procurepilot` folder, no extra configuration is needed.

The project also includes a lightweight [`vercel.json`](./vercel.json) and a Node engine declaration in `package.json` to make the deployment target explicit.

## Project Structure

```text
src/
  app/
    page.tsx
    request/page.tsx
  components/
    dashboard-view.tsx
    request-form.tsx
    site-shell.tsx
  lib/
    data.ts
    format.ts
    scoring.ts
    storage.ts
    types.ts
```

## 30-Second Demo Walkthrough

"ProcurePilot helps SME buyers source urgent items during disruptions. I select a request, instantly compare suppliers across price, lead time, stock, and risk, and get a recommended vendor with a plain-English reason. If the shortlist looks risky, the app suggests substitutes and shows crisis signals. I can also adjust the scoring weights live and export an RFQ-ready summary in seconds."

## 1-Minute Pitch For Judges

"ProcurePilot is a crisis-aware procurement copilot built for SMEs that cannot afford slow sourcing decisions during supply shocks. When an urgent item is needed, the app pulls together supplier options, ranks them transparently, flags delivery and risk issues, and recommends the best vendor in business language that a buyer or operations manager can trust. Instead of juggling spreadsheets, emails, and gut feel, teams get a clear, explainable decision in one place. The MVP is designed for real demo value: realistic Southeast Asia supplier data, live scoring controls, substitute recommendations, and an exportable RFQ summary, all without heavy backend setup."

## 3 Value Propositions For SME Customers

- Make urgent purchasing decisions faster without sacrificing visibility into risk.
- Compare suppliers and substitutes in one view instead of piecing data together manually.
- Explain procurement decisions clearly to managers, owners, and finance teams.
