// This will be populated automatically by scanning the assets folder
let allGames = [];
let currentTheme = 'default';
let currentGame = null;
let showingFavorites = false;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadGamesAutomatically();
    setupSearch();
    setupThemeChanger();
    setupGameSidebar();
    setupFavoritesToggle();
    loadSavedTheme();
});

// Automatically load games from assets folder
async function loadGamesAutomatically() {
    const gamesGrid = document.getElementById('gamesGrid');
    gamesGrid.innerHTML = '<div class="loading">Scanning assets folder for games...</div>';
    
    let gameFiles = [];
    
    // Try GitHub API - this is the MOST RELIABLE method for GitHub Pages
    const path = window.location.pathname;
    const parts = path.split('/').filter(p => p);
    
    // Extract username and repo from URL
    // Format: username.github.io/repo-name or custom domain
    let username = '';
    let repo = '';
    
    if (window.location.hostname.includes('github.io')) {
        // Standard GitHub Pages: username.github.io/repo-name
        if (parts.length >= 1) {
            const firstPart = window.location.hostname.split('.')[0];
            username = firstPart;
            repo = parts[0] || '';
        }
    }
    
    console.log('Detected GitHub info:', { username, repo, hostname: window.location.hostname });
    
    // Method 1: GitHub API
    if (username && repo) {
        try {
            const apiUrl = `https://api.github.com/repos/${username}/${repo}/contents/assets`;
            console.log('Fetching from GitHub API:', apiUrl);
            
            const response = await fetch(apiUrl);
            
            if (response.ok) {
                const files = await response.json();
                console.log('GitHub API returned:', files.length, 'items');
                
                gameFiles = files
                    .filter(file => file.name.endsWith('.html'))
                    .map(file => file.name);
                
                console.log('Found HTML files:', gameFiles);
                
                if (gameFiles.length > 0) {
                    allGames = gameFiles.map(filename => ({
                        filename: filename,
                        displayName: formatGameName(filename)
                    }));
                    displayGames(allGames);
                    return;
                }
            } else {
                console.log('GitHub API response not OK:', response.status);
            }
        } catch (error) {
            console.log('GitHub API error:', error);
        }
    }
    
    // Method 2: Try fetching directory listing (works on some servers)
    try {
        console.log('Trying direct folder access...');
        const response = await fetch('assets/');
        
        if (response.ok) {
            const text = await response.text();
            console.log('Got folder listing, length:', text.length);
            
            // Parse HTML directory listing
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            const links = doc.querySelectorAll('a');
            
            gameFiles = [];
            links.forEach(link => {
                const href = link.getAttribute('href');
                if (href && href.endsWith('.html')) {
                    const filename = href.split('/').pop().split('?')[0];
                    gameFiles.push(filename);
                }
            });
            
            console.log('Found via folder listing:', gameFiles);
            
            if (gameFiles.length > 0) {
                allGames = gameFiles.map(filename => ({
                    filename: filename,
                    displayName: formatGameName(filename)
                }));
                displayGames(allGames);
                return;
            }
        }
    } catch (error) {
        console.log('Folder listing error:', error);
    }
    
    // Method 3: Brute force check common patterns (FAST VERSION - checks in parallel)
    console.log('Trying brute force detection...');
    gamesGrid.innerHTML = '<div class="loading">Searching for games (this may take a moment)...</div>';
    
    const patterns = [];
    
    // Check numbered patterns up to 500
    for (let i = 1; i <= 500; i++) {
        patterns.push(`${i}.html`);
        patterns.push(`game${i}.html`);
        patterns.push(`game-${i}.html`);
        patterns.push(`game_${i}.html`);
    }
    
    // Check with leading zeros (common pattern)
    for (let i = 1; i <= 100; i++) {
        const num = i.toString().padStart(3, '0');
        patterns.push(`${num}.html`);
        patterns.push(`game${num}.html`);
    }
    
    // Common game names
    const commonNames = ['math', 'physics', 'chemistry', 'biology', 'science', 
                        'puzzle', 'quiz', 'adventure', 'racing', 'shooter',
                        'platformer', 'arcade', 'snake', 'pong', 'tetris',
                        'breakout', 'space', 'alien', 'zombie', 'tower',
                        'defense', 'strategy', 'rpg', 'action'];
    
    commonNames.forEach(name => {
        patterns.push(`${name}.html`);
        patterns.push(`${name}-game.html`);
        patterns.push(`${name}_game.html`);
        for (let i = 1; i <= 10; i++) {
            patterns.push(`${name}${i}.html`);
            patterns.push(`${name}-${i}.html`);
        }
    });
    
    // Check in batches
    const batchSize = 20;
    const foundGames = [];
    
    for (let i = 0; i < patterns.length; i += batchSize) {
        const batch = patterns.slice(i, i + batchSize);
        const results = await Promise.all(
            batch.map(async (filename) => {
                try {
                    const response = await fetch(`assets/${filename}`, { method: 'HEAD' });
                    return response.ok ? filename : null;
                } catch {
                    return null;
                }
            })
        );
        
        results.forEach(filename => {
            if (filename) foundGames.push(filename);
        });
        
        // Update progress
        if (foundGames.length > 0) {
            gamesGrid.innerHTML = `<div class="loading">Found ${foundGames.length} games so far... (checked ${Math.min(i + batchSize, patterns.length)}/${patterns.length})</div>`;
        }
        
        // Stop early if we found a bunch
        if (foundGames.length >= 50) {
            console.log('Found 50+ games, stopping early');
            break;
        }
    }
    
    console.log('Brute force found:', foundGames.length, 'games');
    
    if (foundGames.length > 0) {
        allGames = foundGames.map(filename => ({
            filename: filename,
            displayName: formatGameName(filename)
        }));
        displayGames(allGames);
        return;
    }
    
    // Nothing worked - show error
    gamesGrid.innerHTML = `
        <div class="loading" style="text-align: center; max-width: 700px; margin: 0 auto;">
            <p style="font-size: 1.6rem; margin-bottom: 20px;">😢 No games found</p>
            
            <div style="background: rgba(255,255,255,0.15); padding: 25px; border-radius: 15px; text-align: left; margin-bottom: 20px;">
                <p style="font-size: 1.1rem; margin-bottom: 15px;"><strong>What I tried:</strong></p>
                <p style="font-size: 0.95rem; margin: 8px 0;">✓ GitHub API (username: ${username}, repo: ${repo})</p>
                <p style="font-size: 0.95rem; margin: 8px 0;">✓ Direct folder listing</p>
                <p style="font-size: 0.95rem; margin: 8px 0;">✓ Checked 1000+ common filename patterns</p>
            </div>
            
            <div style="background: rgba(255,255,255,0.15); padding: 25px; border-radius: 15px; text-align: left;">
                <p style="font-size: 1.1rem; margin-bottom: 15px;"><strong>Debug Info:</strong></p>
                <p style="font-size: 0.9rem; margin: 5px 0;">Current URL: ${window.location.href}</p>
                <p style="font-size: 0.9rem; margin: 5px 0;">Hostname: ${window.location.hostname}</p>
                <p style="font-size: 0.9rem; margin: 5px 0;">Path: ${window.location.pathname}</p>
                <p style="font-size: 0.85rem; margin-top: 15px; opacity: 0.9;">Open browser console (F12) for detailed logs</p>
            </div>
            
            <p style="font-size: 1rem; margin-top: 25px; opacity: 0.9;">
                Make sure:<br>
                1. HTML files are in the <code>assets/</code> folder<br>
                2. Files end with <code>.html</code><br>
                3. You've pushed and deployed to GitHub Pages
            </p>
        </div>
    `;
}

// Format the filename into a readable display name
function formatGameName(filename) {
    // Remove .html extension
    let name = filename.replace('.html', '');
    
    // Replace underscores and hyphens with spaces
    name = name.replace(/[_-]/g, ' ');
    
    // Capitalize first letter of each word
    name = name.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    
    return name;
}

// Display games in the grid
function displayGames(games) {
    const gamesGrid = document.getElementById('gamesGrid');
    const noResults = document.getElementById('noResults');
    
    if (games.length === 0) {
        gamesGrid.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';
    gamesGrid.innerHTML = '';
    
    games.forEach((game, index) => {
        const button = document.createElement('button');
        button.className = 'game-button fade-in';
        button.textContent = game.displayName;
        button.style.animationDelay = `${index * 0.05}s`;
        
        // Check if game is favorited
        if (isGameFavorited(game.filename)) {
            button.innerHTML = `⭐ ${game.displayName}`;
        }
        
        // Open sidebar when clicked instead of opening game directly
        button.addEventListener('click', () => {
            openGameSidebar(game.filename, game.displayName);
        });
        
        gamesGrid.appendChild(button);
    });
}

// Open game in a new tab
function openGame(filename) {
    const gameUrl = `assets/${filename}`;
    window.open(gameUrl, '_blank');
}

// Setup search functionality
function setupSearch() {
    const searchBar = document.getElementById('searchBar');
    
    searchBar.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        if (searchTerm === '') {
            displayGames(allGames);
            return;
        }
        
        const filteredGames = allGames.filter(game => 
            game.displayName.toLowerCase().includes(searchTerm) ||
            game.filename.toLowerCase().includes(searchTerm)
        );
        
        displayGames(filteredGames);
    });
    
    // Clear search on escape key
    searchBar.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            searchBar.value = '';
            displayGames(allGames);
            searchBar.blur();
        }
    });
}

// Setup theme changer
function setupThemeChanger() {
    const themeToggle = document.getElementById('themeToggle');
    const themeDropdown = document.getElementById('themeDropdown');
    const themeButtons = document.querySelectorAll('.theme-btn');
    const customColorPanel = document.getElementById('customColorPanel');
    
    // Toggle dropdown
    themeToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        themeDropdown.classList.toggle('active');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!themeDropdown.contains(e.target) && e.target !== themeToggle) {
            themeDropdown.classList.remove('active');
        }
    });
    
    // Theme buttons
    themeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const theme = btn.getAttribute('data-theme');
            applyTheme(theme);
            
            // Update active state
            themeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Show custom panel if custom theme
            if (theme === 'custom') {
                customColorPanel.style.display = 'block';
            } else {
                customColorPanel.style.display = 'none';
            }
        });
    });
    
    // Custom color pickers
    const bgColorPicker = document.getElementById('bgColorPicker');
    const bgShadePicker = document.getElementById('bgShadePicker');
    const textColorPicker = document.getElementById('textColorPicker');
    
    bgColorPicker.addEventListener('input', updateCustomTheme);
    bgShadePicker.addEventListener('input', updateCustomTheme);
    textColorPicker.addEventListener('input', updateCustomTheme);
}

// Apply theme
function applyTheme(theme) {
    currentTheme = theme;
    const body = document.body;
    
    // Remove all theme classes
    body.classList.remove('theme-rainbow', 'theme-galaxy', 'theme-custom');
    
    // Apply new theme
    if (theme !== 'default') {
        body.classList.add(`theme-${theme}`);
    }
    
    // Save theme preference
    localStorage.setItem('selectedTheme', theme);
    
    // If custom, apply saved colors
    if (theme === 'custom') {
        const bgColor = localStorage.getItem('customBgColor') || '#667eea';
        const bgShade = localStorage.getItem('customBgShade') || '#764ba2';
        const textColor = localStorage.getItem('customTextColor') || '#667eea';
        
        document.getElementById('bgColorPicker').value = bgColor;
        document.getElementById('bgShadePicker').value = bgShade;
        document.getElementById('textColorPicker').value = textColor;
        
        updateCustomTheme();
    }
}

// Update custom theme colors
function updateCustomTheme() {
    const bgColor = document.getElementById('bgColorPicker').value;
    const bgShade = document.getElementById('bgShadePicker').value;
    const textColor = document.getElementById('textColorPicker').value;
    
    document.body.style.setProperty('--custom-bg-gradient', 
        `linear-gradient(135deg, ${bgColor} 0%, ${bgShade} 100%)`);
    document.body.style.setProperty('--custom-text-color', textColor);
    
    // Save colors
    localStorage.setItem('customBgColor', bgColor);
    localStorage.setItem('customBgShade', bgShade);
    localStorage.setItem('customTextColor', textColor);
}

// Load saved theme
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('selectedTheme') || 'default';
    applyTheme(savedTheme);
    
    // Set active button
    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(btn => {
        if (btn.getAttribute('data-theme') === savedTheme) {
            btn.classList.add('active');
        }
    });
    
    // Show custom panel if custom theme
    if (savedTheme === 'custom') {
        document.getElementById('customColorPanel').style.display = 'block';
    }
}

// ===== GAME SIDEBAR FUNCTIONALITY =====

function setupGameSidebar() {
    const sidebar = document.getElementById('gameSidebar');
    const closeSidebar = document.getElementById('closeSidebar');
    const playGameBtn = document.getElementById('playGameBtn');
    const favoriteBtn = document.getElementById('favoriteBtn');
    const likeBtn = document.getElementById('likeBtn');
    const dislikeBtn = document.getElementById('dislikeBtn');
    
    // Create sidebar overlay
    const sidebarOverlay = document.createElement('div');
    sidebarOverlay.className = 'sidebar-overlay';
    document.body.appendChild(sidebarOverlay);
    
    // Close sidebar
    closeSidebar.addEventListener('click', () => {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    });
    
    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    });
    
    // Play game button
    playGameBtn.addEventListener('click', () => {
        if (currentGame) {
            incrementPlayCount(currentGame.filename);
            openGame(currentGame.filename);
            updatePlayCount();
        }
    });
    
    // Favorite button
    favoriteBtn.addEventListener('click', () => {
        if (currentGame) {
            toggleFavorite(currentGame.filename);
            updateFavoriteButton();
            // Refresh display if showing favorites
            if (showingFavorites) {
                displayFavorites();
            } else {
                // Refresh current view to update star icons
                displayGames(allGames);
            }
        }
    });
    
    // Like button
    likeBtn.addEventListener('click', () => {
        if (currentGame) {
            toggleLike(currentGame.filename);
            updateLikeButtons();
        }
    });
    
    // Dislike button
    dislikeBtn.addEventListener('click', () => {
        if (currentGame) {
            toggleDislike(currentGame.filename);
            updateLikeButtons();
        }
    });
}

function openGameSidebar(filename, displayName) {
    currentGame = { filename, displayName };
    
    const sidebar = document.getElementById('gameSidebar');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');
    const gameTitle = document.getElementById('sidebarGameTitle');
    
    gameTitle.textContent = displayName;
    
    sidebar.classList.add('active');
    sidebarOverlay.classList.add('active');
    
    updatePlayCount();
    updateFavoriteButton();
    updateLikeButtons();
    updateLikeCounts();
}

// ===== DATA STORAGE FUNCTIONS =====

function getGameData(filename) {
    const data = localStorage.getItem(`game_${filename}`);
    return data ? JSON.parse(data) : {
        playCount: 0,
        liked: false,
        disliked: false,
        favorited: false
    };
}

function saveGameData(filename, data) {
    localStorage.setItem(`game_${filename}`, JSON.stringify(data));
}

// Global counters for likes and dislikes
function getGlobalLikeCount(filename) {
    const count = localStorage.getItem(`global_likes_${filename}`);
    return count ? parseInt(count) : 0;
}

function getGlobalDislikeCount(filename) {
    const count = localStorage.getItem(`global_dislikes_${filename}`);
    return count ? parseInt(count) : 0;
}

function incrementGlobalLikes(filename) {
    const current = getGlobalLikeCount(filename);
    localStorage.setItem(`global_likes_${filename}`, (current + 1).toString());
}

function decrementGlobalLikes(filename) {
    const current = getGlobalLikeCount(filename);
    if (current > 0) {
        localStorage.setItem(`global_likes_${filename}`, (current - 1).toString());
    }
}

function incrementGlobalDislikes(filename) {
    const current = getGlobalDislikeCount(filename);
    localStorage.setItem(`global_dislikes_${filename}`, (current + 1).toString());
}

function decrementGlobalDislikes(filename) {
    const current = getGlobalDislikeCount(filename);
    if (current > 0) {
        localStorage.setItem(`global_dislikes_${filename}`, (current - 1).toString());
    }
}

function incrementPlayCount(filename) {
    const data = getGameData(filename);
    data.playCount++;
    saveGameData(filename, data);
}

function toggleFavorite(filename) {
    const data = getGameData(filename);
    data.favorited = !data.favorited;
    saveGameData(filename, data);
}

function toggleLike(filename) {
    const data = getGameData(filename);
    const wasLiked = data.liked;
    const wasDisliked = data.disliked;
    
    if (data.liked) {
        // Unlike
        data.liked = false;
        decrementGlobalLikes(filename);
    } else {
        // Like
        data.liked = true;
        incrementGlobalLikes(filename);
        
        // Remove dislike if present
        if (data.disliked) {
            data.disliked = false;
            decrementGlobalDislikes(filename);
        }
    }
    
    saveGameData(filename, data);
}

function toggleDislike(filename) {
    const data = getGameData(filename);
    const wasLiked = data.liked;
    const wasDisliked = data.disliked;
    
    if (data.disliked) {
        // Un-dislike
        data.disliked = false;
        decrementGlobalDislikes(filename);
    } else {
        // Dislike
        data.disliked = true;
        incrementGlobalDislikes(filename);
        
        // Remove like if present
        if (data.liked) {
            data.liked = false;
            decrementGlobalLikes(filename);
        }
    }
    
    saveGameData(filename, data);
}

function isGameFavorited(filename) {
    const data = getGameData(filename);
    return data.favorited;
}

// ===== UPDATE UI FUNCTIONS =====

function updatePlayCount() {
    if (!currentGame) return;
    const data = getGameData(currentGame.filename);
    document.getElementById('playCount').textContent = data.playCount;
}

function updateLikeCounts() {
    if (!currentGame) return;
    const likeCount = getGlobalLikeCount(currentGame.filename);
    const dislikeCount = getGlobalDislikeCount(currentGame.filename);
    
    document.getElementById('likeCount').textContent = likeCount;
    document.getElementById('dislikeCount').textContent = dislikeCount;
}

function updateFavoriteButton() {
    if (!currentGame) return;
    const data = getGameData(currentGame.filename);
    const favoriteBtn = document.getElementById('favoriteBtn');
    
    if (data.favorited) {
        favoriteBtn.classList.add('active');
        favoriteBtn.querySelector('.btn-text').textContent = 'Favorited';
    } else {
        favoriteBtn.classList.remove('active');
        favoriteBtn.querySelector('.btn-text').textContent = 'Favorite';
    }
}

function updateLikeButtons() {
    if (!currentGame) return;
    const data = getGameData(currentGame.filename);
    const likeBtn = document.getElementById('likeBtn');
    const dislikeBtn = document.getElementById('dislikeBtn');
    
    if (data.liked) {
        likeBtn.classList.add('active');
        dislikeBtn.classList.remove('active');
    } else if (data.disliked) {
        dislikeBtn.classList.add('active');
        likeBtn.classList.remove('active');
    } else {
        likeBtn.classList.remove('active');
        dislikeBtn.classList.remove('active');
    }
    
    // Update counts too
    updateLikeCounts();
}

// ===== FAVORITES TOGGLE =====

function setupFavoritesToggle() {
    const favoritesToggle = document.getElementById('favoritesToggle');
    
    favoritesToggle.addEventListener('click', () => {
        showingFavorites = !showingFavorites;
        
        if (showingFavorites) {
            favoritesToggle.classList.add('active');
            favoritesToggle.textContent = '🎮 All Games';
            displayFavorites();
        } else {
            favoritesToggle.classList.remove('active');
            favoritesToggle.textContent = '⭐ Favorites';
            displayGames(allGames);
        }
    });
}

function displayFavorites() {
    const favoritedGames = allGames.filter(game => isGameFavorited(game.filename));
    
    const gamesGrid = document.getElementById('gamesGrid');
    const noResults = document.getElementById('noResults');
    
    if (favoritedGames.length === 0) {
        gamesGrid.innerHTML = `
            <div class="loading" style="text-align: center;">
                <p style="font-size: 1.4rem; margin-bottom: 15px;">⭐ No favorites yet!</p>
                <p style="font-size: 1rem; opacity: 0.9;">Click the star button on games to add them to your favorites.</p>
            </div>
        `;
        noResults.style.display = 'none';
        return;
    }
    
    displayGames(favoritedGames);
}
