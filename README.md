# 42p Games

A game discovery browser for Discord friend groups, available at [games.42p.uk](https://games.42p.uk).

Companion app to [42p Calendar](https://calendar.42p.uk) — games added here appear as release-date events on your server's calendar.

## What it does

- Browse and search the RAWG.io game database
- Filter by genre, tag, platform, and release window
- **TBA & Early Access** mode — surfaces games with no confirmed release date and upcoming unreleased titles
- Sort by release date, rating, popularity, Metacritic score, or name
- Search returns relevance-ranked results, including TBA/unreleased games
- One-click add to your Discord server's calendar
- Shows which games your server is already tracking
- Sign in with Discord; switch between servers

## Architecture

```
games.42p.uk  →  Cloudflare Pages (React 18 + Vite)
                   └── api.42p.uk Worker (RAWG proxy + game tracking)
```

All API calls go through the shared `api.42p.uk` Cloudflare Worker, which adds the RAWG API key server-side and handles auth via the shared Discord session cookie.

## Repo structure

```
games-calendar/
└── src/
    ├── App.jsx     Entire app in one file
    ├── api.js      API calls
    └── index.css
```

## Local development

```bash
npm install
# Create .env.local:
# VITE_API_URL=https://api.42p.uk
npm run dev
```

## Deployment

```bash
npm run build
npx wrangler pages deploy dist --project-name games-calendar
```

Cloudflare Pages project: `games-calendar` → [games.42p.uk](https://games.42p.uk)

## Related

- **[discord-calendar](https://github.com/42p-personal/discord-calendar)** — main calendar app + shared Worker backend
