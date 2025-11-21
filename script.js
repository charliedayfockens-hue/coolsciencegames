document.addEventListener('DOMContentLoaded', async () => {
    const listEl = document.getElementById('game-list');
    const searchInput = document.getElementById('search-bar');
    const counterEl = document.getElementById('game-counter');

    const baseUrl = location.origin + location.pathname.split('/').slice(0, -1).join('/') + '/';
    const owner = 'charliedayfockens-hue';
    const repo = 'coolsciencegames';
    const branch = 'main';

    let allGames = [];

    try {
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/assets?ref=${branch}`;
        const resp = await fetch(apiUrl, { headers: { 'User-Agent': 'GameHub' } });
        if (!resp.ok) throw new Error('Failed to load games');
        const items = await resp.json();

        for (const item of items) {
            const name = item.name;

            if (item.type === 'dir') {
                const folderApi = `https://api.github.com/repos/${owner}/${repo}/contents/assets/${name}?ref=${branch}`;
                const r = await fetch(folderApi, { headers: { 'User-Agent': 'GameHub' } });
                if (!r.ok) continue;
                const files = await r.json();
                const htmlFile = files.find(f => f.name.toLowerCase().endsWith('.html'));
                if (htmlFile) {
                    allGames.push({
                        name: name,
                        url: `${baseUrl}assets/${name}/${htmlFile.name}`,
                        lowerName: name.toLowerCase()
                    });
                }
            }
            else if (item.name.toLowerCase().endsWith('.html')) {
                const gameName = item.name.replace(/\.html?$/i, '');
                allGames.push({
                    name: gameName,
                    url: `${baseUrl}assets/${item.name}`,
                    lowerName: gameName.toLowerCase()
                });
            }
        }

        allGames.sort((a, b) => a.name.localeCompare(b.name));
    } catch (e) {
        listEl.innerHTML = `<p class="loading">Error loading games. Check internet or repo.</p>`;
        return;
    }

    const render = (games) => {
        listEl.innerHTML = '';
        counterEl.textContent = `${games.length} Game${games.length === 1 ? '' : 's'} Available`;

        if (games.length === 0) {
            listEl.innerHTML = '<p class="loading">No games match your search.</p>';
            return;
        }

        const frag = document.createDocumentFragment();
        games.forEach(g => {
            const card = document.createElement('div');
            card.className = 'game-card';
            const a = document.createElement('a');
            a.href = g.url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.textContent = g.name;
            card.appendChild(a);
            frag.appendChild(card);
        });
        listEl.appendChild(frag);
    };

    render(allGames);

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        if (!query) {
            render(allGames);
            return;
        }
        const filtered = allGames.filter(g => g.lowerName.includes(query));
        render(filtered);
    });
});