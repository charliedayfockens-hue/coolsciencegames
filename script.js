// Game data
let allGames = [];
let currentGame = null;
let showingFavorites = false;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadGames();
    setupThemes();
    setupSidebar();
    setupFavorites();
    setupEject();
    setupSearch();
});

// ===== LOAD GAMES =====
async function loadGames() {
    const grid = document.getElementById('gamesGrid');
    grid.innerHTML = '<div style="color:white;text-align:center;padding:40px;">Loading games...</div>';
    
    const games = [];
    
    // Try GitHub API
    try {
        const path = window.location.pathname.split('/').filter(p => p);
        if (window.location.hostname.includes('github.io') && path.length >= 1) {
            const username = window.location.hostname.split('.')[0];
            const repo = path[0];
            const apiUrl = `https://api.github.com/repos/${username}/${repo}/contents/assets`;
            
            const response = await fetch(apiUrl);
            if (response.ok) {
                const files = await response.json();
                files.forEach(file => {
                    if (file.name.endsWith('.html')) {
                        games.push({
                            filename: file.name,
                            displayName: formatName(file.name)
                        });
                    }
                });
            }
        }
    } catch (e) {
        console.log('GitHub API failed:', e);
    }
    
    // Fallback: try common names
    if (games.length === 0) {
        const testNames = ['test.html', 'game1.html', 'game2.html', 'Physics_Simulator.html', 'Math_Challenge.html'];
        for (const name of testNames) {
            try {
                const response = await fetch(`assets/${name}`, { method: 'HEAD' });
                if (response.ok) {
                    games.push({ filename: name, displayName: formatName(name) });
                }
            } catch (e) {}
        }
    }
    
    allGames = games;
    displayGames(games);
}

function formatName(filename) {
    return filename
        .replace('.html', '')
        .replace(/[_-]/g, ' ')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
}

function displayGames(games) {
    const grid = document.getElementById('gamesGrid');
    const noResults = document.getElementById('noResults');
    
    document.getElementById('gameCounter').textContent = `${games.length} Game${games.length !== 1 ? 's' : ''} Available`;
    
    if (games.length === 0) {
        grid.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';
    grid.innerHTML = '';
    
    games.forEach(game => {
        const btn = document.createElement('button');
        btn.className = 'game-button';
        btn.textContent = game.displayName;
        
        if (isFavorited(game.filename)) {
            btn.textContent = '⭐ ' + game.displayName;
        }
        
        btn.onclick = () => openSidebar(game);
        grid.appendChild(btn);
    });
}

// ===== SIDEBAR =====
function setupSidebar() {
    document.getElementById('closeSidebar').onclick = closeSidebar;
    document.getElementById('playBtn').onclick = playGame;
    document.getElementById('favoriteBtn').onclick = toggleFavorite;
    document.getElementById('likeBtn').onclick = toggleLike;
    document.getElementById('dislikeBtn').onclick = toggleDislike;
}

function openSidebar(game) {
    currentGame = game;
    document.getElementById('sidebarTitle').textContent = game.displayName;
    
    const data = getData(game.filename);
    document.getElementById('playCount').textContent = data.plays;
    document.getElementById('likeCount').textContent = getLikes(game.filename);
    document.getElementById('dislikeCount').textContent = getDislikes(game.filename);
    
    updateButtons();
    document.getElementById('gameSidebar').classList.add('active');
}

function closeSidebar() {
    document.getElementById('gameSidebar').classList.remove('active');
}

function playGame() {
    if (!currentGame) return;
    
    const data = getData(currentGame.filename);
    data.plays++;
    saveData(currentGame.filename, data);
    
    window.open(`assets/${currentGame.filename}`, '_blank');
    document.getElementById('playCount').textContent = data.plays;
}

function toggleFavorite() {
    if (!currentGame) return;
    
    const data = getData(currentGame.filename);
    data.favorited = !data.favorited;
    saveData(currentGame.filename, data);
    
    updateButtons();
    displayGames(showingFavorites ? allGames.filter(g => isFavorited(g.filename)) : allGames);
}

function toggleLike() {
    if (!currentGame) return;
    
    const data = getData(currentGame.filename);
    
    if (data.liked) {
        data.liked = false;
        decrementLikes(currentGame.filename);
    } else {
        data.liked = true;
        incrementLikes(currentGame.filename);
        
        if (data.disliked) {
            data.disliked = false;
            decrementDislikes(currentGame.filename);
        }
    }
    
    saveData(currentGame.filename, data);
    updateButtons();
}

function toggleDislike() {
    if (!currentGame) return;
    
    const data = getData(currentGame.filename);
    
    if (data.disliked) {
        data.disliked = false;
        decrementDislikes(currentGame.filename);
    } else {
        data.disliked = true;
        incrementDislikes(currentGame.filename);
        
        if (data.liked) {
            data.liked = false;
            decrementLikes(currentGame.filename);
        }
    }
    
    saveData(currentGame.filename, data);
    updateButtons();
}

function updateButtons() {
    if (!currentGame) return;
    
    const data = getData(currentGame.filename);
    const favBtn = document.getElementById('favoriteBtn');
    const likeBtn = document.getElementById('likeBtn');
    const dislikeBtn = document.getElementById('dislikeBtn');
    
    favBtn.classList.toggle('active', data.favorited);
    likeBtn.classList.toggle('active', data.liked);
    dislikeBtn.classList.toggle('active', data.disliked);
    
    document.getElementById('likeCount').textContent = getLikes(currentGame.filename);
    document.getElementById('dislikeCount').textContent = getDislikes(currentGame.filename);
}

// ===== DATA STORAGE =====
function getData(filename) {
    const data = localStorage.getItem(`game_${filename}`);
    return data ? JSON.parse(data) : { plays: 0, liked: false, disliked: false, favorited: false };
}

function saveData(filename, data) {
    localStorage.setItem(`game_${filename}`, JSON.stringify(data));
}

function isFavorited(filename) {
    return getData(filename).favorited;
}

function getLikes(filename) {
    return parseInt(localStorage.getItem(`likes_${filename}`) || '0');
}

function getDislikes(filename) {
    return parseInt(localStorage.getItem(`dislikes_${filename}`) || '0');
}

function incrementLikes(filename) {
    localStorage.setItem(`likes_${filename}`, (getLikes(filename) + 1).toString());
}

function decrementLikes(filename) {
    const current = getLikes(filename);
    if (current > 0) localStorage.setItem(`likes_${filename}`, (current - 1).toString());
}

function incrementDislikes(filename) {
    localStorage.setItem(`dislikes_${filename}`, (getDislikes(filename) + 1).toString());
}

function decrementDislikes(filename) {
    const current = getDislikes(filename);
    if (current > 0) localStorage.setItem(`dislikes_${filename}`, (current - 1).toString());
}

// ===== FAVORITES =====
function setupFavorites() {
    document.getElementById('favoritesToggle').onclick = () => {
        showingFavorites = !showingFavorites;
        const btn = document.getElementById('favoritesToggle');
        
        if (showingFavorites) {
            btn.textContent = '🎮 All Games';
            displayGames(allGames.filter(g => isFavorited(g.filename)));
        } else {
            btn.textContent = '⭐ Favorites';
            displayGames(allGames);
        }
    };
}

// ===== THEMES =====
function setupThemes() {
    const toggle = document.getElementById('themeToggle');
    const dropdown = document.getElementById('themeDropdown');
    const buttons = document.querySelectorAll('.theme-btn');
    
    toggle.onclick = (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
    };
    
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== toggle) {
            dropdown.classList.remove('active');
        }
    });
    
    buttons.forEach(btn => {
        btn.onclick = () => {
            const theme = btn.dataset.theme;
            applyTheme(theme);
            
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.getElementById('customPanel').style.display = theme === 'custom' ? 'block' : 'none';
        };
    });
    
    document.getElementById('bgColor').oninput = applyCustomTheme;
    document.getElementById('bgShade').oninput = applyCustomTheme;
    document.getElementById('fontPicker').onchange = applyCustomTheme;
    
    // Load saved theme
    const saved = localStorage.getItem('theme') || 'default';
    applyTheme(saved);
    buttons.forEach(b => {
        if (b.dataset.theme === saved) b.classList.add('active');
    });
}

function applyTheme(theme) {
    document.body.className = theme === 'default' ? '' : `theme-${theme}`;
    localStorage.setItem('theme', theme);
    
    if (theme === 'custom') {
        applyCustomTheme();
    }
}

function applyCustomTheme() {
    const bg = document.getElementById('bgColor').value;
    const shade = document.getElementById('bgShade').value;
    const font = document.getElementById('fontPicker').value;
    
    document.body.style.setProperty('--custom-bg', `linear-gradient(135deg, ${bg} 0%, ${shade} 100%)`);
    document.body.style.setProperty('--custom-font', font);
    
    localStorage.setItem('customBg', bg);
    localStorage.setItem('customShade', shade);
    localStorage.setItem('customFont', font);
}

// ===== SEARCH =====
function setupSearch() {
    document.getElementById('searchBar').oninput = (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allGames.filter(g => 
            g.displayName.toLowerCase().includes(term) || 
            g.filename.toLowerCase().includes(term)
        );
        displayGames(filtered);
    };
}

// ===== EJECT =====
function setupEject() {
    document.getElementById('ejectButton').onclick = () => {
        window.close();
        if (!window.closed) window.location.href = 'about:blank';
    };
}
