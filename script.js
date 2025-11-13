/* script.js – FIXED FOR GITHUB PAGES: Uses GitHub Pages URLs (renders HTML properly) */
document.addEventListener('DOMContentLoaded', async () => {
    const listEl = document.getElementById('game-list');

    // ---------- AUTO‑DETECT GITHUB PAGES URL ----------
    let baseUrl = '';
    const hostname = location.hostname;
    if (hostname.endsWith('.github.io')) {
        const username = hostname.split('.')[0];
        const path = location.pathname.split('/').filter(Boolean);
        const repo = path.length ? path[0] : username;
        baseUrl = `https://${hostname}/${repo}/`;  // e.g. https://username.github.io/repo/
    } else {
        // Local fallback: relative paths
        baseUrl = './';
    }

    // ---------- LOAD GAMES VIA GITHUB API ----------
    const REPO = new URLSearchParams(location.search).get('repo') || 
                 (hostname.endsWith('.github.io') ? `${hostname.split('.')[0]}/coolsciencegames` : '');
    
    let games = [];
    if (REPO) {
        try {
            games = await fetchGamesFromGitHub(REPO, 'main');
        } catch (e) {
            console.error('GitHub fetch failed:', e);
        }
    }

    // ---------- RENDER ----------
    renderGames(games, baseUrl);
});

async function fetchGamesFromGitHub(ownerRepo, branch = 'main') {
    const games = [];
    const apiUrl = `https://api.github.com/repos/${ownerRepo}/contents/assets?ref=${branch}`;
    
    const resp = await fetch(apiUrl, { headers: { 'User-Agent': 'GameHub' } });
    if (!resp.ok) throw new Error(`API ${resp.status}`);
    
    const items = await resp.json();
    
    for (const item of items) {
        const name = item.name;
        if (item.type === 'dir') {
            // Folder: find first .html
            const folderUrl = item.url;
            const subResp = await fetch(folderUrl, { headers: { 'User-Agent': 'GameHub' } });
            const subItems = await subResp.json();
            const htmlFile = subItems.find(f => f.name.toLowerCase().endsWith('.html'));
            if (htmlFile) {
                games.push({
                    name,
                    url: `assets/${name}/${htmlFile.name}`  // GitHub Pages path
                });
            }
        } else if (item.name.toLowerCase().endsWith('.html')) {
            const gameName = item.name.replace(/\.html$/i, '');
            games.push({
                name: gameName,
                url: `assets/${item.name}`  // GitHub Pages path
            });
        }
    }
    
    return games.sort((a, b) => a.name.localeCompare(b.name));
}

function renderGames(games, baseUrl) {
    const listEl = document.getElementById('game-list');
    listEl.innerHTML = '';
    
    if (games.length === 0) {
        listEl.innerHTML = `
            <p class="loading">
                No games found.<br>
                <strong>For GitHub Pages:</strong> Add folders/files to <code>assets/</code> and push.<br>
                <small>Detected: ${baseUrl}</small>
            </p>
        `;
        return;
    }
    
    const frag = document.createDocumentFragment();
    for (const g of games) {
        const card = document.createElement('div');
        card.className = 'game-card';

        const a = document.createElement('a');
        a.href = baseUrl + g.url;  // FULL GitHub Pages URL
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = g.name;

        card.appendChild(a);
        frag.appendChild(card);
    }
    
    listEl.appendChild(frag);
}
