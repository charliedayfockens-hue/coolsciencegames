/* script.js */
document.addEventListener('DOMContentLoaded', async () => {
    const listEl = document.getElementById('game-list');
    const REPO = 'charliedayfockens-hue/coolsciencegames'; // CHANGE THIS!
    const BRANCH = 'main';                 // or 'gh-pages'

    // Build GitHub API URL for the assets folder
    const apiUrl = `https://api.github.com/repos/${REPO}/contents/assets?ref=${BRANCH}`;

    let items;
    try {
        const resp = await fetch(apiUrl);
        if (!resp.ok) throw new Error(`GitHub API ${resp.status}`);
        items = await resp.json();
    } catch (e) {
        listEl.innerHTML = `<p class="loading">Error: ${e.message}<br>Check REPO name in script.js</p>`;
        return;
    }

    const games = [];

    for (const item of items) {
        const name = item.name;
        const type = item.type; // 'file' or 'dir'

        if (type === 'dir') {
            // Folder game → look for index.html inside
            const subResp = await fetch(item.url);
            const subItems = await subResp.json();
            const hasIndex = subItems.some(f => f.name.toLowerCase() === 'index.html');
            if (hasIndex) {
                games.push({
                    name: name,
                    url: `assets/${name}/index.html`
                });
            }
        } else if (type === 'file' && name.toLowerCase().endsWith('.html')) {
            // Single HTML file
            const gameName = name.replace(/\.html$/i, '');
            games.push({
                name: gameName,
                url: `assets/${name}`
            });
        }
    }

    // Sort alphabetically
    games.sort((a, b) => a.name.localeCompare(b.name));

    if (games.length === 0) {
        listEl.innerHTML = '<p class="loading">No games found in assets/</p>';
        return;
    }

    const fragment = document.createDocumentFragment();
    for (const game of games) {
        const card = document.createElement('div');
        card.className = 'game-card';

        const link = document.createElement('a');
        link.href = game.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = game.name;

        card.appendChild(link);
        fragment.appendChild(card);
    }

    listEl.innerHTML = '';
    listEl.appendChild(fragment);

});
