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
            const cleanName = fileName.replace(/\.html?$/i, '')
                .replace(/[-_]/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase());

            const folderPath = fullPath.substring(0, fullPath.lastIndexOf('/'));

            const possibleImages = [
                `${folderPath}/thumbnail.jpg`,
                `${folderPath}/cover.jpg`,
                `${folderPath}/preview.png`,
                `${folderPath}/image.jpg`,
                `${folderPath}/thumb.jpg`,
                `${folderPath}/screenshot.jpg`
            ];

            const imagePath = possibleImages.find(img => data.tree.some(treeItem => treeItem.path === img));

            return {
                name: cleanName,
                url: `${baseUrl}${fullPath}`,
                lowerName: cleanName.toLowerCase(),
                image: imagePath ? `${baseUrl}${imagePath}` : null
            };
        });

        allGames.sort((a, b) => a.name.localeCompare(b.name));

    } catch (error) {
        console.error(error);
        listEl.innerHTML = '<p class="loading">Error loading games.</p>';
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

            // Image on top
            if (g.image) {
                const img = document.createElement('img');
                img.src = g.image;
                img.alt = g.name;
                img.loading = 'lazy';
                card.appendChild(img);
            }

            // Clickable title (whole bottom area)
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
        const filtered = query ? allGames.filter(g => g.lowerName.includes(query)) : allGames;
        render(filtered);
    });
});
