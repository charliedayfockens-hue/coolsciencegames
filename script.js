document.addEventListener('DOMContentLoaded', async () => {
    const listEl = document.getElementById('game-list');
    const searchInput = document.getElementById('search-bar');
    const counterEl = document.getElementById('game-counter');

    // Fix base URL for GitHub Pages vs local testing
    const isGitHubPages = location.hostname.includes('github.io');
    const basePath = isGitHubPages ? '/coolsciencegames/' : '/';
    const baseUrl = location.origin + basePath;

    let allGames = [];

    // Show loading message
    listEl.innerHTML = '<p class="loading">Loading your awesome games...</p>';

    try {
        // One single API call to get EVERY file in the repo
        const resp = await fetch('https://api.github.com/repos/charliedayfockens-hue/coolsciencegames/git/trees/main?recursive=1', {
            headers: { 'User-Agent': 'CoolScienceGames-Site' }
        });

        if (!resp.ok) {
            throw new Error(`API error: ${resp.status} ${resp.statusText}`);
        }

        const data = await resp.json();

        // Filter for .html files inside assets/ (handles subfolders too)
        const htmlPaths = data.tree.filter(item =>
            item.type === 'blob' &&
            item.path.startsWith('assets/') &&
            item.path.toLowerCase().endsWith('.html')
        );

        allGames = htmlPaths.map(item => {
            const fullPath = item.path; // e.g., "assets/Tunnel Rush.html" or "assets/poly track/game.html"
            const fileName = fullPath.split('/').pop();
            const cleanName = fileName.replace(/\.html?$/i, '')
                .replace(/[-_]/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase()); // Nice title: "Tunnel Rush"

            return {
                name: cleanName,
                url: `${baseUrl}${fullPath}`,
                lowerName: cleanName.toLowerCase()
            };
        });

        // Sort alphabetically
        allGames.sort((a, b) => a.name.localeCompare(b.name));

        if (allGames.length === 0) {
            throw new Error('No games detected');
        }

    } catch (error) {
        console.error(error);
        listEl.innerHTML = `<p class="loading">Error loading games: Could not connect to GitHub.<br>Try refreshing or check later.</p>`;
        counterEl.textContent = '0 Games';
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

        // Image on top (if it exists)
        if (g.image) {
            const img = document.createElement('img');
            img.src = g.image;
            img.alt = g.name;
            img.loading = 'lazy';
            card.appendChild(img);
        }

        // Clickable title area (opens game in new tab)
        const a = document.createElement('a');
        a.href = g.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = g.name;
        a.className = 'game-title-link';  // we'll style this nicely
        card.appendChild(a);

        frag.appendChild(card);
    });

    listEl.appendChild(frag);
};
        // Title (not clickable)
        const titleDiv = document.createElement('div');
        titleDiv.className = 'game-title';
        titleDiv.textContent = g.name;
        card.appendChild(titleDiv);

        // Play button (clickable, opens in new tab)
        const playLink = document.createElement('a');
        playLink.href = g.url;
        playLink.target = '_blank';
        playLink.rel = 'noopener noreferrer';
        playLink.className = 'play-button';
        playLink.textContent = 'Play';
        card.appendChild(playLink);

        frag.appendChild(card);
    });

    listEl.appendChild(frag);
};
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

    // Initial render
    render(allGames);

    // Live search
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        const filtered = query ? allGames.filter(g => g.lowerName.includes(query)) : allGames;
        render(filtered);
    });
});


