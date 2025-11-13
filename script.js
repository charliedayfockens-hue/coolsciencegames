/* script.js – 100% automatic, works on GitHub Pages */
document.addEventListener('DOMContentLoaded', async () => {
    const listEl = document.getElementById('game-list');

    // ---------- AUTO‑DETECT REPO ----------
    const hostname = location.hostname;
    if (!hostname.endsWith('.github.io')) {
        listEl.innerHTML = '<p class="loading">Error: Not on GitHub Pages</p>';
        return;
    }
    const username = hostname.split('.')[0];
    const path = location.pathname.split('/').filter(Boolean);
    const repo = path.length ? path[0] : `${username}.github.io`;
    const REPO = `${username}/${repo}`;

    // ---------- TRY BRANCHES ----------
    const branches = ['main', 'gh-pages', 'master'];
    let branch = null;
    let items = null;

    for (const b of branches) {
        const url = `https://api.github.com/repos/${REPO}/contents/assets?ref=${b}`;
        try {
            const r = await fetch(url, { headers: { 'User-Agent': 'GameHub' } });
            if (r.ok) {
                items = await r.json();
                branch = b;
                console.log(`Found assets on branch: ${b}`);
                break;
            }
        } catch (_) { /* ignore */ }
    }

    if (!items) {
        listEl.innerHTML = `<p class="loading">Cannot find assets/ folder.<br>Repo detected as <code>${REPO}</code></p>`;
        return;
    }

    // ---------- FIND GAMES ----------
    const games = [];

    for (const item of items) {
        const name = item.name;
        const type = item.type;

        if (type === 'dir') {
            // ---- FOLDER: look for ANY .html file ----
            const folderApi = `https://api.github.com/repos/${REPO}/contents/assets/${name}?ref=${branch}`;
            let files = [];
            try {
                const r = await fetch(folderApi, { headers: { 'User-Agent': 'GameHub' } });
                if (r.ok) files = await r.json();
            } catch (_) { continue; }

            const htmlFile = files.find(f => f.type === 'file' && f.name.toLowerCase().endsWith('.html'));
            if (htmlFile) {
                // Use the raw GitHub Pages URL (download_url works directly)
                const rawUrl = htmlFile.download_url;
                games.push({
                    name: name,
                    url: rawUrl   // e.g. https://raw.githubusercontent.com/.../assets/MyGame/game.html
                });
            }
        }
        else if (type === 'file' && name.toLowerCase().endsWith('.html')) {
            // ---- SINGLE HTML FILE ----
            const gameName = name.replace(/\.html?$/i, '');
            games.push({
                name: gameName,
                url: item.download_url
            });
        }
    }

    // ---------- SHOW GAMES ----------
    games.sort((a, b) => a.name.localeCompare(b.name));

    if (games.length === 0) {
        listEl.innerHTML = '<p class="loading">No games found.<br>Add a folder with any <code>.html</code> file or a single <code>.html</code> file to <code>assets/</code>.</p>';
        return;
    }

    const frag = document.createDocumentFragment();
    for (const g of games) {
        const card = document.createElement('div');
        card.className = 'game-card';

        const a = document.createElement('a');
        a.href = g.url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = g.name;

        card.appendChild(a);
        frag.appendChild(card);
    }

    listEl.innerHTML = '';
    listEl.appendChild(frag);
});
