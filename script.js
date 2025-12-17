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
            item.path.toLowerCase().endsWith('.html') &&
            !item.path.includes('/Images/') && !item.path.includes('/Descriptions/')
        );

        allGames = htmlPaths.map(item => {
            const fullPath = item.path; // e.g. "assets/Tunnel Rush.html"
            const fileName = fullPath.split('/').pop();
            const baseName = fileName.replace(/\.html?$/i, ''); // "Tunnel Rush"

            const cleanName = baseName
                .replace(/[-_]/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase()); 
            
const baseName = fileName.replace(/\.html?$/i, ''); // e.g. "12 Mini Battles"

const possibleImages = [
    `assets/Images/${baseName}.jpg`,
    `assets/Images/${baseName}.png`,
    `assets/Images/${baseName}.jpeg`,
    `assets/Images/${baseName}.webp`
];

const imagePath = possibleImages.find(img => data.tree.some(t => t.path === img));

image: imagePath ? `${baseUrl}${imagePath}` : null
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

    } catch (error) {
        console.error(error);
        listEl.innerHTML = '<p class="loading">Error loading games.</p>';
        counterEl.textContent = '0 Games';
        return;
    }

    // Fetch descriptions
    for (const game of allGames) {
        if (game.descriptionUrl) {
            try {
                const resp = await fetch(game.descriptionUrl);
                if (resp.ok) {
                    game.description = (await resp.text()).trim().replace(/\n/g, ' ');
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

