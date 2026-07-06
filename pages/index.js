import { useState } from "react";
import Head from "next/head";

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function runSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Seeker — search your index</title>
      </Head>
      <main className={`page ${searched ? "page--results" : "page--home"}`}>
        <div className="wordmark">
          <span className="wordmark__seek">seek</span>
          <span className="wordmark__er">er</span>
        </div>

        <form onSubmit={runSearch} className="searchbar">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your crawled index…"
            autoFocus
          />
          <button type="submit" aria-label="Search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </form>

        {searched && (
          <section className="results">
            {loading && <p className="status">Searching…</p>}
            {!loading && results && results.length === 0 && (
              <p className="status">
                No results. Run <code>npm run crawl</code> to build or grow your index first.
              </p>
            )}
            {!loading &&
              results &&
              results.map((r) => (
                <article key={r.id} className="result">
                  <a className="result__url" href={r.url} target="_blank" rel="noreferrer">
                    {r.url}
                  </a>
                  <a className="result__title" href={r.url} target="_blank" rel="noreferrer">
                    {r.title}
                  </a>
                  <p className="result__snippet">{r.snippet}…</p>
                </article>
              ))}
          </section>
        )}
      </main>

      <style jsx global>{`
        :root {
          --ink: #16241f;
          --paper: #f6f4ee;
          --moss: #2f6f4f;
          --moss-dark: #1f4d36;
          --line: #d9d4c6;
          --muted: #6b7268;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          background: var(--paper);
          color: var(--ink);
          font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
      `}</style>

      <style jsx>{`
        .page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12vh 20px 40px;
          transition: padding 0.2s ease;
        }
        .page--results {
          padding-top: 6vh;
        }
        .wordmark {
          font-size: 2.6rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-bottom: 28px;
          font-family: Georgia, "Times New Roman", serif;
        }
        .wordmark__seek { color: var(--ink); }
        .wordmark__er { color: var(--moss); }

        .searchbar {
          width: 100%;
          max-width: 600px;
          display: flex;
          align-items: center;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 999px;
          padding: 4px 6px 4px 20px;
          box-shadow: 0 1px 2px rgba(22, 36, 31, 0.06);
        }
        .searchbar:focus-within {
          border-color: var(--moss);
        }
        .searchbar input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-size: 1rem;
          padding: 12px 0;
          color: var(--ink);
        }
        .searchbar button {
          border: none;
          background: var(--moss);
          color: #fff;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
        }
        .searchbar button:hover { background: var(--moss-dark); }

        .results {
          width: 100%;
          max-width: 600px;
          margin-top: 32px;
        }
        .status {
          color: var(--muted);
          font-size: 0.95rem;
        }
        .status code {
          background: #eae7db;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .result {
          padding: 16px 0;
          border-bottom: 1px solid var(--line);
        }
        .result:last-child { border-bottom: none; }
        .result__url {
          display: block;
          font-size: 0.8rem;
          color: var(--muted);
          text-decoration: none;
          margin-bottom: 2px;
        }
        .result__title {
          display: block;
          font-size: 1.15rem;
          color: var(--moss-dark);
          text-decoration: none;
          font-weight: 600;
        }
        .result__title:hover { text-decoration: underline; }
        .result__snippet {
          margin: 6px 0 0;
          color: #3d443f;
          font-size: 0.92rem;
          line-height: 1.4;
        }
      `}</style>
    </>
  );
}
