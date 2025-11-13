/* script.js – FINAL FIX: Opens games as real webpages on GitHub Pages */
document.addEventListener('DOMContentLoaded', async () => {
    const listEl = document.getElementById('game-list');

    // Auto-detect GitHub Pages base URL
    const baseUrl = location.origin + location.pathname.split('/').slice(0, -1).join('/') + '/';
    console.log('Base URL:', baseUrl); // Debug: Check console

    // GitHub API: List everything in /assets
    const owner = 'charliedayfockens-hue';
    const repo = 'coolsciencegames';
    const branch = 'main';
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/assets?ref=${branch}`;

    let items = [];
    try {
        const resp = await fetch(apiUrl, {
            headers: { 'User-Agent': 'GameHub-Fix' }
        });
        if (!resp.ok) throw new Error(`GitHub API ${resp.status}`);
        items = await resp.json();
    } catch (e) {
        listEl.innerHTML = `<p class="loading">Error loading games: ${e.message}</p>`;
        return;
    }

    const games = [];

    // Scan each item in assets/
    for (const item of items) {
        const name = item.name;

        if (item.type === 'dir') {
            // Folder: Look inside for any .html file
            const folderApi = `https://api.github.com/repos/${owner}/${repo}/contents/assets/${name}?ref=${branch}`;
            let files = [];
            try {
                const r = await fetch(folderApi, { headers: { 'User-Agent': 'GameHub-Fix' } });
                if (r.ok) files = await r.json();
            } catch (_) { continue; }

            const htmlFile = files.find(f => f.name.toLowerCase().endsWith('.html'));
            if (htmlFile) {
                // GitHub Pages URL: RENDERS HTML PROPERLY
                const gameUrl = `${baseUrl}assets/${name}/${htmlFile.name}`;
                games.push({ name, url: gameUrl });
            }
        }
        else if (item.type === 'file' && name.toLowerCase().endsWith('.html')) {
            // Single .html file
            const gameName = name.replace(/\.html?$/i, '');
            const gameUrl = `${baseUrl}assets/${name}`;
            games.push({ name: gameName, url: gameUrl });
        }
    }

    // Sort and render
    games.sort((a, b) => a.name.localeCompare(b.name));

    if (games.length === 0) {
        listEl.innerHTML = '<p class="loading">No games found in assets/ – add a folder with an .html file!</p>';
        return;
    }

    const frag = document.createDocumentFragment();
    for (const g of games) {
        const card = document.createElement('div');
        card.className = 'game-card';

        const a = document.createElement('a');
        a.href = g.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = g.name;

        card.appendChild(a);
        frag.appendChild(card);
    }

    listEl.innerHTML = '';
    listEl.appendChild(frag);
});
