const { search } = require("../../lib/search");

export default function handler(req, res) {
  const q = (req.query.q || "").toString().trim();
  if (!q) {
    return res.status(200).json({ query: "", results: [] });
  }
  const results = search(q, { limit: 20 });
  res.status(200).json({ query: q, results });
}
