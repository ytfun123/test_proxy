document.getElementById('searchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return;
    
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    
    loading.style.display = 'block';
    results.innerHTML = '';
    
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        loading.style.display = 'none';
        
        if (data.error) {
            results.innerHTML = `<div class="error">Error: ${data.error}</div>`;
            return;
        }
        
        if (!data.results || data.results.length === 0) {
            results.innerHTML = '<p>No results found.</p>';
            return;
        }
        
        results.innerHTML = data.results.map(result => `
            <div class="result-item">
                <a href="${result.link}" target="_blank" class="result-title">${result.title}</a>
                <div class="result-url">${result.displayUrl}</div>
                <div class="result-snippet">${result.snippet}</div>
                <div class="result-actions">
                    <button class="btn btn-proxy" onclick="viewProxy('${result.link.replace(/'/g, "\\'")}')">View in Proxy</button>
                    <a href="${result.link}" target="_blank" class="btn btn-direct">Open Direct</a>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        loading.style.display = 'none';
        results.innerHTML = `<div class="error">Search failed: ${error.message}</div>`;
    }
});

async function viewProxy(url) {
    const modal = document.getElementById('proxyModal');
    const title = document.getElementById('proxyTitle');
    const content = document.getElementById('proxyContent');
    
    title.textContent = 'Loading...';
    content.innerHTML = '';
    modal.style.display = 'flex';
    
    try {
        const response = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        
        const data = await response.json();
        
        if (data.error) {
            title.textContent = 'Error';
            content.innerHTML = `<div class="error">${data.error}</div>`;
            return;
        }
        
        title.textContent = data.title;
        content.innerHTML = sanitizeHTML(data.content);
        
    } catch (error) {
        title.textContent = 'Error';
        content.innerHTML = `<div class="error">Failed to fetch: ${error.message}</div>`;
    }
}

function sanitizeHTML(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    
    // Remove scripts and potentially dangerous elements
    const scripts = div.querySelectorAll('script, iframe, object, embed');
    scripts.forEach(el => el.remove());
    
    return div.innerHTML;
}

document.querySelector('.close-btn').addEventListener('click', () => {
    document.getElementById('proxyModal').style.display = 'none';
});

document.getElementById('proxyModal').addEventListener('click', (e) => {
    if (e.target.id === 'proxyModal') {
        document.getElementById('proxyModal').style.display = 'none';
    }
});