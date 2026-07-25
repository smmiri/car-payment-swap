# SwapMyCar (`car-payment-swap`)

Open-source Canadian **vehicle payment swap** calculator. Compare keeping your financed car with replacement options on **all-in monthly cost** (loan + insurance + M&O + fuel/electricity).

**Live:** [swapmycar.smmiri.com](https://swapmycar.smmiri.com)  
**Stack:** Vite · React 19 · Tailwind 4 · Recharts · pure `src/lib/` + `node --test`

## Features

- Multi-scenario trade-in comparison (add / duplicate / delete)
- Province-aware purchase taxes — **BC PST-116**: rate from full price, tax on net after trade-in
- Auto loan math with **monthly compounding** (not Canadian mortgage semi-annual)
- EV operating-cost deltas + federal EVAP / provincial rebate table (`RULES_AS_OF: July 2026`)
- Per-field auto/manual overrides
- Reverse **max affordable purchase price** (binary search)
- Input persistence (`smc_inputs` localStorage + cookie when small enough)

## Develop

```bash
npm install
npm test
npm run dev
```

Production build:

```bash
VITE_BASE=/ VITE_SITE_URL=https://swapmycar.smmiri.com npm run build
npm run preview
```

## Deploy

GitHub Pages workflow: `.github/workflows/deploy-pages.yml`  
Custom domain setup: [`docs/CUSTOM_DOMAIN.md`](docs/CUSTOM_DOMAIN.md)

## License

MIT © Mohammad Miri
