document.addEventListener('DOMContentLoaded', async () => {
    const listEl = document.getElementById('game-list');
    const searchInput = document.getElementById('search-bar');
    const counterEl = document.getElementById('game-counter');

    const isGitHubPages = location.hostname.includes('github.io');
    const basePath = isGitHubPages ? '/coolsciencegames/' : '/';
    const baseUrl = location.origin + basePath;

    let allGames = [];
    const CACHE_KEY = 'gamesCache';
    const CACHE_TIME = 10 * 60 * 1000; // 10 minutes in milliseconds

    listEl.innerHTML = '<p class="loading">Loading your awesome games...</p>';

    // Try to load from cache first
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        const { games, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TIME) {
            allGames = games;
            render(allGames);
        }
    }

    // Always try to refresh in background (won't block if rate limited)
    try {
        const resp = await fetch('https://api.github.com/repos/charliedayfockens-hue/coolsciencegames/git/trees/main?recursive=1', {
            headers: { 'User-Agent': 'CoolScienceGames-Site' }
        });

        if (!resp.ok) {
            if (resp.status === 403) {
                listEl.innerHTML = '<p class="loading">GitHub limit reached — using cached games (refresh in ~1 hour).</p>';
            }
            throw new Error('API error');
        }

        const data = await resp.json();

        const htmlPaths = data.tree.filter(item =>
            item.type === 'blob' &&
            item.path.startsWith('assets/') &&
            item.path.toLowerCase().endsWith('.html') &&
            !item.path.includes('/Images/') &&
            !item.path.includes('/Descriptions/')
        );

        allGames = htmlPaths.map(item => {
            const fullPath = item.path;
            const fileName = fullPath.split('/').pop();
            const baseName = fileName.replace(/\.html?$/i, '');

            const cleanName = baseName
                .replace(/[-_]/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase());

            // Image in assets/Images/
            const possibleImages = [
                `assets/Images/${baseName}.jpg`,
                `assets/Images/${baseName}.png`,
                `assets/Images/${baseName}.jpeg`
            ];
            const imagePath = possibleImages.find(img => data.tree.some(t => t.path === img));

            // Description in assets/Descriptions/
            const descPath = `assets/Descriptions/${baseName}.txt`;
            const hasDesc = data.tree.some(t => t.path === descPath);
            const descUrl = hasDesc ? `${baseUrl}${descPath}` : null;

            return {
                name: cleanName,
                url: `${baseUrl}${fullPath}`,
                lowerName: cleanName.toLowerCase(),
                image: imagePath ? `${baseUrl}${imagePath}` : null,
                descriptionUrl: descUrl
            };
        });

        allGames.sort((a, b) => a.name.localeCompare(b.name));

        // Save to cache
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            games: allGames,
            timestamp: Date.now()
        }));

    } catch (error) {
        console.warn('Could not refresh from GitHub:', error);
        if (allGames.length === 0) {
            listEl.innerHTML = '<p class="loading">No cached games — try again in 1 hour.</p>';
            counterEl.textContent = '0 Games';
            return;
        }
    }

    // Fetch descriptions
    for (const game of allGames) {
        if (game.descriptionUrl) {
            try {
                const resp = await fetch(game.descriptionUrl + '?t=' + Date.now()); // bypass cache
                if (resp.ok) {
                    game.description = (await resp.text()).trim().replace(/\n/g, ' ');
                }
            } catch (e) {}
        }
    }

    function render(games) {
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

            if (g.image) {
                const img = document.createElement('img');
                img.src = g.image;
                img.alt = g.name;
                img.loading = 'lazy';
                card.appendChild(img);
            }

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

    render(allGames);

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        const filtered = query ? allGames.filter(g => 
            g.lowerName.includes(query) || (g.description && g.description.toLowerCase().includes(query))
        ) : allGames;
        render(filtered);
    });
});
