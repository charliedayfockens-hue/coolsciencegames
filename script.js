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
            render(showingFavorites ? allGames.filter(g => favorites.includes(g.url)) : allGames);
        });
        document.body.appendChild(favoritesBtn);

        // === DARK/LIGHT MODE TOGGLE ===
        const themeToggleBtn = document.createElement('button');
        themeToggleBtn.id = 'theme-toggle-btn';
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.body.classList.add('light-mode');
            themeToggleBtn.textContent = '☀️';
        } else {
            themeToggleBtn.textContent = '🌙';
        }
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            if (document.body.classList.contains('light-mode')) {
                themeToggleBtn.textContent = '☀️';
                localStorage.setItem('theme', 'light');
            } else {
                themeToggleBtn.textContent = '🌙';
                localStorage.setItem('theme', 'dark');
            }
        });
        document.body.appendChild(themeToggleBtn);

    } catch (error) {
        listEl.innerHTML = '<p class="loading">Error loading games — try refresh later.</p>';
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

            // Favorite heart
            const heart = document.createElement('button');
            heart.className = 'favorite-btn';
            heart.innerHTML = favorites.includes(g.url) ? '❤️' : '♡';
            heart.addEventListener('click', (e) => {
                e.stopPropagation();
                let favs = JSON.parse(localStorage.getItem('gameFavorites') || '[]');
                if (favs.includes(g.url)) {
                    favs = favs.filter(u => u !== g.url);
                    heart.innerHTML = '♡';
                } else {
                    favs.push(g.url);
                    heart.innerHTML = '❤️';
                }
                localStorage.setItem('gameFavorites', JSON.stringify(favs));
            });
            card.appendChild(heart);

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

// === CREDITS MODAL ===
const creditsBtn = document.getElementById('credits-btn');
const creditsModal = document.getElementById('credits-modal');
const closeCredits = document.getElementById('close-credits');

if (creditsBtn && creditsModal && closeCredits) {
    creditsBtn.addEventListener('click', () => creditsModal.classList.add('show'));
    closeCredits.addEventListener('click', () => creditsModal.classList.remove('show'));
    creditsModal.addEventListener('click', (e) => {
        if (e.target === creditsModal) creditsModal.classList.remove('show');
    });
}

// === EJECT BUTTON ===
const ejectBtn = document.getElementById('eject-btn');
if (ejectBtn) {
    ejectBtn.addEventListener('click', () => {
        window.close();
        window.location.href = 'about:blank';
    });
}
// === SETTINGS MODAL ===
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettings = document.getElementById('close-settings');
const themeToggleModal = document.getElementById('theme-toggle-in-modal');

if (settingsBtn && settingsModal) {
    settingsBtn.addEventListener('click', () => settingsModal.classList.add('show'));

    closeSettings.addEventListener('click', () => settingsModal.classList.remove('show'));

    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) settingsModal.classList.remove('show');
    });

    // Theme toggle in settings
    themeToggleModal.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        if (document.body.classList.contains('light-mode')) {
            themeToggleModal.textContent = '☀️ Light Mode';
            localStorage.setItem('theme', 'light');
        } else {
            themeToggleModal.textContent = '🌙 Dark Mode';
            localStorage.setItem('theme', 'dark');
        }
    });

    // Tab cloaking in settings
    document.querySelectorAll('.cloak-option').forEach(btn => {
        btn.addEventListener('click', () => {
            const title = btn.dataset.title;
            const favicon = btn.dataset.favicon;
            document.title = title;
            let link = document.querySelector("link[rel*='icon']") || document.createElement('link');
            link.type = 'image/x-icon';
            link.rel = 'shortcut icon';
            link.href = favicon;
            document.head.appendChild(link);
        });
    });
}
// === DIGITAL CLOCK ===
const clockEl = document.getElementById('digital-clock');

function updateClock() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';

    // Convert to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    hours = hours.toString().padStart(2, '0');

    clockEl.textContent = `${hours}:${minutes}:${seconds} ${ampm}`;
}

// Only run if the clock element exists
if (clockEl) {
    updateClock(); // Show time immediately
    setInterval(updateClock, 1000); // Update every second
}
