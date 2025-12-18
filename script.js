document.addEventListener('DOMContentLoaded', async () => {
    const listEl = document.getElementById('game-list');
    const searchInput = document.getElementById('search-bar');
    const counterEl = document.getElementById('game-counter');

    const isGitHubPages = location.hostname.includes('github.io');
    const basePath = isGitHubPages ? '/coolsciencegames/' : '/';
    const baseUrl = location.origin + basePath;

    let allGames = [];
    const CACHE_KEY = 'gamesCache';
    const CACHE_TIME = 10 * 60 * 1000; // 10 minutes

    listEl.innerHTML = '<p class="loading">Loading your awesome games...</p>';

    // Load from cache
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        const { games, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TIME) {
            allGames = games;
            render(allGames);
        }
    }

    try {
        const resp = await fetch('https://api.github.com/repos/charliedayfockens-hue/coolsciencegames/git/trees/main?recursive=1', {
            headers: { 'User-Agent': 'CoolScienceGames-Site' }
        });
        if (!resp.ok) throw new Error('API error');

        const data = await resp.json();

        const htmlPaths = data.tree.filter(item =>
            item.type === 'blob' &&
            item.path.startsWith('assets/') &&
            item.path.toLowerCase().endsWith('.html')
        );

        allGames = htmlPaths.map(item => {
            const fullPath = item.path;
            const fileName = fullPath.split('/').pop();
            const baseName = fileName.replace(/\.html?$/i, '');

            const cleanName = baseName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

            const possibleImages = [`assets/Images/${baseName}.jpg`, `assets/Images/${baseName}.png`];
            const imagePath = possibleImages.find(img => data.tree.some(t => t.path === img));

            const descPath = `assets/Descriptions/${baseName}.txt`;
            const descUrl = data.tree.some(t => t.path === descPath) ? `${baseUrl}${descPath}` : null;

            return {
                name: cleanName,
                url: `${baseUrl}${fullPath}`,
                lowerName: cleanName.toLowerCase(),
                image: imagePath ? `${baseUrl}${imagePath}` : null,
                descriptionUrl: descUrl,
                description: ''
            };
        });

        allGames.sort((a, b) => a.name.localeCompare(b.name));

        localStorage.setItem(CACHE_KEY, JSON.stringify({ games: allGames, timestamp: Date.now() }));

        // Load descriptions
        for (const game of allGames) {
            if (game.descriptionUrl) {
                try {
                    const dResp = await fetch(game.descriptionUrl);
                    if (dResp.ok) game.description = (await dResp.text()).trim().replace(/\n/g, ' ');
                } catch {}
            }
        }

        render(allGames);

    } catch (error) {
        console.warn('Load failed:', error);
        if (allGames.length === 0) {
            listEl.innerHTML = '<p class="loading">Try again later.</p>';
        }
    }

    function render(games) {
        listEl.innerHTML = '';
        counterEl.textContent = `${games.length} Game${games.length === 1 ? '' : 's'} Available`;

        if (games.length === 0) {
            listEl.innerHTML = '<p class="loading">No games found.</p>';
            return;
        }

        const frag = document.createDocumentFragment();

        // Load favorites from localStorage
        const favorites = JSON.parse(localStorage.getItem('gameFavorites') || '[]');

        games.forEach(g => {
            const card = document.createElement('div');
            card.className = 'game-card';
            card.style.position = 'relative'; // for heart positioning

            if (g.image) {
                const img = document.createElement('img');
                img.src = g.image;
                img.alt = g.name;
                img.loading = 'lazy';
                card.appendChild(img);
            }

            // Favorites Heart
            const favBtn = document.createElement('button');
            favBtn.className = 'favorite-btn';
            favBtn.innerHTML = favorites.includes(g.url) ? '❤️' : '♡';
            favBtn.title = 'Toggle favorite';

            favBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                let favs = JSON.parse(localStorage.getItem('gameFavorites') || '[]');
                if (favs.includes(g.url)) {
                    favs = favs.filter(u => u !== g.url);
                    favBtn.innerHTML = '♡';
                } else {
                    favs.push(g.url);
                    favBtn.innerHTML = '❤️';
                }
                localStorage.setItem('gameFavorites', JSON.stringify(favs));
            });

            card.appendChild(favBtn);

            const bottom = document.createElement('div');
            bottom.className = 'card-bottom';

            const title = document.createElement('div');
            title.className = 'game-title';
            title.textContent = g.name;
            bottom.appendChild(title);

            if (g.description) {
                const desc = document.createElement('p');
                desc.className = 'game-desc';
                desc.textContent = g.description;
                bottom.appendChild(desc);
            }

            const a = document.createElement('a');
            a.href = g.url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.appendChild(bottom);
            card.appendChild(a);

            frag.appendChild(card);
        });

        listEl.appendChild(frag);
    }

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        const filtered = query ? allGames.filter(g => g.lowerName.includes(query) || (g.description && g.description.toLowerCase().includes(query))) : allGames;
        render(filtered);
    });
});
