/**
 * Simple BFS web crawler + inverted-index builder.
 *
 * Usage:
 *   node crawler/crawl.js
 *
 * Configure seed URLs, max pages, and depth below (or via env vars).
 * Output: data/index.json — consumed by lib/search.js at query time.
 *
 * Etiquette built in:
 *   - Sends a descriptive User-Agent
 *   - Checks robots.txt per host before crawling a page
 *   - Adds a delay between requests to the same host
 *   - Skips non-HTML content and obvious binary/file links
 */

const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

// ---- Configuration -----------------------------------------------------
const SEED_URLS = (process.env.SEED_URLS || "https://en.wikipedia.org/wiki/Web_crawler")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const MAX_PAGES = parseInt(process.env.MAX_PAGES || "50", 10);
const MAX_DEPTH = parseInt(process.env.MAX_DEPTH || "2", 10);
const REQUEST_DELAY_MS = parseInt(process.env.REQUEST_DELAY_MS || "500", 10);
const USER_AGENT = "duck-clone-bot/1.0 (+https://github.com/yourname/duck-clone)";

const OUTPUT_PATH = path.join(__dirname, "..", "data", "index.json");

// ---- Helpers ------------------------------------------------------------

const robotsCache = new Map(); // host -> { disallow: [paths] }

async function getRobotsRules(origin) {
  if (robotsCache.has(origin)) return robotsCache.get(origin);
  let rules = { disallow: [] };
  try {
    const res = await fetch(origin + "/robots.txt", {
      headers: { "User-Agent": USER_AGENT },
    });
    if (res.ok) {
      const text = await res.text();
      let applies = false;
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (/^user-agent:\s*\*/i.test(trimmed)) applies = true;
        else if (/^user-agent:/i.test(trimmed)) applies = false;
        else if (applies && /^disallow:/i.test(trimmed)) {
          const p = trimmed.split(":").slice(1).join(":").trim();
          if (p) rules.disallow.push(p);
        }
      }
    }
  } catch (e) {
    // no robots.txt or fetch failed — proceed with no extra restrictions
  }
  robotsCache.set(origin, rules);
  return rules;
}

function isAllowedByRobots(rules, pathname) {
  return !rules.disallow.some((p) => pathname.startsWith(p));
}

function normalizeUrl(base, href) {
  try {
    const u = new URL(href, base);
    u.hash = "";
    if (!["http:", "https:"].includes(u.protocol)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

const lastRequestByHost = new Map();
async function politeFetch(url) {
  const host = new URL(url).host;
  const last = lastRequestByHost.get(host) || 0;
  const wait = REQUEST_DELAY_MS - (Date.now() - last);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestByHost.set(host, Date.now());
  return fetch(url, { headers: { "User-Agent": USER_AGENT } });
}

// ---- Crawl loop -----------------------------------------------------------

async function crawl() {
  const visited = new Set();
  const queue = SEED_URLS.map((u) => ({ url: u, depth: 0 }));
  const documents = []; // { id, url, title, text }

  while (queue.length && documents.length < MAX_PAGES) {
    const { url, depth } = queue.shift();
    if (visited.has(url) || depth > MAX_DEPTH) continue;
    visited.add(url);

    let origin;
    try {
      origin = new URL(url).origin;
    } catch {
      continue;
    }

    const rules = await getRobotsRules(origin);
    if (!isAllowedByRobots(rules, new URL(url).pathname)) {
      console.log(`skip (robots.txt): ${url}`);
      continue;
    }

    let res;
    try {
      res = await politeFetch(url);
    } catch (e) {
      console.log(`fetch failed: ${url} (${e.message})`);
      continue;
    }
    if (!res.ok) {
      console.log(`skip (status ${res.status}): ${url}`);
      continue;
    }
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) continue;

    const html = await res.text();
    const $ = cheerio.load(html);
    const title = $("title").first().text().trim() || url;
    $("script, style, noscript").remove();
    const text = $("body").text().replace(/\s+/g, " ").trim();

    const id = documents.length;
    documents.push({ id, url, title, text: text.slice(0, 20000) });
    console.log(`[${documents.length}/${MAX_PAGES}] indexed: ${title} (${url})`);

    if (depth < MAX_DEPTH) {
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        const abs = normalizeUrl(url, href);
        if (abs && !visited.has(abs)) {
          queue.push({ url: abs, depth: depth + 1 });
        }
      });
    }
  }

  return documents;
}

function buildInvertedIndex(documents) {
  const inverted = {}; // term -> { [docId]: termFrequency }
  for (const doc of documents) {
    const terms = tokenize(doc.title + " " + doc.text);
    const freq = {};
    for (const t of terms) freq[t] = (freq[t] || 0) + 1;
    for (const [term, tf] of Object.entries(freq)) {
      if (!inverted[term]) inverted[term] = {};
      inverted[term][doc.id] = tf;
    }
  }
  return inverted;
}

async function main() {
  console.log(`Starting crawl. Seeds: ${SEED_URLS.join(", ")}`);
  const documents = await crawl();
  const inverted = buildInvertedIndex(documents);

  // Store only metadata + a short snippet for documents, not full text, to keep index.json small.
  const docsOut = documents.map((d) => ({
    id: d.id,
    url: d.url,
    title: d.title,
    snippet: d.text.slice(0, 300),
  }));

  const output = {
    generatedAt: new Date().toISOString(),
    documentCount: docsOut.length,
    documents: docsOut,
    inverted,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output));
  console.log(`\nDone. Indexed ${docsOut.length} pages -> ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
