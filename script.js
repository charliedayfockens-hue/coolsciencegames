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
        // Track when a game is played
document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href*="assets/"]');
    if (link) {
        const gameUrl = link.href;
        let recent = JSON.parse(localStorage.getItem('recentlyPlayed') || '[]');
        
        // Remove if already exists (move to top)
        recent = recent.filter(url => url !== gameUrl);
        
        // Add to front
        recent.unshift(gameUrl);
        
        // Keep only last 5
        recent = recent.slice(0, 5);
        
        localStorage.setItem('recentlyPlayed', JSON.stringify(recent));
        
        // Refresh the recent section immediately
        showRecentlyPlayed();
    }
});

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

    } catch (error) {
        listEl.innerHTML = '<p class="loading">Error loading games — try refresh later.</p>';
    }

     function render(games) {
         showRecentlyPlayed();
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

        if (g.image) {
            const img = document.createElement('img');
            img.src = g.image;
            img.alt = g.name;
            img.loading = 'lazy';
            card.appendChild(img);
        }

        // Favorite heart (keep as is)
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

        // Like/Dislike container
        const ratingDiv = document.createElement('div');
        ratingDiv.className = 'rating-container';

        const gameId = g.url;
        if (!ratings[gameId]) ratings[gameId] = { likes: 0, dislikes: 0, userVote: null };

        // Like button
        const likeBtn = document.createElement('button');
        likeBtn.className = 'like-btn';
        likeBtn.innerHTML = '👍';
        const likeCount = document.createElement('span');
        likeCount.className = 'rating-count';
        likeCount.textContent = ratings[gameId].likes;

        likeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const currentVote = ratings[gameId].userVote;

            if (currentVote === 'like') {
                // Undo like
                ratings[gameId].likes--;
                ratings[gameId].userVote = null;
            } else {
                // Add like / switch from dislike
                if (currentVote === 'dislike') ratings[gameId].dislikes--;
                ratings[gameId].likes++;
                ratings[gameId].userVote = 'like';
            }

            likeCount.textContent = ratings[gameId].likes;
            dislikeCount.textContent = ratings[gameId].dislikes;
            localStorage.setItem(ratingsKey, JSON.stringify(ratings));
        });

        // Dislike button
        const dislikeBtn = document.createElement('button');
        dislikeBtn.className = 'dislike-btn';
        dislikeBtn.innerHTML = '👎';
        const dislikeCount = document.createElement('span');
        dislikeCount.className = 'rating-count';
        dislikeCount.textContent = ratings[gameId].dislikes;

        dislikeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const currentVote = ratings[gameId].userVote;

            if (currentVote === 'dislike') {
                // Undo dislike
                ratings[gameId].dislikes--;
                ratings[gameId].userVote = null;
            } else {
                // Add dislike / switch from like
                if (currentVote === 'like') ratings[gameId].likes--;
                ratings[gameId].dislikes++;
                ratings[gameId].userVote = 'dislike';
            }

            likeCount.textContent = ratings[gameId].likes;
            dislikeCount.textContent = ratings[gameId].dislikes;
            localStorage.setItem(ratingsKey, JSON.stringify(ratings));
        });

        ratingDiv.appendChild(likeBtn);
        ratingDiv.appendChild(likeCount);
        ratingDiv.appendChild(dislikeBtn);
        ratingDiv.appendChild(dislikeCount);
        card.appendChild(ratingDiv);

        // Bottom part (title + description)
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

// === CLOAK TAB DROPDOWN ===
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

// === REQUEST A GAME BUTTON ===
const requestBtn = document.getElementById('request-btn');
if (requestBtn) {
    requestBtn.addEventListener('click', () => {
        const requestUrl = 'https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform'; // CHANGE TO YOUR LINK
        window.open(requestUrl, '_blank');
    });
}
// === THEME DROPDOWN === 
const themeDropdown = document.getElementById('theme-dropdown'); 
const themeToggleBtn = document.getElementById('theme-toggle-btn'); 
const themeOptions = document.querySelectorAll('.theme-option'); 

  
const savedTheme = localStorage.getItem('theme') || 'dark'; 
document.body.className = `theme-${savedTheme}`; 
updateButtonText(savedTheme); 
function updateButtonText(theme) {
    switch (theme) {
        case 'dark': themeToggleBtn.innerHTML = '🌙 Dark'; break;
        case 'light': themeToggleBtn.innerHTML = '☀️ Light'; break;
        case 'neon': themeToggleBtn.innerHTML = '⚡ Neon'; break;
        case 'ocean': themeToggleBtn.innerHTML = '🌊 Ocean'; break;
        case 'galaxy': themeToggleBtn.innerHTML = '🌌 Galaxy'; break;
        case 'gooner': themeToggleBtn.innerHTML = '⚽ Gooner'; break;
        case 'candy': themeToggleBtn.innerHTML = '🍬 Candy'; break;
        case 'vaporwave': themeToggleBtn.innerHTML = '🌸 Vaporwave'; break;
    }
}
themeOptions.forEach(option => { 
    option.addEventListener('click', () => { 
        const newTheme = option.dataset.theme; 
        document.body.className = `theme-${newTheme}`; 
        localStorage.setItem('theme', newTheme); 
        updateButtonText(newTheme); 
    }); 
});         
// === SECRET RESET BUTTON FOR LIKES/DISLIKES (only you know about it) ===
const secretReset = document.getElementById('secret-reset');

if (secretReset) {
    secretReset.addEventListener('click', () => {
        // Double confirmation so you don't accidentally reset
        if (confirm("Reset ALL likes and dislikes for every game?") && confirm("Are you REALLY sure? This deletes everything forever!")) {
            localStorage.removeItem('gameRatings');
            alert("All like/dislike counters have been RESET to 0!");
            location.reload(); // refresh page to show zero counts immediately
        }
    });
}
// === RECENTLY PLAYED GAMES (last 5) ===
function addToRecentlyPlayed(gameUrl) {
    let recent = JSON.parse(localStorage.getItem('recentlyPlayed') || '[]');
    
    // Remove if already exists (move to top)
    recent = recent.filter(url => url !== gameUrl);
    
    // Add to front
    recent.unshift(gameUrl);
    
    // Keep only last 5
    recent = recent.slice(0, 5);
    
    localStorage.setItem('recentlyPlayed', JSON.stringify(recent));
}

// Update the "Play" links to track when clicked
document.addEventListener('click', (e) => {
    if (e.target.tagName === 'A' && e.target.href.includes('/assets/')) {
        addToRecentlyPlayed(e.target.href);
    }
});

// Show Recently Played section
function showRecentlyPlayed() {
    const recentContainer = document.getElementById('recent-games-list');
    if (!recentContainer) return;

    const recentUrls = JSON.parse(localStorage.getItem('recentlyPlayed') || '[]');
    const recentGames = allGames.filter(g => recentUrls.includes(g.url));

    recentContainer.innerHTML = '';

    if (recentGames.length === 0) {
        recentContainer.innerHTML = '<p style="text-align:center;color:#888;">No recent games yet. Play some!</p>';
        return;
    }

    recentGames.forEach(g => {
        const card = document.createElement('div');
        card.className = 'recent-card';

        if (g.image) {
            const img = document.createElement('img');
            img.src = g.image;
            img.alt = g.name;
            img.loading = 'lazy';
            card.appendChild(img);
        }

        const title = document.createElement('div');
        title.className = 'title';
        title.textContent = g.name;
        card.appendChild(title);

        const a = document.createElement('a');
        a.href = g.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.appendChild(card);
        recentContainer.appendChild(a);
    });
}

// Call it after games load (add this after render(allGames); in your main code)
showRecentlyPlayed();

// Also call it after search/filter to keep it updated
searchInput.addEventListener('input', () => {
    // ... your existing search code ...
    showRecentlyPlayed();
});

