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
            let fileName = fullPath.split('/').pop();
            let folderPath = fullPath.substring(0, fullPath.lastIndexOf('/'));

            if (fileName === 'index.html') {
                fileName = folderPath.split('/').pop() + '.html';
            }

            const cleanName = fileName.replace(/\.html?$/i, '')
                .replace(/[-_]/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase());

            // Look for thumbnail
            const possibleThumbs = [
                `${folderPath}/thumbnail.jpg`,
                `${folderPath}/thumbnail.png`,
                `${folderPath}/cover.jpg`,
                `${folderPath}/preview.png`
            ];
            const thumbPath = possibleThumbs.find(thumb => data.tree.some(t => t.path === thumb));

            // Look for description.txt
            const descPath = `${folderPath}/description.txt`;
            const hasDesc = data.tree.some(t => t.path === descPath);
            const descUrl = hasDesc ? `${baseUrl}${descPath}` : null;

            return {
                name: cleanName,
                url: `${baseUrl}${fullPath}`,
                lowerName: cleanName.toLowerCase(),
                image: thumbPath ? `${baseUrl}${thumbPath}` : null,
                descriptionUrl: descUrl
            };
        });

        allGames.sort((a, b) => a.name.localeCompare(b.name));

    } catch (error) {
        console.error(error);
        listEl.innerHTML = '<p class="loading">Error loading games.</p>';
        counterEl.textContent = '0 Games';
        return;
    }

    // Fetch descriptions asynchronously
    for (const game of allGames) {
        if (game.descriptionUrl) {
            try {
                const descResp = await fetch(game.descriptionUrl);
                if (descResp.ok) {
                    game.description = await descResp.text();
                    game.description = game.description.trim().replace(/\n/g, ' '); // clean up
                }
            } catch (e) {
                game.description = '';
            }
        } else {
            game.description = '';
        }
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

            // Image
            if (g.image) {
                const img = document.createElement('img');
                img.src = g.image;
                img.alt = g.name;
                img.loading = 'lazy';
                card.appendChild(img);
            }

            // Bottom section with title + description
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

            // Clickable link over whole bottom
            const a = document.createElement('a');
            a.href = g.url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.appendChild(bottom);
            card.appendChild(a);

            frag.appendChild(card);
        });

        listEl.appendChild(frag);
    };

    render(allGames);

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        const filtered = query ? allGames.filter(g => 
            g.lowerName.includes(query) || (g.description && g.description.toLowerCase().includes(query))
        ) : allGames;
        render(filtered);
    });
});
