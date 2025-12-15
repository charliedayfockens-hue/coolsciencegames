document.addEventListener('DOMContentLoaded', async () => {
    const listEl = document.getElementById('game-list');
    const searchInput = document.getElementById('search-bar');
    const counterEl = document.getElementById('game-counter');

    // Correct base URL for GitHub Pages vs local
    const isGitHubPages = location.hostname.includes('github.io');
    const basePath = isGitHubPages ? '/coolsciencegames/' : '/';
    const baseUrl = location.origin + basePath;

    let allGames = [];

    // Better loading state
    listEl.innerHTML = '<p class="loading">Loading your awesome science games...</p>';

    try {
        // Single API call to get the entire repo tree (recursive)
        const resp = await fetch('https://api.github.com/repos/charliedayfockens-hue/coolsciencegames/git/trees/main?recursive=1', {
            headers: { 'User-Agent': 'CoolScienceGames' }
        });

        if (!resp.ok) throw new Error('API failed');

        const data = await resp.json();

        if (data.truncated) {
            throw new Error('Tree too large – contact owner');
        }

        // Filter only .html files inside assets/
        const htmlFiles = data.tree
            .filter(item => item.path.startsWith('assets/') &&
                            item.type === 'blob' &&
                            item.path.toLowerCase().endsWith('.html'))
            .map(item => {
                const fileName = item.path.split('/').pop(); // e.g., "Slope.html"
                const gameName = fileName.replace(/\.html?$/i, '') // Remove .html
                    .replace(/[-_]/g, ' ') // Nice spacing
                    .replace(/\b\w/g, c => c.toUpperCase()); // Capitalize words

                return {
                    name: gameName,
                    file: fileName,
                    url: `${baseUrl}${item.path}`,
                    lowerName: gameName.toLowerCase()
                };
            });

        // Sort alphabetically
        allGames = htmlFiles.sort((a, b) => a.name.localeCompare(b.name));

        if (allGames.length === 0) {
            throw new Error('No games found');
        }

    } catch (e) {
        console.error(e);
        listEl.innerHTML = `<p class="loading">Error loading games: ${e.message || 'Check connection or try later.'}</p>`;
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

            // Optional: Add preview image later (e.g., if you upload "Slope-preview.png")
            // if (g.preview) { ... }

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

    // Live search
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        const filtered = query ? allGames.filter(g => g.lowerName.includes(query)) : allGames;
        render(filtered);
    });
});
