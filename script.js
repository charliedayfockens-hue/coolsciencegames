// Game data
let allGames = [];
let currentGame = null;
let showingFavorites = false;

// User system
let currentUser = null;
let isGuest = false;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
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
    
    // Guest users can play but data doesn't save
    if (isGuest) {
        window.open(`assets/${currentGame.filename}`, '_blank');
        return;
    }
    
    // Increment GLOBAL play count (visible to everyone)
    incrementGlobalPlays(currentGame.filename);
    
    // Update user status
    updateUserStatus('Online', currentGame.displayName);
    
    window.open(`assets/${currentGame.filename}`, '_blank');
    document.getElementById('playCount').textContent = getGlobalPlays(currentGame.filename);
    
    // Update leaderboard
    updateLeaderboard();
    
    // Reset status after 5 seconds
    setTimeout(() => {
        updateUserStatus('Online', null);
    }, 5000);
}

function toggleFavorite() {
    if (!currentGame) return;
    
    if (isGuest) {
        alert('Please login or register to save favorites!');
        return;
    }
    
    const data = getData(currentGame.filename);
    data.favorited = !data.favorited;
    saveData(currentGame.filename, data);
    
    updateButtons();
    displayGames(showingFavorites ? allGames.filter(g => isFavorited(g.filename)) : allGames);
}

function toggleLike() {
    if (!currentGame) return;
    
    if (isGuest) {
        alert('Please login or register to like games!');
        return;
    }
    
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
    
    if (isGuest) {
        alert('Please login or register to dislike games!');
        return;
    }
    
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

// ===== DATA STORAGE (SIMPLE localStorage - WORKS PERFECTLY) =====

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

// Global play counts
function getGlobalPlays(filename) {
    return parseInt(localStorage.getItem(`plays_${filename}`) || '0');
}

function incrementGlobalPlays(filename) {
    const current = getGlobalPlays(filename);
    localStorage.setItem(`plays_${filename}`, (current + 1).toString());
}

// Global likes
function getLikes(filename) {
    return parseInt(localStorage.getItem(`likes_${filename}`) || '0');
}

function incrementLikes(filename) {
    const current = getLikes(filename);
    localStorage.setItem(`likes_${filename}`, (current + 1).toString());
}

function decrementLikes(filename) {
    const current = getLikes(filename);
    if (current > 0) {
        localStorage.setItem(`likes_${filename}`, (current - 1).toString());
    }
}

// Global dislikes
function getDislikes(filename) {
    return parseInt(localStorage.getItem(`dislikes_${filename}`) || '0');
}

function incrementDislikes(filename) {
    const current = getDislikes(filename);
    localStorage.setItem(`dislikes_${filename}`, (current + 1).toString());
}

function decrementDislikes(filename) {
    const current = getDislikes(filename);
    if (current > 0) {
        localStorage.setItem(`dislikes_${filename}`, (current - 1).toString());
    }
}

// User's personal like/dislike status
function getUserLikeStatus(filename) {
    const status = localStorage.getItem(`user_like_${filename}`);
    return status || 'none';
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
    
    // Get top 20
    const top20 = gamesWithPlays.slice(0, 20);
    
    // Display leaderboard
    const list = document.getElementById('leaderboardList');
    list.innerHTML = '';
    
    if (top20.every(g => g.plays === 0)) {
        list.innerHTML = '<div style="text-align:center;color:#999;font-size:0.9rem;padding:20px 0;">No games played yet!</div>';
        return;
    }
    
    top20.forEach((game, index) => {
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

// ===== USER AUTHENTICATION SYSTEM =====

function checkAuth() {
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedUser) {
        currentUser = savedUser;
        isGuest = false;
        hideAuthModal();
        showUserBar();
        initializeApp();
    } else {
        showAuthModal();
    }
}

function showAuthModal() {
    document.getElementById('authModal').style.display = 'flex';
    setupAuthListeners();
}

function hideAuthModal() {
    document.getElementById('authModal').style.display = 'none';
}

function setupAuthListeners() {
    document.getElementById('showRegister').onclick = () => {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
    };
    
    document.getElementById('showLogin').onclick = () => {
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
    };
    
    document.getElementById('loginBtn').onclick = handleLogin;
    document.getElementById('registerBtn').onclick = handleRegister;
    document.getElementById('playAsGuest').onclick = handleGuest;
}

function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!username || !password) {
        alert('Please enter both username and password');
        return;
    }
    
    const users = JSON.parse(localStorage.getItem('globalUsers') || '{}');
    
    if (users[username] && users[username].password === password) {
        currentUser = username;
        isGuest = false;
        localStorage.setItem('currentUser', username);
        hideAuthModal();
        showUserBar();
        initializeApp();
    } else {
        alert('Invalid username or password');
    }
}

function handleRegister() {
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('registerConfirm').value;
    
    if (!username || !password || !confirm) {
        alert('Please fill in all fields');
        return;
    }
    
    if (username.length < 3) {
        alert('Username must be at least 3 characters');
        return;
    }
    
    if (password.length < 4) {
        alert('Password must be at least 4 characters');
        return;
    }
    
    if (password !== confirm) {
        alert('Passwords do not match');
        return;
    }
    
    const users = JSON.parse(localStorage.getItem('globalUsers') || '{}');
    
    if (users[username]) {
        alert('Username already exists');
        return;
    }
    
    users[username] = {
        password: password,
        friends: [],
        friendRequests: [],
        status: 'Online',
        currentGame: null,
        createdAt: Date.now()
    };
    
    localStorage.setItem('globalUsers', JSON.stringify(users));
    
    // Increment global player count
    const playerCount = parseInt(localStorage.getItem('globalPlayerCount') || '0');
    localStorage.setItem('globalPlayerCount', (playerCount + 1).toString());
    
    currentUser = username;
    isGuest = false;
    localStorage.setItem('currentUser', username);
    hideAuthModal();
    showUserBar();
    initializeApp();
    
    // Show reminder to other users
    alert(`✅ Account created!\n\n👥 Total players: ${playerCount + 1}\n\n⚠️ IMPORTANT FOR OTHER BROWSERS:\nOther users need to refresh (Ctrl+R or Windows+R) to see your account!`);
}

function handleGuest() {
    isGuest = true;
    currentUser = 'Guest';
    localStorage.removeItem('currentUser');
    hideAuthModal();
    showUserBar();
    initializeApp();
}

function showUserBar() {
    document.getElementById('userBar').style.display = 'flex';
    document.getElementById('currentUsername').textContent = currentUser;
    
    if (isGuest) {
        document.getElementById('friendsBtn').style.display = 'none';
        document.getElementById('notificationsBtn').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'none';
    } else {
        document.getElementById('friendsBtn').style.display = 'inline-block';
        document.getElementById('notificationsBtn').style.display = 'inline-block';
        document.getElementById('logoutBtn').style.display = 'none'; // Removed logout button
        updateUserStatus('Online');
        setupFriendSystem();
        updateNotificationBadge();
    }
}

function initializeApp() {
    loadGames();
    setupThemes();
    setupSidebar();
    setupFavorites();
    setupCloaking();
    setupEject();
    setupSearch();
    setupClock();
    updatePlayerCount();
}

function updatePlayerCount() {
    const count = parseInt(localStorage.getItem('globalPlayerCount') || '0');
    document.getElementById('playerCounter').textContent = `👥 ${count} Player${count !== 1 ? 's' : ''}`;
}

// ===== FRIEND SYSTEM =====

function setupFriendSystem() {
    document.getElementById('friendsBtn').onclick = () => {
        document.getElementById('friendsPanel').classList.add('active');
        loadFriendsList();
    };
    
    document.getElementById('notificationsBtn').onclick = () => {
        document.getElementById('notificationsPanel').classList.add('active');
        loadFriendRequests();
    };
    
    document.querySelectorAll('.close-panel').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.side-panel').forEach(panel => {
                panel.classList.remove('active');
            });
        };
    });
    
    document.getElementById('sendFriendRequest').onclick = sendFriendRequest;
}

function sendFriendRequest() {
    const targetUsername = document.getElementById('friendSearchInput').value.trim();
    
    if (!targetUsername) {
        alert('Please enter a username');
        return;
    }
    
    if (targetUsername === currentUser) {
        alert('You cannot send a friend request to yourself');
        return;
    }
    
    const users = JSON.parse(localStorage.getItem('globalUsers') || '{}');
    
    if (!users[targetUsername]) {
        alert('❌ Username invalid - user does not exist');
        return;
    }
    
    if (users[currentUser].friends.includes(targetUsername)) {
        alert('You are already friends with this user');
        return;
    }
    
    if (users[targetUsername].friendRequests.includes(currentUser)) {
        alert('Friend request already sent');
        return;
    }
    
    users[targetUsername].friendRequests.push(currentUser);
    localStorage.setItem('globalUsers', JSON.stringify(users));
    
    alert('✅ Friend request sent!');
    document.getElementById('friendSearchInput').value = '';
}

function loadFriendRequests() {
    const users = JSON.parse(localStorage.getItem('globalUsers') || '{}');
    const requests = users[currentUser].friendRequests || [];
    const list = document.getElementById('notificationsList');
    
    if (requests.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#999;">No friend requests</p>';
        return;
    }
    
    list.innerHTML = requests.map(username => `
        <div class="notification-item">
            <div>
                <div class="friend-name">${username}</div>
                <small>wants to be friends</small>
            </div>
            <div>
                <button class="accept-btn" onclick="acceptFriendRequest('${username}')">Accept</button>
                <button class="reject-btn" onclick="rejectFriendRequest('${username}')">Reject</button>
            </div>
        </div>
    `).join('');
}

window.acceptFriendRequest = function(username) {
    const users = JSON.parse(localStorage.getItem('globalUsers') || '{}');
    
    users[currentUser].friends.push(username);
    users[username].friends.push(currentUser);
    
    users[currentUser].friendRequests = users[currentUser].friendRequests.filter(u => u !== username);
    
    localStorage.setItem('globalUsers', JSON.stringify(users));
    
    loadFriendRequests();
    updateNotificationBadge();
    alert(`✅ You are now friends with ${username}!`);
};

window.rejectFriendRequest = function(username) {
    const users = JSON.parse(localStorage.getItem('globalUsers') || '{}');
    users[currentUser].friendRequests = users[currentUser].friendRequests.filter(u => u !== username);
    localStorage.setItem('globalUsers', JSON.stringify(users));
    
    loadFriendRequests();
    updateNotificationBadge();
};

function loadFriendsList() {
    const users = JSON.parse(localStorage.getItem('globalUsers') || '{}');
    const friends = users[currentUser].friends || [];
    const list = document.getElementById('friendsList');
    
    if (friends.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#999;margin-top:20px;">No friends yet. Add some!</p>';
        return;
    }
    
    list.innerHTML = friends.map(username => {
        const friend = users[username] || { status: 'Offline', currentGame: null };
        const status = friend.status || 'Offline';
        const statusText = friend.currentGame ? `Playing: ${friend.currentGame}` : status;
        
        return `
            <div class="friend-item">
                <div>
                    <div class="friend-name">👤 ${username}</div>
                    <div class="friend-status">${statusText}</div>
                </div>
                <button class="unfriend-btn" onclick="unfriend('${username}')">Unfriend</button>
            </div>
        `;
    }).join('');
}

window.unfriend = function(username) {
    if (confirm(`Unfriend ${username}?`)) {
        const users = JSON.parse(localStorage.getItem('globalUsers') || '{}');
        
        users[currentUser].friends = users[currentUser].friends.filter(u => u !== username);
        if (users[username]) {
            users[username].friends = users[username].friends.filter(u => u !== currentUser);
        }
        
        localStorage.setItem('globalUsers', JSON.stringify(users));
        loadFriendsList();
    }
};

function updateNotificationBadge() {
    const users = JSON.parse(localStorage.getItem('globalUsers') || '{}');
    const requests = users[currentUser].friendRequests || [];
    const badge = document.getElementById('notifBadge');
    
    if (requests.length > 0) {
        badge.textContent = requests.length;
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}

function updateUserStatus(status, gameName = null) {
    if (isGuest || !currentUser) return;
    
    const users = JSON.parse(localStorage.getItem('globalUsers') || '{}');
    if (users[currentUser]) {
        users[currentUser].status = status;
        users[currentUser].currentGame = gameName;
        localStorage.setItem('globalUsers', JSON.stringify(users));
    }
}

window.addEventListener('beforeunload', () => {
    updateUserStatus('Offline', null);
});

