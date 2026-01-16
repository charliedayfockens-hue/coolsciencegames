// Game data
let allGames = [];
let currentGame = null;
let showingFavorites = false;

// CONFIGURATION: Set your database URL here
// You can use JSONBin.io (free) or any JSON hosting service
// Instructions: 
// 1. Go to https://jsonbin.io and create a free account
// 2. Create a new bin with this content: {"plays":{},"likes":{},"dislikes":{}}
// 3. Copy the bin URL and paste it below
// 4. Get your API key and paste it below
const DATABASE_URL = 'https://api.jsonbin.io/v3/b/6969ca90d0ea881f406f3ac9'; // Replace with your JSONBin.io URL
const API_KEY = '$2a$10$fB1aasZYO5d9CW3jC/xFZ.6DIKMFTfIY1FzgOXCrL11/xE6VmmF4C'; // Replace with your JSONBin.io API key
const USE_CLOUD_SYNC = true; // Set to true when you have a database URL

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    // Load cloud data first if enabled
    await loadCloudData();
    
    loadGames();
    setupThemes();
    setupSidebar();
    setupFavorites();
    setupCloaking();
    setupEject();
    setupSearch();
    setupClock();
    
    // Auto-refresh cloud data every 10 seconds if enabled
    if (USE_CLOUD_SYNC) {
        setInterval(async () => {
            await loadCloudData();
            updateLeaderboard();
            
            // Update sidebar if open
            if (currentGame) {
                document.getElementById('playCount').textContent = getGlobalPlays(currentGame.filename);
                document.getElementById('likeCount').textContent = getLikes(currentGame.filename);
                document.getElementById('dislikeCount').textContent = getDislikes(currentGame.filename);
            }
        }, 10000);
    }
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
    updateLeaderboard();
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
    
    // Show GLOBAL stats (visible to everyone)
    document.getElementById('playCount').textContent = getGlobalPlays(game.filename);
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
    
    // Increment GLOBAL play count (visible to everyone)
    incrementGlobalPlays(currentGame.filename);
    
    window.open(`assets/${currentGame.filename}`, '_blank');
    document.getElementById('playCount').textContent = getGlobalPlays(currentGame.filename);
    
    // Update leaderboard
    updateLeaderboard();
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
    
    const currentStatus = getUserLikeStatus(currentGame.filename);
    
    if (currentStatus === 'liked') {
        // Unlike
        decrementLikes(currentGame.filename);
        setUserLikeStatus(currentGame.filename, 'none');
    } else {
        // Like
        incrementLikes(currentGame.filename);
        setUserLikeStatus(currentGame.filename, 'liked');
        
        // Remove dislike if present
        if (currentStatus === 'disliked') {
            decrementDislikes(currentGame.filename);
        }
    }
    
    updateButtons();
}

function toggleDislike() {
    if (!currentGame) return;
    
    const currentStatus = getUserLikeStatus(currentGame.filename);
    
    if (currentStatus === 'disliked') {
        // Un-dislike
        decrementDislikes(currentGame.filename);
        setUserLikeStatus(currentGame.filename, 'none');
    } else {
        // Dislike
        incrementDislikes(currentGame.filename);
        setUserLikeStatus(currentGame.filename, 'disliked');
        
        // Remove like if present
        if (currentStatus === 'liked') {
            decrementLikes(currentGame.filename);
        }
    }
    
    updateButtons();
}

function updateButtons() {
    if (!currentGame) return;
    
    const userStatus = getUserLikeStatus(currentGame.filename);
    const favBtn = document.getElementById('favoriteBtn');
    const likeBtn = document.getElementById('likeBtn');
    const dislikeBtn = document.getElementById('dislikeBtn');
    
    // Favorite status (personal)
    favBtn.classList.toggle('active', getData(currentGame.filename).favorited);
    
    // Like/Dislike status (personal, but counts are global)
    likeBtn.classList.toggle('active', userStatus === 'liked');
    dislikeBtn.classList.toggle('active', userStatus === 'disliked');
    
    // Update counts (global - everyone sees the same numbers)
    document.getElementById('likeCount').textContent = getLikes(currentGame.filename);
    document.getElementById('dislikeCount').textContent = getDislikes(currentGame.filename);
}

// ===== CLOUD DATA STORAGE (SHARED ACROSS ALL COMPUTERS) =====

let cloudData = {
    plays: {},
    likes: {},
    dislikes: {}
};

// Load data from cloud
async function loadCloudData() {
    if (!USE_CLOUD_SYNC) return;
    
    try {
        const response = await fetch(DATABASE_URL, {
            headers: {
                'X-Master-Key': API_KEY
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            cloudData = data.record || data;
            console.log('✅ Cloud data loaded:', cloudData);
        }
    } catch (e) {
        console.log('⚠️ Could not load cloud data:', e);
    }
}

// Save data to cloud
async function saveCloudData() {
    if (!USE_CLOUD_SYNC) return;
    
    try {
        await fetch(DATABASE_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': API_KEY
            },
            body: JSON.stringify(cloudData)
        });
        console.log('✅ Cloud data saved');
    } catch (e) {
        console.log('⚠️ Could not save cloud data:', e);
    }
}

// ===== DATA STORAGE (HYBRID: LOCAL + CLOUD) =====

// Personal user data (favorites, personal settings - stays local)
function getData(filename) {
    const data = localStorage.getItem(`game_${filename}`);
    return data ? JSON.parse(data) : { favorited: false };
}

function saveData(filename, data) {
    localStorage.setItem(`game_${filename}`, JSON.stringify(data));
}

function isFavorited(filename) {
    return getData(filename).favorited;
}

// GLOBAL play counts - cloud if available, localStorage fallback
function getGlobalPlays(filename) {
    if (USE_CLOUD_SYNC) {
        return cloudData.plays[filename] || 0;
    }
    return parseInt(localStorage.getItem(`SHARED_plays_${filename}`) || '0');
}

function incrementGlobalPlays(filename) {
    if (USE_CLOUD_SYNC) {
        if (!cloudData.plays[filename]) cloudData.plays[filename] = 0;
        cloudData.plays[filename]++;
        saveCloudData();
    } else {
        const current = getGlobalPlays(filename);
        localStorage.setItem(`SHARED_plays_${filename}`, (current + 1).toString());
    }
}

// GLOBAL likes - cloud if available, localStorage fallback
function getLikes(filename) {
    if (USE_CLOUD_SYNC) {
        return cloudData.likes[filename] || 0;
    }
    return parseInt(localStorage.getItem(`SHARED_likes_${filename}`) || '0');
}

function incrementLikes(filename) {
    if (USE_CLOUD_SYNC) {
        if (!cloudData.likes[filename]) cloudData.likes[filename] = 0;
        cloudData.likes[filename]++;
        saveCloudData();
    } else {
        const current = getLikes(filename);
        localStorage.setItem(`SHARED_likes_${filename}`, (current + 1).toString());
    }
}

function decrementLikes(filename) {
    if (USE_CLOUD_SYNC) {
        if (cloudData.likes[filename] && cloudData.likes[filename] > 0) {
            cloudData.likes[filename]--;
            saveCloudData();
        }
    } else {
        const current = getLikes(filename);
        if (current > 0) {
            localStorage.setItem(`SHARED_likes_${filename}`, (current - 1).toString());
        }
    }
}

// GLOBAL dislikes - cloud if available, localStorage fallback
function getDislikes(filename) {
    if (USE_CLOUD_SYNC) {
        return cloudData.dislikes[filename] || 0;
    }
    return parseInt(localStorage.getItem(`SHARED_dislikes_${filename}`) || '0');
}

function incrementDislikes(filename) {
    if (USE_CLOUD_SYNC) {
        if (!cloudData.dislikes[filename]) cloudData.dislikes[filename] = 0;
        cloudData.dislikes[filename]++;
        saveCloudData();
    } else {
        const current = getDislikes(filename);
        localStorage.setItem(`SHARED_dislikes_${filename}`, (current + 1).toString());
    }
}

function decrementDislikes(filename) {
    if (USE_CLOUD_SYNC) {
        if (cloudData.dislikes[filename] && cloudData.dislikes[filename] > 0) {
            cloudData.dislikes[filename]--;
            saveCloudData();
        }
    } else {
        const current = getDislikes(filename);
        if (current > 0) {
            localStorage.setItem(`SHARED_dislikes_${filename}`, (current - 1).toString());
        }
    }
}

// User's personal like/dislike status  
function getUserLikeStatus(filename) {
    const status = localStorage.getItem(`user_like_${filename}`);
    return status || 'none'; // 'liked', 'disliked', or 'none'
}

function setUserLikeStatus(filename, status) {
    localStorage.setItem(`user_like_${filename}`, status);
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
    
    // Force font update on all elements
    setTimeout(() => {
        const allButtons = document.querySelectorAll('.game-button');
        allButtons.forEach(btn => {
            btn.style.fontFamily = 'inherit';
        });
    }, 100);
}

function applyCustomTheme() {
    const bg = document.getElementById('bgColor').value;
    const shade = document.getElementById('bgShade').value;
    const font = document.getElementById('fontPicker').value;
    
    document.body.style.setProperty('--custom-bg', `linear-gradient(135deg, ${bg} 0%, ${shade} 100%)`);
    document.body.style.setProperty('--custom-font', font);
    document.body.style.fontFamily = font;
    
    // Force font on all game buttons
    const allButtons = document.querySelectorAll('.game-button');
    allButtons.forEach(btn => {
        btn.style.fontFamily = font;
    });
    
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

// ===== LEADERBOARD =====
function updateLeaderboard() {
    // Get all games with their play counts from GLOBAL data
    const gamesWithPlays = allGames.map(game => ({
        name: game.displayName,
        filename: game.filename,
        plays: getGlobalPlays(game.filename)
    }));
    
    // Sort by plays (highest first)
    gamesWithPlays.sort((a, b) => b.plays - a.plays);
    
    // Get top 5
    const top5 = gamesWithPlays.slice(0, 5);
    
    // Display leaderboard
    const list = document.getElementById('leaderboardList');
    list.innerHTML = '';
    
    if (top5.every(g => g.plays === 0)) {
        list.innerHTML = '<div style="text-align:center;color:#999;font-size:0.9rem;padding:20px 0;">No games played yet!</div>';
        return;
    }
    
    top5.forEach((game, index) => {
        if (game.plays > 0) {
            const item = document.createElement('div');
            item.className = 'leaderboard-item';
            item.innerHTML = `
                <span class="rank">#${index + 1}</span>
                <span class="name">${game.name}</span>
                <span class="plays">${game.plays}</span>
            `;
            list.appendChild(item);
        }
    });
}

// ===== CLOAKING =====
const cloakData = {
    none: {
        title: 'Cool Science Games',
        favicon: ''
    },
    google: {
        title: 'Google',
        favicon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAD0ElEQVRYR8WWW0hUURSG/33OzIwzdTRFU7EQC0qLHrKHCCmjBxEVpYSghx6iS0+VET1ZQRQ9iBdEJSgqLyQhRdZDkRdMLCwqL1kW5iVTs9Sc0ZlzztnpjDijM56ZGXWgYc7M2Wt9/1p77bX/Av7zEv65fgDgP8cJAHh7e0dFRUVFhYaGhoWHh7PT09PZAQEBVq/Xa/H7/R6Px+N2u91Ot9vtcLlcdqvVanO5XLa2tjZbW1ubrbm52drY2GhtaGiw1tXVWevq6qy1tbXWmpoa6/379631 9fXW+vr6+tbW1vr6+vr6pqamepZlWSsrK+tra2trq6qqausqKytry8rKasu+lZWV1ebm5trU1NRaiouLa/Py8mov5ufn115MTU2tvZSQkFBbWFhYW1BQUJufn1+bn59fm5+fX5ufn1+bm5tbm5OTU5udnV2TlZVVk5mZWZOZmVlz/fr1mvT09Jq0tLSa1NTUmpSUlJorV67UXL58uTo5Obk6MTGxOiEhoTo+Pr46Li6uOjY2tjomJqY6Kiqq+uLFi9Xnzp2rPnv2bPWZM2eqT58+XX3y5Mnq48ePV588ebL65MmT1SdOnKg+fvx49bFjx6qPHj1affTo0eojR45UHz58uPrQoUPVBw8erD5w4ED1/v37qwMDA6v9/f2r/fz8qvfs2VO9e/fu6l27dlXv3Lmz2s/Pr3rbtm3VW7durQ4MDKzeunVr9ZYtW6o3b95cvWnTpmq/zeXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5f8DAwMDAwMDAwMDAwMDAwMDAwMDAwMDA'
    },
    youtube: {
        title: 'YouTube',
        favicon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAC8klEQVRYR+2XT2gTQRTGv5nNbnbTJGnapFKrKIh/wIMHFQQVD4KI4qHqQfBPK/bgRfFQEA9eFEEQBMWDHhQPHvTgxYMgCh5E8aDgQRGxoGKLtdraJE2z2c3uzIrJZpvdzW6TKngJhJCd2W++973fewuYZ6F5jh//BZCJRCJRSqmUZdnV8Xh8cTQaXRyJRCKRSCQSiUQikUgkEolEotFoNBqNRqPRaDQajUaj0Wg0Go1Go9FoNBqNRqPRaDQajUaj0Wg0Go1Go9FoNBqNRqPRaDQajUaj0Wg0Go1Go9FoNBqNRqPRaDQajUaj0Wg0Go1Go9FoNBqNRqPRaDQajUaj0Wg0Go1Go9FoNBqNRqPRaDQajUaj0Wg0Go1Go9FoNBqNRqPRaDQajUaj0Wg0Go1Go9FoNBqNRqPRaDQajUaj0Wg0Go1Go9FoNBqNRqPRaDQajUaj0Wg0Go1Go9FoNBqNRqPRaDQajUaj0Wg0Go1Go9FoNBqNRqPRaDQajUaj0Wg0Go1Go9FoNBqNRqPRaDT+1wDWAsBaAFgLAGsBYC0ArAWAtQCwFgDWAsBaAFgLAGsBYC0ArAWAtQCwFgDWAsBaAFgLAGsBYC0ArAWAtQCwFgDWAsBaAFgLAGsBYC0ArAWAtQCwFgDWAsBaAFgLAGsBYC0ArAWAtQCwFgDWAsBaAFgLAGsBYC0ArAWAtQCwFgDWAsBaAFgLAGsBYC0ArAWAtQCwFgDWAsBaAFgLAGsBYC0ArAWAtQCwFgDWAsBaAFgLAGsBYC0ArAWAtQCwFgDWAsBaAFgLAGsBYC0ArAWAtQCwFgDWAsBaAFgLAGsBYC0ArAWAtQCwFgDWAsBaAFgLAGsBYC0ArAWAtQCwFgDWAsBaAFgLAGsBYC0ArAWAtQCwFgDWAsBaAFgLAGsBYC0ArAWAtQCwFgDWAsBaAFgLAGsBYC0ArAWAtQCwFgDWAsBaAFgLAGsBYC0ArAWAtQCwFgDWAsBaAFgLAGsBYC0ArAWAtQCwFgDWAsBaAFgLAGsBYC0ArAWAtQCwFgDWAsBaAFgLAGsBYC0ArAWAtQCwFgDWAsBaAFgLAGsBYC0ArAWAtQCwFgDWAsBaAFgL'
    },
    classroom: {
        title: 'Home - Google Classroom',
        favicon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAD3klEQVRYR8VXW2wUVRj+zp'
    },
    zoom: {
        title: 'Zoom Meeting',
        favicon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAADLElEQVRYR8WXTWgUQRDHq3p'
    },
    schoology: {
        title: 'Home | Schoology',
        favicon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAADVElEQVRYR8WXS2xTVxiAv3'
    }
};

function setupCloaking() {
    const toggle = document.getElementById('cloakToggle');
    const dropdown = document.getElementById('cloakDropdown');
    const buttons = document.querySelectorAll('.cloak-btn');
    
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
            const cloak = btn.dataset.cloak;
            applyCloak(cloak);
            
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            toggle.classList.toggle('active', cloak !== 'none');
        };
    });
    
    // Load saved cloak
    const saved = localStorage.getItem('cloak') || 'none';
    applyCloak(saved);
    buttons.forEach(b => {
        if (b.dataset.cloak === saved) b.classList.add('active');
    });
    if (saved !== 'none') toggle.classList.add('active');
}

function applyCloak(cloak) {
    const data = cloakData[cloak];
    
    // Change title
    document.title = data.title;
    
    // Change favicon
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
    }
    link.href = data.favicon || '';
    
    localStorage.setItem('cloak', cloak);
}

// ===== EJECT =====
function setupEject() {
    document.getElementById('ejectButton').onclick = () => {
        window.close();
        if (!window.closed) window.location.href = 'about:blank';
    };
}

// ===== CLOCK =====
function setupClock() {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    function updateClock() {
        const now = new Date();
        
        // Time
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        document.getElementById('clock').textContent = `${hours}:${minutes}:${seconds}`;
        
        // Date
        const dayName = days[now.getDay()];
        const monthName = months[now.getMonth()];
        const date = now.getDate();
        const year = now.getFullYear();
        document.getElementById('date').textContent = `${dayName}, ${monthName} ${date}, ${year}`;
    }
    
    // Update immediately
    updateClock();
    
    // Update every second
    setInterval(updateClock, 1000);
}
