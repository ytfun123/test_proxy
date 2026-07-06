// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const results = document.getElementById('results');
const resultsList = document.getElementById('resultsList');
const resultCount = document.getElementById('resultCount');
const searchQuery = document.getElementById('searchQuery');
const searchTypeRadios = document.querySelectorAll('input[name="searchType"]');

// Get API base URL (works on both local and Vercel)
const API_BASE = window.location.origin;

// Event Listeners
searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
});

// Get selected search type
function getSearchType() {
    return document.querySelector('input[name="searchType"]:checked').value;
}

// Validate URL format
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Detect if input is a URL
function isUrlInput(query) {
    return isValidUrl(query) || query.includes('/');
}

// Perform search
async function performSearch() {
    const query = searchInput.value.trim();

    if (!query) {
        showError('Please enter a search query or URL');
        return;
    }

    clearError();
    showLoading();
    hideResults();

    try {
        const searchType = getSearchType();
        
        // Auto-detect URL if it looks like one
        let finalType = searchType;
        if (searchType === 'web' && isUrlInput(query)) {
            finalType = 'url';
        }

        const response = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}&type=${finalType}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Search failed');
        }

        const data = await response.json();
        displayResults(data);
    } catch (err) {
        showError(err.message || 'An error occurred during search');
    } finally {
        hideLoading();
    }
}

// Display results
function displayResults(data) {
    hideLoading();
    
    if (!data.results || (Array.isArray(data.results) && data.results.length === 0)) {
        showError('No results found. Try a different search.');
        return;
    }

    // Update header
    if (Array.isArray(data.results)) {
        resultCount.textContent = `${data.results.length} results found`;
    } else {
        resultCount.textContent = 'Direct URL Preview';
    }
    
    searchQuery.textContent = `For: "${data.query}"`;

    // Clear previous results
    resultsList.innerHTML = '';

    // Display results
    if (Array.isArray(data.results)) {
        data.results.forEach(result => {
            const resultElement = createResultElement(result);
            resultsList.appendChild(resultElement);
        });
    } else {
        // Direct URL preview
        const previewElement = createUrlPreview(data.results);
        resultsList.appendChild(previewElement);
    }

    showResults();
}

// Create result element
function createResultElement(result) {
    const div = document.createElement('div');
    div.className = 'result-item';

    const url = document.createElement('a');
    url.className = 'result-url';
    url.textContent = result.displayUrl || new URL(result.link).hostname;
    url.href = '#';

    const title = document.createElement('a');
    title.className = 'result-title';
    title.textContent = result.title;
    title.href = '#';
    title.addEventListener('click', (e) => {
        e.preventDefault();
        openInProxy(result.link);
    });

    const snippet = document.createElement('p');
    snippet.className = 'result-snippet';
    snippet.textContent = result.snippet || 'No description available';

    div.appendChild(url);
    div.appendChild(title);
    div.appendChild(snippet);

    return div;
}

// Create URL preview
function createUrlPreview(data) {
    const div = document.createElement('div');
    div.className = 'result-item';

    const title = document.createElement('h3');
    title.textContent = 'Direct URL Preview';
    title.style.marginBottom = '10px';

    const status = document.createElement('p');
    status.textContent = `Status: ${data.statusCode}`;
    status.style.color = '#666';

    const contentType = document.createElement('p');
    contentType.textContent = `Content Type: ${data.contentType}`;
    contentType.style.color = '#666';

    div.appendChild(title);
    div.appendChild(status);
    div.appendChild(contentType);

    return div;
}

// Open result in proxy
function openInProxy(url) {
    // For now, just open the URL normally
    // In a real proxy, you'd want to display it in a frame or fetch through your proxy
    window.open(url, '_blank');
}

// Show/Hide helpers
function showLoading() {
    loading.classList.remove('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
}

function showResults() {
    results.classList.remove('hidden');
}

function hideResults() {
    results.classList.add('hidden');
}

function showError(message) {
    error.textContent = message;
    error.classList.remove('hidden');
}

function clearError() {
    error.classList.add('hidden');
}

// Focus on search input when page loads
window.addEventListener('load', () => {
    searchInput.focus();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        searchInput.focus();
    }
});
