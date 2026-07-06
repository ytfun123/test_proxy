import express from 'express';
import cors from 'cors';
import axios from 'axios';
import cheerio from 'cheerio';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// User agents
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Search DuckDuckGo
async function searchDuckDuckGo(query) {
  try {
    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'DNT': '1'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const results = [];

    $('.result').each((index, element) => {
      const titleEl = $(element).find('.result__a');
      const snippetEl = $(element).find('.result__snippet');
      const urlEl = $(element).find('.result__url');

      const title = titleEl.text().trim();
      const snippet = snippetEl.text().trim();
      const link = titleEl.attr('href');
      const displayUrl = urlEl.text().trim();

      if (title && link) {
        results.push({
          title,
          snippet,
          link,
          displayUrl: displayUrl || new URL(link).hostname,
          position: index + 1
        });
      }
    });

    return results;
  } catch (error) {
    console.error('Search error:', error.message);
    throw new Error('Failed to fetch search results');
  }
}

// API: Search
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query required' });
    }

    if (q.length > 500) {
      return res.status(400).json({ error: 'Query too long' });
    }

    const results = await searchDuckDuckGo(q);

    res.json({
      query: q,
      count: results.length,
      results: results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Proxy content
app.post('/api/proxy', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL required' });
    }

    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    const response = await axios.get(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': '*/*'
      },
      timeout: 15000,
      maxRedirects: 5
    });

    res.json({
      status: response.status,
      contentType: response.headers['content-type'],
      content: response.data,
      url: url,
      title: extractTitle(response.data)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch URL: ' + error.message });
  }
});

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/);
  return match ? match[1] : 'No title';
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Serve index
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

export default app;
