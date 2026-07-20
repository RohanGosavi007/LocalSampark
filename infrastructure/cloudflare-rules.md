# Cloudflare WAF & Security Rules

To protect the LocalSampark Super-App API from DDoS, bots, and malicious payloads, the following Cloudflare WAF configuration is required for production.

## 1. Edge Caching & Rate Limiting
- **Rule:** Rate Limit Login Attempts
  - **Match:** `http.request.uri.path eq "/api/v1/auth/login"`
  - **Action:** Block for 1 hour after 5 failed attempts in 1 minute.
- **Rule:** General API Rate Limit
  - **Match:** `http.request.uri.path wildcard "/api/v1/*"`
  - **Action:** JS Challenge after 1000 requests per IP per minute.

## 2. Geo-Blocking
Since LocalSampark is a hyper-local Indian app, we can block high-risk international traffic.
- **Match:** `(not ip.geoip.country in {"IN"})`
- **Action:** Managed Challenge

## 3. Managed WAF Rulesets
Enable the following Cloudflare Managed Rulesets:
- Cloudflare Managed Ruleset (Core)
- Cloudflare OWASP Core Ruleset (Block SQLi, XSS)
- Cloudflare Exposed Credentials Check (Warn if users login with leaked passwords)

## 4. Bot Fight Mode
- Enable **Bot Fight Mode** to challenge known bots.
- Allow **Verified Bots** (Googlebot, Bingbot) for SEO indexing of the Web App.

## 5. Caching Rules
- **Cache Level:** Cache Everything for static assets (`/public/*`, `/_next/static/*`)
- **Bypass Cache on Cookie:** Bypass cache if `authToken` cookie is present to prevent serving stale or private data.
