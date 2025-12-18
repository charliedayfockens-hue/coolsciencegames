document.addEventListener('DOMContentLoaded', async () => {
    const listEl = document.getElementById('game-list');
    const searchInput = document.getElementById('search-bar');
    const counterEl = document.getElementById('game-counter');

    const isGitHubPages = location.hostname.includes('github.io');
    const basePath = isGitHubPages ? '/coolsciencegames/' : '/';
    const baseUrl = location.origin + basePath;

    let allGames = [];

    listEl.innerHTML = '<p class="loading">Loading your awesome games...</p>';

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

        // === RANDOM GAME BUTTON ===
        const randomBtn = document.createElement('button');
        randomBtn.id = 'random-game-btn';
        randomBtn.innerHTML = '<span>Random Game</span>';
        randomBtn.addEventListener('click', () => {
            const randomIndex = Math.floor(Math.random() * allGames.length);
            window.open(allGames[randomIndex].url, '_blank');
        });
        document.body.appendChild(randomBtn);

        // === MY FAVORITES BUTTON ===
        const favoritesBtn = document.createElement('button');
        favoritesBtn.id = 'favorites-btn';
        favoritesBtn.innerHTML = '<span>My Favorites</span>';
        let showingFavorites = false;
        favoritesBtn.addEventListener('click', () => {
            showingFavorites = !showingFavorites;
            favoritesBtn.classList.toggle('active', showingFavorites);
            favoritesBtn.querySelector('span').textContent = showingFavorites ? 'Show All Games' : 'My Favorites';
            const favorites = JSON.parse(localStorage.getItem('gameFavorites') || '[]');
            const filtered = showingFavorites ? allGames.filter(g => favorites.includes(g.url)) : allGames;
            render(filtered);
        });
        document.body.appendChild(favoritesBtn);

    } catch (error) {
        listEl.innerHTML = '<p class="loading">Error loading games — try refresh.</p>';
    }

    function render(games) {
        listEl.innerHTML = '';
        counterEl.textContent = `${games.length} Game${games.length === 1 ? '' : 's'} Available`;

        if (games.length === 0) {
            listEl.innerHTML = '<p class="loading">No games found.</p>';
            return;
        }

        const frag = document.createDocumentFragment();
        const favorites = JSON.parse(localStorage.getItem('gameFavorites') || '[]');

        games.forEach(g => {
            const card = document.createElement('div');
            card.className = 'game-card';
            card.style.position = 'relative';

            if (g.image) {
                const img = document.createElement('img');
                img.src = g.image;
                img.alt = g.name;
                img.loading = 'lazy';
                card.appendChild(img);
            }

            // Heart favorite
            const favBtn = document.createElement('button');
            favBtn.className = 'favorite-btn';
            favBtn.innerHTML = favorites.includes(g.url) ? '❤️' : '♡';
            favBtn.addEventListener('click', (e) => {
                e.stopPropagation();
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
// === CREDITS BUTTON ===
const creditsBtn = document.getElementById('credits-btn');
const creditsModal = document.getElementById('credits-modal');
const closeCredits = document.getElementById('close-credits');

creditsBtn.addEventListener('click', () => {
    creditsModal.classList.add('show');
});

closeCredits.addEventListener('click', () => {
    creditsModal.classList.remove('show');
});

// Close when clicking outside
creditsModal.addEventListener('click', (e) => {
    if (e.target === creditsModal) {
        creditsModal.classList.remove('show');
    }
});
// === EJECT BUTTON - Close tab ===
const ejectBtn = document.getElementById('eject-btn');

if (ejectBtn) {
    ejectBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to eject (close this tab)?')) {
            window.close();
            // Fallback if window.close() is blocked (e.g., not opened by script)
            // Opens a blank page as a "close" effect
            window.location.href = 'about:blank';
        }
    });
}
