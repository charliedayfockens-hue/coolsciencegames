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
        if (!resp.ok) throw new Error('GitHub API error');

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

            return {
                name: cleanName,
                url: `${baseUrl}${fullPath}`,
                lowerName: cleanName.toLowerCase(),
                image: imagePath ? `${baseUrl}${imagePath}` : null
            };
        });

        allGames.sort((a, b) => a.name.localeCompare(b.name));

        render(allGames);

        // ──────────────────────────────────────────────
        // RANDOM GAME BUTTON
        // ──────────────────────────────────────────────
        const randomBtn = document.createElement('button');
        randomBtn.id = 'random-game-btn';
        randomBtn.innerHTML = '<span>Random Game</span>';
        randomBtn.addEventListener('click', () => {
            const idx = Math.floor(Math.random() * allGames.length);
            window.open(allGames[idx].url, '_blank', 'noopener,noreferrer');
        });
        document.body.appendChild(randomBtn);

        // ──────────────────────────────────────────────
        // MY FAVORITES TOGGLE BUTTON
        // ──────────────────────────────────────────────
        const favoritesBtn = document.createElement('button');
        favoritesBtn.id = 'favorites-btn';
        favoritesBtn.innerHTML = '<span>My Favorites</span>';
        let showingFavorites = false;
        favoritesBtn.addEventListener('click', () => {
            showingFavorites = !showingFavorites;
            favoritesBtn.classList.toggle('active', showingFavorites);
            favoritesBtn.querySelector('span').textContent = showingFavorites ? 'Show All Games' : 'My Favorites';
            const favs = JSON.parse(localStorage.getItem('gameFavorites') || '[]');
            render(showingFavorites ? allGames.filter(g => favs.includes(g.url)) : allGames);
        });
        document.body.appendChild(favoritesBtn);

    } catch (err) {
        console.error(err);
        listEl.innerHTML = '<p class="loading">Failed to load games. Try refreshing the page.</p>';
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
        const ratingsKey = 'gameRatings';
        let ratings = JSON.parse(localStorage.getItem(ratingsKey) || '{}');

        games.forEach(g => {
            const card = document.createElement('div');
            card.className = 'game-card';
            card.style.position = 'relative';

            // Image
            if (g.image) {
                const img = document.createElement('img');
                img.src = g.image;
                img.alt = g.name;
                img.loading = 'lazy';
                card.appendChild(img);
            }

            // Favorite heart (top-right)
            const heart = document.createElement('button');
            heart.className = 'favorite-btn';
            heart.innerHTML = favorites.includes(g.url) ? '❤️' : '♡';
            heart.addEventListener('click', e => {
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

            // Like / Dislike container (bottom-right)
            const ratingDiv = document.createElement('div');
            ratingDiv.className = 'rating-container';

            const gameId = g.url;
            if (!ratings[gameId]) ratings[gameId] = { likes: 0, dislikes: 0, userVote: null };

            // Like
            const likeBtn = document.createElement('button');
            likeBtn.className = 'like-btn';
            likeBtn.innerHTML = '👍';
            const likeCount = document.createElement('span');
            likeCount.className = 'rating-count';
            likeCount.textContent = ratings[gameId].likes;

            likeBtn.addEventListener('click', e => {
                e.stopPropagation();
                const vote = ratings[gameId].userVote;

                if (vote === 'like') {
                    ratings[gameId].likes--;
                    ratings[gameId].userVote = null;
                } else {
                    if (vote === 'dislike') ratings[gameId].dislikes--;
                    ratings[gameId].likes++;
                    ratings[gameId].userVote = 'like';
                }

                likeCount.textContent = ratings[gameId].likes;
                dislikeCount.textContent = ratings[gameId].dislikes;
                localStorage.setItem(ratingsKey, JSON.stringify(ratings));
            });

            // Dislike
            const dislikeBtn = document.createElement('button');
            dislikeBtn.className = 'dislike-btn';
            dislikeBtn.innerHTML = '👎';
            const dislikeCount = document.createElement('span');
            dislikeCount.className = 'rating-count';
            dislikeCount.textContent = ratings[gameId].dislikes;

            dislikeBtn.addEventListener('click', e => {
                e.stopPropagation();
                const vote = ratings[gameId].userVote;

                if (vote === 'dislike') {
                    ratings[gameId].dislikes--;
                    ratings[gameId].userVote = null;
                } else {
                    if (vote === 'like') ratings[gameId].likes--;
                    ratings[gameId].dislikes++;
                    ratings[gameId].userVote = 'dislike';
                }

                likeCount.textContent = ratings[gameId].likes;
                dislikeCount.textContent = ratings[gameId].dislikes;
                localStorage.setItem(ratingsKey, JSON.stringify(ratings));
            });

            ratingDiv.append(likeBtn, likeCount, dislikeBtn, dislikeCount);
            card.appendChild(ratingDiv);

            // Bottom title + link
            const bottom = document.createElement('div');
            bottom.className = 'card-bottom';

            const title = document.createElement('div');
            title.className = 'game-title';
            title.textContent = g.name;
            bottom.appendChild(title);

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
        const filtered = query ? allGames.filter(g => g.lowerName.includes(query)) : allGames;
        render(filtered);
    });
});

// ──────────────────────────────────────────────
// CREDITS POPUP
// ──────────────────────────────────────────────
const creditsBtn = document.getElementById('credits-btn');
const creditsModal = document.getElementById('credits-modal');
const closeCredits = document.getElementById('close-credits');

if (creditsBtn && creditsModal && closeCredits) {
    creditsBtn.addEventListener('click', () => creditsModal.classList.add('show'));
    closeCredits.addEventListener('click', () => creditsModal.classList.remove('show'));
    creditsModal.addEventListener('click', e => {
        if (e.target === creditsModal) creditsModal.classList.remove('show');
    });
}

// ──────────────────────────────────────────────
// EJECT BUTTON (closes tab)
// ──────────────────────────────────────────────
const ejectBtn = document.getElementById('eject-btn');
if (ejectBtn) {
    ejectBtn.addEventListener('click', () => {
        window.close();
        window.location.href = 'about:blank'; // fallback
    });
}

// ──────────────────────────────────────────────
// TAB CLOAK DROPDOWN
// ──────────────────────────────────────────────
const cloakDropdown = document.getElementById('cloak-dropdown');

if (cloakDropdown) {
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

            alert(`Tab cloaked as ${title}!`);
        });
    });
}

// ──────────────────────────────────────────────
// THEME DROPDOWN
// ──────────────────────────────────────────────
const themeDropdown = document.getElementById('theme-dropdown');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeOptions = document.querySelectorAll('.theme-option');

const savedTheme = localStorage.getItem('theme') || 'dark';
document.body.className = `theme-${savedTheme}`;
updateButtonText(savedTheme);

function updateButtonText(theme) {
    const map = {
        dark: '🌙 Dark',
        light: '☀️ Light',
        neon: '⚡ Neon',
        ocean: '🌊 Ocean',
        galaxy: '🌌 Galaxy',
        gooner: '⚽ Gooner'
    };
    themeToggleBtn.innerHTML = map[theme] || '🌙 Dark';
}

themeOptions.forEach(option => {
    option.addEventListener('click', () => {
        const newTheme = option.dataset.theme;
        document.body.className = `theme-${newTheme}`;
        localStorage.setItem('theme', newTheme);
        updateButtonText(newTheme);
    });
});
