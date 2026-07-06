# Seeker — a tiny search engine, built from scratch

A minimal real search engine: a crawler that indexes real pages, and a
Next.js app (deployable on Vercel) that searches that index.

## How it works

```
crawler/crawl.js   -> crawls the web, writes data/index.json
lib/search.js      -> loads data/index.json, ranks results (TF-IDF)
pages/api/search.js-> API route: /api/search?q=...
pages/index.js     -> search UI
```

**Important constraint:** Vercel serverless functions can't run a long-lived
crawl (no persistent disk, execution time limits). So crawling happens
*offline* — you run it locally or on a schedule (e.g. GitHub Actions) — and
the resulting `data/index.json` is what the deployed app actually searches.
The web app itself never crawls live.

## 1. Install

```bash
npm install
```

## 2. Crawl to build your index

Edit the seed URLs and limits, then run:

```bash
SEED_URLS="https://example.com,https://another-site.com" \
MAX_PAGES=100 \
MAX_DEPTH=2 \
npm run crawl
```

This writes `data/index.json`. Re-run any time to grow/update the index —
note it currently overwrites rather than merges, so include all your seeds
each time (or extend the script to merge if you want incremental crawls).

Only crawl sites you own or have permission to crawl. The crawler checks
`robots.txt` and adds delays between requests, but you're responsible for
respecting the terms of any site you point it at.

## 3. Run locally

```bash
npm run dev
```

Visit http://localhost:3000 and search.

## 4. Deploy to Vercel via GitHub

1. Push this repo to GitHub.
2. In Vercel, "Add New Project" → import the repo → deploy (Next.js is
   auto-detected, no config needed).
3. `data/index.json` is committed to the repo, so Vercel serves whatever
   index you last crawled. To update the live site, re-run the crawler
   locally and push the updated `data/index.json`.

### Keeping the index fresh automatically (optional)

Add a GitHub Action that runs `npm run crawl` on a schedule (e.g. nightly)
and commits the updated `data/index.json` — Vercel will redeploy
automatically on each push. Ask if you want this workflow file written out.

## Scaling beyond a JSON file

`data/index.json` is fine for a demo (tens to low thousands of pages).
Beyond that, swap `lib/search.js` and the crawler's output step for a real
datastore (Postgres full-text search, SQLite + FTS5, Elasticsearch/OpenSearch,
or a vector DB if you want semantic search) — the crawl → index → search
shape stays the same.
