document.addEventListener('DOMContentLoaded', async () => {
    const listEl = document.getElementById('game-list');
    const searchInput = document.getElementById('search-bar');
    const counterEl = document.getElementById('game-counter');

    const isGitHubPages = location.hostname.includes('github.io');
    const basePath = isGitHubPages ? '/coolsciencegames/' : '/';
    const baseUrl = location.origin + basePath;

    let allGames = [];
    let categories = {};

    listEl.innerHTML = '<p class="loading">Loading your awesome games...</p>';

    try {
        const resp = await fetch('https://api.github.com/repos/charliedayfockens-hue/coolsciencegames/git/trees/main?recursive=1', {
            headers: { 'User-Agent': 'CoolScienceGames-Site' }
        });
        if (!resp.ok) throw new Error('API error');

        const data = await resp.json();

        // Get games
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
                file: fileName,
                url: `${baseUrl}${fullPath}`,
                lowerName: cleanName.toLowerCase(),
                image: imagePath ? `${baseUrl}${imagePath}` : null,
                descriptionUrl: descUrl
            };
        });

        allGames.sort((a, b) => a.name.localeCompare(b.name));

        // Get categories
        const catFiles = data.tree.filter(item => item.path.startsWith('assets/Categories/') && item.path.endsWith('.txt'));
        for (const catItem of catFiles) {
            const catName = catItem.path.split('/').pop().replace('.txt', '');
            const catUrl = `${baseUrl}${catItem.path}`;
            const catResp = await fetch(catUrl);
            if (catResp.ok) {
                const text = await catResp.text();
                const gameFiles = text.split('\n').map(l => l.trim()).filter(l => l);
                categories[catName] = allGames.filter(g => gameFiles.includes(g.file));
            }
        }

    } catch (error) {
        console.error(error);
        listEl.innerHTML = '<p class="loading">Error loading — try refresh later.</p>';
        return;
    }

    // Fetch descriptions
    for (const game of allGames) {
        if (game.descriptionUrl) {
            try {
                const resp = await fetch(game.descriptionUrl);
                if (resp.ok) game.description = (await resp.text()).trim().replace(/\n/g, ' ');
            } catch {}
        }
    }

    const render = (gamesByCat) => {
        listEl.innerHTML = '';
        let total = 0;

        if (Object.keys(gamesByCat).length === 0) {
            listEl.innerHTML = '<p class="loading">No categories yet — add files to assets/Categories/</p>';
            return;
        }

        const frag = document.createDocumentFragment();

        Object.keys(gamesByCat).sort().forEach(cat => {
            const games = gamesByCat[cat];
            if (games.length === 0) return;
            total += games.length;

            // Category heading
            const heading = document.createElement('h2');
            heading.textContent = `${cat} Games (${games.length})`;
            heading.style.gridColumn = '1 / -1';
            heading.style.textAlign = 'center';
            heading.style.margin = '40px 0 20px';
            heading.style.fontSize = '2rem';
            heading.style.color = '#4fc3f7';
            frag.appendChild(heading);

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
        });

        counterEl.textContent = `${total} Game${total === 1 ? '' : 's'} Available`;
        listEl.appendChild(frag);
    };

    // Show categorized games
    render(categories);

    // Search across all games
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        if (!query) {
            render(categories);
            return;
        }

        const filteredCats = {};
        Object.keys(categories).forEach(cat => {
            const filtered = categories[cat].filter(g => 
                g.lowerName.includes(query) || (g.description && g.description.toLowerCase().includes(query))
            );
            if (filtered.length > 0) filteredCats[cat] = filtered;
        });
        render(filteredCats || {});
    });
});
/* Random Game Button - Top Right Floating */
#random-game-btn {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    background: linear-gradient(135deg, #4fc3f7, #9575cd);
    color: white;
    border: none;
    padding: 14px 24px;
    font-size: 1.1rem;
    font-weight: bold;
    border-radius: 50px;
    box-shadow: 0 8px 20px rgba(79, 195, 247, 0.4);
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 10px;
}

#random-game-btn:hover {
    transform: translateY(-4px) scale(1.05);
    box-shadow: 0 12px 30px rgba(149, 117, 205, 0.6);
    background: linear-gradient(135deg, #9575cd, #4fc3f7);
}

#random-game-btn::before {
    content: "🎲";
    font-size: 1.4rem;
}

#random-game-btn span {
    display: block;
}

@media (max-width: 600px) {
    #random-game-btn {
        padding: 12px 20px;
        font-size: 1rem;
        top: 15px;
        right: 15px;
    }
}
