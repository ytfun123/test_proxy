const fs = require("fs");
const path = require("path");

const INDEX_PATH = path.join(process.cwd(), "data", "index.json");

let cached = null;
function loadIndex() {
  if (cached) return cached;
  if (!fs.existsSync(INDEX_PATH)) {
    cached = { documents: [], inverted: {}, documentCount: 0 };
    return cached;
  }
  cached = JSON.parse(fs.readFileSync(INDEX_PATH, "utf-8"));
  return cached;
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

/**
 * Ranks documents for a query using simple TF-IDF summed across query terms.
 */
function search(query, { limit = 10 } = {}) {
  const { documents, inverted, documentCount } = loadIndex();
  const terms = [...new Set(tokenize(query))];
  if (!terms.length || !documentCount) return [];

  const scores = new Map(); // docId -> score

  for (const term of terms) {
    const postings = inverted[term];
    if (!postings) continue;
    const docsWithTerm = Object.keys(postings).length;
    const idf = Math.log(1 + documentCount / docsWithTerm);
    for (const [docIdStr, tf] of Object.entries(postings)) {
      const docId = Number(docIdStr);
      const score = tf * idf;
      scores.set(docId, (scores.get(docId) || 0) + score);
    }
  }

  const ranked = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([docId, score]) => {
      const doc = documents.find((d) => d.id === docId);
      return { ...doc, score };
    });

  return ranked;
}

module.exports = { search, loadIndex };
