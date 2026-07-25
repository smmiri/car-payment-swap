# Custom domain: swapmycar.smmiri.com

## DNS (Cloudflare, zone smmiri.com)

| Type  | Name        | Target             | Proxy    |
| ----- | ----------- | ------------------ | -------- |
| CNAME | `swapmycar` | `smmiri.github.io` | DNS only |

## GitHub Pages

1. Create the GitHub repo `smmiri/car-payment-swap` and push this project.
2. Repo **Settings → Pages → Build and deployment → Source:** GitHub Actions
3. Repo **Settings → Pages → Custom domain:** `swapmycar.smmiri.com`
4. Wait for DNS check and TLS certificate (minutes to 24h).
5. Enable **Enforce HTTPS** when available.

## Build (this repo)

Deploy workflow sets:

- `VITE_BASE=/`
- `VITE_SITE_URL=https://swapmycar.smmiri.com`
- `VITE_REPO_URL=https://github.com/smmiri/car-payment-swap`

Local production build:

```bash
VITE_BASE=/ VITE_SITE_URL=https://swapmycar.smmiri.com npm run build
npm run preview
```

## SEO after go-live

1. [Google Search Console](https://search.google.com/search-console): add property `https://swapmycar.smmiri.com`
2. Submit sitemap: `https://swapmycar.smmiri.com/sitemap.xml`
