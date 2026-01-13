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
    setupTabCloaking();
    setupEjectButton();
    loadSavedTheme();
    loadSavedCloak();
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
    
    // Update game counter
    updateGameCounter(games.length);
    
    // Get saved custom font if in custom theme
    const savedFont = localStorage.getItem('customFont');
    
    games.forEach((game, index) => {
        const button = document.createElement('button');
        button.className = 'game-button fade-in';
        button.textContent = game.displayName;
        button.style.animationDelay = `${index * 0.05}s`;
        
        // Apply custom font if it exists
        if (savedFont && currentTheme === 'custom') {
            button.style.fontFamily = savedFont;
        }
        
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
    const fontPicker = document.getElementById('fontPicker');
    
    bgColorPicker.addEventListener('input', updateCustomTheme);
    bgShadePicker.addEventListener('input', updateCustomTheme);
    textColorPicker.addEventListener('input', updateCustomTheme);
    fontPicker.addEventListener('change', updateCustomFont);
}

// Apply theme
function applyTheme(theme) {
    currentTheme = theme;
    const body = document.body;
    
    // Remove all theme classes
    const themeClasses = [
        'theme-rainbow', 'theme-galaxy', 'theme-custom',
        'theme-neon-cyberpunk', 'theme-dark-mode', 'theme-retro-arcade',
        'theme-forest-fantasy', 'theme-fire-lava', 'theme-ice-kingdom',
        'theme-ocean-depths', 'theme-desert-storm', 'theme-glitch-mode',
        'theme-synthwave', 'theme-blood-moon', 'theme-minimal-white',
        'theme-matrix', 'theme-galaxy-rainbow', 'theme-steampunk',
        'theme-cartoon-pop', 'theme-shadow-realm', 'theme-snowy-night'
    ];
    
    themeClasses.forEach(cls => body.classList.remove(cls));
    
    // Apply new theme
    if (theme !== 'default') {
        body.classList.add(`theme-${theme}`);
    }
    
    // Save theme preference
    localStorage.setItem('selectedTheme', theme);
    
    // If custom, apply saved colors and font
    if (theme === 'custom') {
        const bgColor = localStorage.getItem('customBgColor') || '#667eea';
        const bgShade = localStorage.getItem('customBgShade') || '#764ba2';
        const textColor = localStorage.getItem('customTextColor') || '#667eea';
        const font = localStorage.getItem('customFont') || "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
        
        document.getElementById('bgColorPicker').value = bgColor;
        document.getElementById('bgShadePicker').value = bgShade;
        document.getElementById('textColorPicker').value = textColor;
        document.getElementById('fontPicker').value = font;
        
        updateCustomTheme();
        updateCustomFont();
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

// Update custom font
function updateCustomFont() {
    const font = document.getElementById('fontPicker').value;
    
    // Apply to entire body
    document.body.style.fontFamily = font;
    
    // Also explicitly apply to game buttons to ensure they inherit
    const gameButtons = document.querySelectorAll('.game-button');
    gameButtons.forEach(button => {
        button.style.fontFamily = font;
    });
    
    // Apply to all other text elements
    const allTextElements = document.querySelectorAll('h1, h2, h3, h4, p, span, button, input, label, select');
    allTextElements.forEach(element => {
        element.style.fontFamily = font;
    });
    
    localStorage.setItem('customFont', font);
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

// ===== GAME COUNTER =====

function updateGameCounter(count) {
    const counter = document.getElementById('gameCounter');
    if (counter) {
        counter.textContent = `${count} Game${count !== 1 ? 's' : ''} Available`;
    }
}

// ===== TAB CLOAKING =====

const cloakData = {
    'none': {
        title: 'Cool Science Games',
        favicon: ''
    },
    'schoology': {
        title: 'Home | Schoology',
        favicon: 'data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJycnP+cnJz/nJyc/5ycnP+cnJz/nJyc/5ycnP+cnJz/nJyc/5ycnP+cnJz/nJyc/5ycnP8AAAAAAAAAAAAAAAAAAAAAAAAAAJycnP/39/f/9/f3//f39//39/f/9/f3//f39//39/f/9/f3//f39//39/f/9/f3/5ycnP8AAAAAAAAAAAAAAAAAAAAAAAAAAJycnP/39/f////////////39/f/9/f3//f39//39/f/9/f3//f39////////////5ycnP8AAAAAAAAAAAAAAAAAAAAAAAAAAJycnP/39/f/9/f3//f39//39/f/9/f3//f39//39/f/9/f3//f39//39/f/9/f3/5ycnP8AAAAAAAAAAAAAAAAAAAAAAAAAAJycnP//////9/f3//f39//39/f/9/f3//f39//39/f/9/f3//f39//39/f//////5ycnP8AAAAAAAAAAAAAAAAAAAAAAAAAAJycnP/39/f/9/f3//f39//39/f/9/f3//f39//39/f/9/f3//f39//39/f/9/f3/5ycnP8AAAAAAAAAAAAAAAAAAAAAAAAAAJycnP//////////////////////////////////////////////////////nJyc/wAAAAAAAAAAAAAAAAAAAAAAAAAAnJyc//f39//39/f/9/f3//f39//39/f/9/f3//f39//39/f/9/f3//f39//39/f/nJyc/wAAAAAAAAAAAAAAAAAAAAAAAAAAnJyc///////39/f/9/f3//f39//39/f/9/f3//f39//39/f/9/f3//f39///////nJyc/wAAAAAAAAAAAAAAAAAAAAAAAAAAnJyc//f39//39/f/9/f3//f39//39/f/9/f3//f39//39/f/9/f3//f39//39/f/nJyc/wAAAAAAAAAAAAAAAAAAAAAAAAAAnJyc///////////////////////39/f/9/f3//f39//39/f/9/f3//f39///////nJyc/wAAAAAAAAAAAAAAAAAAAAAAAAAAnJyc//f39//39/f/9/f3//f39//39/f/9/f3//f39//39/f/9/f3//f39//39/f/nJyc/wAAAAAAAAAAAAAAAAAAAAAAAAAAnJyc/5ycnP+cnJz/nJyc/5ycnP+cnJz/nJyc/5ycnP+cnJz/nJyc/5ycnP+cnJz/nJyc/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
    },
    'google-classroom': {
        title: 'Home',
        favicon: 'data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACYmJj/mJiY/5iYmP+YmJj/mJiY/5iYmP+YmJj/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+YmJj/////////////////////////////////////////////////////////////////mJiY/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJiYmP//////////////////////////////////////////////////////////////////////mJiY/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJiYmP//////////////////////////////////////////////////////////////////////mJiY/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJiYmP+YmJj/mJiY/5iYmP+YmJj/mJiY/5iYmP+YmJj/mJiY/5iYmP+YmJj/mJiY/5iYmP+YmJj/mJiY/5iYmP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
    },
    'zoom': {
        title: 'Zoom',
        favicon: 'data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A4ODg/+Dg4P/g4OD/4ODg/+Dg4P/g4OD/4ODg/+Dg4P/g4OD/4ODg/+Dg4P/g4OD/4ODg/+Dg4P////8A////AAAAAAAAAAAA4ODg////////////////////////////////////////////////////////////4ODg/wAAAAAAAAAAAAAAAAAAAAAAAAAAAODg4P//////////////////////4ODg/+Dg4P/g4OD/4ODg/+Dg4P/g4OD/4ODg/wAAAAAAAAAAAAAAAAAAAAAAAAAAAODg4P//////////////////////4ODg////////////4ODg////////////4ODg/wAAAAAAAAAAAAAAAAAAAAAAAAAAAODg4P//////////////////////4ODg////////////4ODg////////////4ODg/wAAAAAAAAAAAAAAAAAAAAAAAAAAAODg4P//////////////////////4ODg/+Dg4P/g4OD/4ODg/+Dg4P/g4OD/4ODg/wAAAAAAAAAAAAAAAAAAAAAAAAAAAODg4P//////4ODg/+Dg4P/g4OD/4ODg/+Dg4P/g4OD/4ODg/+Dg4P/g4OD/4ODg/wAAAAAAAAAAAAAAAAAAAAAAAAAAAODg4P//////4ODg////////////////////////////////////////////////////////////4ODg/wAAAAAAAAAAAAAAAAAAAAAAAAAAAODg4P//////4ODg/+Dg4P/g4OD/4ODg/+Dg4P/g4OD/4ODg/+Dg4P/g4OD/4ODg/wAAAAAAAAAAAAAAAAAAAAAAAAAAAODg4P/g4OD/4ODg/+Dg4P/g4OD/4ODg/+Dg4P/g4OD/4ODg/+Dg4P/g4OD/4ODg/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
    },
    'google': {
        title: 'Google',
        favicon: 'data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAABMLAAATCwAAAAAAAAAAAAD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A/v7+Cfn5+R/6+vpq+/v7qvz8/Nz9/f3w/f399f39/ej8/Pzf+/v7pPr6+mL5+fkc+vr6Bf///wD///8A////AP///wD///8A+/v7Cvn5+Vr7+/vh/f39/////////////////////////////v7+/vz8/P/6+vro+fn5UPv7+wf///8A////AP///wD6+voK+fn5iP39/f/+/v7////////////o6Oj/0NDQ/9TU1P/t7e3////////////9/f3/+vr6gPr6+gf///8A////APr6+hP6+vri/f39////////////zMzM/4CAgP9xcXH/cnJy/4GBgf/S0tL/////////////////+vr63fr6+hD///8A+vr6Bvr6+qT9/f3///////+zs7P/VlZW/yoqKv8hISH/ISEh/yoqKv9bW1v/vr6+////////////+vr6nvr6+gT///8A+vr6Wfz8/P//////jo6O/x4eHv8EBAT/AAAA/wAAAP8AAAD/AAAA/wYGBv8pKSn/mZmZ//////39/f/6+vpS////APr6+tH+/v7///////////9/f3//AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/0tLS////////////vr6+s3///8A+vr64v39/f/+/v7//////2RkZP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/QUFB//////39/f/6+vre////APr6+tv9/f3//v7+//////9oaGj/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/0VFRf//////+vr60/r6+gf///8A+vr6qf39/f//////ubm5/xAQEP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8YGBj/xsbG//////39/f/6+vqc+vr6BP///wD6+vpE/Pz8////////////7+/v/5CQkP9hYWH/TExM/0xMTP9mZmb/nJyc//T09P////////////39/f/6+vpA////APv7+wz6+vr2/v7+//////////////////////////////////7+/v/+/v7///////////////////////39/f/6+vrw+vr6Cv///wD///8A+vr6Hfr6+sb9/f3//v7+//////////////////////////////////////7+/v/9/f3/+vr6u/r6+hj///8A////AP///wD///8A+vr6Bfn5+Tn6+vpg+vr6kvr6+rn6+vrK+vr6zPr6+r76+vpx+vr6NP39/Qj///8A////AP///wAoAAAAIAAAAEAAAAABACAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A/v7+Bvr6+hX4+PgW+vr6Dvz8/AT///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////APr6+g/5+fld+vr6pfv7+97+/v75////+f7+/vz9/f3+/Pz8//v7+//6+vr/+fn5//n5+f/5+fng+fn5qfr6+m75+fkU////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////APv7+wf5+fla+/v74/7+/v/+/v7/////////////////////////////////////////////////+fn5//n5+f/6+vrg+fn5V/r6+gX///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A+vr6A/n5+Vr9/f3//v7+////////////////////////////////////////////////////////////+fn5//n5+f/7+/v/+fn5Vvz8/AL///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A+fn5C/r6+qD+/v7//////////////////////////////////////9ra2v/CwsL/vb29/8LCwv/a2tr///////////////////////////n5+f/6+vqc+vr6Cv///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A+fn5Hvr6+vf+/v7//////////////////////9fX1/+ZmZn/bGxs/0RERP8pKSn/JSUl/ygoKP9ISEj/bm5u/5ubm//Z2dn//////////////////////f39//n5+fX6+voc////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD6+voF+vr6c/7+/v///////////////////////52dnf81NTX/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/Ozs7/6CgoP//////////////////////+vr6bvr6+gX///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD6+voa+vr6+f///////////////////////4GBgf8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP+Hh4f///////////////////////r6+vX6+voa////AP///wD///8A////AP///wD///8A////AP///wD///8A////APr6+hn7+/vl//////////////////////+AgID/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/4aGhv//////////////////////+/v73vr6+hb///8A////AP///wD///8A////AP///wD///8A////APr6+hT7+/vh//////////////////////9vb2//AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP91dXX//////////////////////vz8/N35+fkT////AP///wD///8A////AP///wD///8A+vr6EPr6+vH//////////////////////11dXf8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP9jY2P///////////////////////r6+uz6+voN////AP///wD///8A////AP///wD7+/sL+vr69P//////////////////////WFhY/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/15eXv///////////////////////Pz88/v7+wn///8A////AP///wD///8A+fn5Bvr6+uz+/v7//////////////////////1hYWP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP9eXl7///////////////////////n5+ef6+voE////AP///wD///8A+vr6Bvr6+v3//////////////////////3d3d/8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP99fX3//////////////////////vr6+vb6+voE////AP///wD///8A+vr6Efr6+v///////////////////////6CgoP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/6ampv//////////////////////+vr6+vr6+g3///8A////AP///wD6+voU+vr6////////////+/v7/9TU1P+Ghob/VlZW/yYmJv8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8pKSn/W1tb/4qKiv/X19f/+/v7////////////+vr69Pr6+hD///8A////AP///wD6+voe+vr6//////39/f/MzMz/bm5u/xMTE/8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/xkZGf90dHT/z8/P//39/f//////+vr68fr6+hj///8A////AP///wD6+voq+vr6//39/f+wsLD/IyMj/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8pKSn/s7Oz//7+/v/6+vr/+vr6Hf///wD///8A////APr6+jb6+vr/+/v7/25ubv8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/3R0dP/+/v7/+vr6//r6+i////8A////AP///wD6+vpD+vr6//Dw8P8HBwf/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8ODg7/8vLy/////fr6+jb///8A////AP///wD6+vpQ+vr6//Hx8f8ICAj/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8PDw//9PT0/////fr6+kP///8A////AP///wD6+vpb+vr6//n5+f88PDz/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/0JCQv/7+/v/+vr6/+vr6k////8A////AP///wD6+vpk+vr6//39/f/Ly8v/Hh4e/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8hISH/zs7O//7+/v/6+vr/+vr6Vv///wD///8A////APr6+m36+vr///////+9vb3/ERER/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/FRUV/8PDw///////+vr6/+vr60D///8A////AP///wD6+vpv+vr6////////////5ubm/5qamv9VVVX/GBgY/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/xwcHP9aWlr/nJyc/+rq6v//////+vr6/+vr6zP///8A////AP///wD6+vpv+vr6////////////////////////////5OTk/7S0tP+AgID/YGBg/09PT/9PT0//YGBg/4GBgf+2trb/5eXl//////////////////r6+v/r6+sz////AP///wD///8A+vr6b/r6+v//////////////////////////////////////////////////////////////////////////////////////+vr6/+vr6zP///8A////AP///wD6+vpv+vr6////////////////////////////////////////////////////////////////////////////+vr6/////+vr6zP///8A////AP///wD6+vpv+vr6//////////////////////////////////////////////////////////////////////////////////////////////////////r6+v/r6+sz////AP///wD///8A+vr6b/r6+v//////////////////////////////////////////////////////////////////////////////////////+vr6/+vr6zP///8A////AP///wD6+vpv+vr6////////////////////////////////////////////////////////////////////////////+vr6/////+vr6zP///8A////AP///wD6+vpv+vr6//////////////////////////////////////////////////////////////////////////////////////////////////////r6+v/r6+sz////AP///wD///8A+vr6b/r6+v//////////////////////////////////////////////////////////////////////////////////////+vr6/+vr6zP///8A////AP///wD6+vpv+vr6////////////////////////////////////////////////////////////////////////////+vr6/////+vr6zP///8A////AP///wD6+vpv+vr6//////////////////////////////////////////////////////////////////////////////////////////////////////r6+v/r6+sz////AP///wD///8A+vr6b/r6+v//////+vr6/+vr61j///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////APr6+l36+vr/+vr6/+vr6zP///8A////AP///wD6+vpv+vr6//////r6+v/r6+tY////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD6+vpd+vr6//r6+v/r6+sz////AP///wD///8A+vr6b/r6+v//////+vr6/+vr61j///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////APr6+l36+vr/+vr6/+vr6zP///8A////AP///wD6+vpv+vr6//////r6+v/r6+tY////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD6+vpd+vr6//r6+v/r6+sz////AP///wD///8A+vr6b/r6+v//////+vr6/+vr61j///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////APr6+l36+vr/+vr6/+vr6zP///8A////AP///wD6+vpv+vr6//////r6+v/r6+tY////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD6+vpd+vr6//r6+v/r6+sz////AP///wD///8A+vr6b/r6+v//////+vr6/+vr61j///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////APr6+l36+vr/+vr6/+vr6zP///8A////AP///wD6+vpv+vr6//////r6+v/r6+tY////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD6+vpd+vr6//r6+v/r6+sz////AP///wD///8A+vr6b/r6+v//////+vr6/+vr61j///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////APr6+l36+vr/+vr6/+vr6zP///8A////AP///wD6+vpv+vr6//////r6+v/r6+tY////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD6+vpd+vr6//r6+v/r6+sz////AP///wD///8A+vr6b/r6+v//////+vr6/+vr61j///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////APr6+l36+vr/+vr6/+vr6zP///8A////AP///wD6+vpv+vr6//////r6+v/r6+tY////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD6+vpd+vr6//r6+v/r6+sz////AP///wD///8A+vr6b/r6+v//////+vr6/+vr61j///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////APr6+l36+vr/+vr6/+vr6zP///8A////AP///wD6+vpv+vr6//////r6+v/r6+tY////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD6+vpd+vr6//r6+v/r6+sz////AP///wD///8A+vr6b/r6+v//////+vr6/+vr61j///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////APr6+l36+vr/+vr6/+vr6zP///8A////AP///wD6+vpv+vr6//////r6+v/r6+tY////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD6+vpd+vr6//r6+v/r6+sz////AP///wD///8A+vr6b/r6+v//////+vr6/+vr61j///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////APr6+l36+vr/+vr6/+vr6zP///8A////AP///wD6+vpv+vr6//////r6+v/r6+tY////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD6+vpd+vr6//r6+v/r6+sz////AP///wD///8A+vr6b/r6+v//////+vr6/+vr61j///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////APr6+l36+vr/+vr6/+vr6zP///8A////AP///wD6+vpv+vr6//////r6+v/r6+tY////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD6+vpd+vr6//r6+v/r6+sz////AP///wD///8A+vr6b/r6+v//////+vr6/+vr61j///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////APr6+l36+vr/+vr6/+vr6zP///8A////AP///wD6+vpv+vr6//////r6+v/r6+tY////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD6+vpd+vr6//r6+v/r6+sz////AP///wD///8A+vr6b/r6+v//////+vr6/+vr61j///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////APr6+l36+vr/+vr6/+vr6zP///8A////AP///wD6+vpv+vr6//////r6+v/r6+tY////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD6+vpd+vr6//r6+v/r6+sz////AP///wD///8A+vr6b/r6+v//////+vr6/+vr61j///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////APr6+l36+vr/+vr6/+vr6zP///8A////AP///wD6+vpv+vr6//////r6+v/r6+tY////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD6+vpd+vr6//r6+v/r6+sz////AP///wD///8A+vr6b/r6+v//////+vr6/+vr61j///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////APr6+l36+vr/+vr6/+vr6zP///8A////AP///wD6+vpv+vr6//////r6+v/r6+tY////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD6+vpd+vr6//r6+v/r6+sz////AP///wD///8A+vr6b/r6+v//////+vr6/+vr61j///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////APr6+l36+vr/+vr6/+vr6zP///8A////AP///wD6+vpv+vr6//////r6+v/r6+tY////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD6+vpd+vr6//r6+v/r6+sz////AP///wD///8A+vr6b/r6+v//////+vr6/+vr61j///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////APr6+l36+vr/+vr6/+vr6zP///8A////AP///wD6+vpv+vr6////////////5OTk/6qqqv+BgYH/Wlpa/zg4OP8gICD/FhYW/xsbG/8qKir/QkJC/2hoaP+Kiov/pqam///////6+vr/////+vr6M////wD///8A////APr6+m/6+vr//////////////////////+7u7v/V1dX/sLCw/4CAgP9LS0v/KCgo/w8PD/8YGBj/MjIy/1RUVP+IiIj/sbGx/9ra2v/v7+///////////////////////vr6+jP///8A////AP///wD6+vpv+vr6////////////////////////////////////////////////////////////////////////////+vr6/////+vr6zP///8A////AP///wD6+vpv+vr6//////////////////////////////////////////////////////////////////////////////////////////////////////r6+v/r6+sz////AP///wD///8A+vr6b/r6+v//////////////////////////////////////////////////////////////////////////////////////+vr6/+vr6zP///8A////AP///wD6+vpv+vr6////////////////////////////////////////////////////////////////////////////+vr6/////+vr6zP///8A////AP///wD6+vpv+vr6//////////////////////////////////////////////////////////////////////////////////////////////////////r6+v/r6+sz////AP///wD///8A+vr6b/r6+v//////////////////////////////////////////////////////////////////////////////////////+vr6/+vr6zP///8A////AP///wD6+vpv+vr6////////////////////////////////////////////////////////////////////////////+vr6/////+vr6zP///8A////AP///wD6+vpv+vr6//////////////////////////////////////////////////////////////////////////////////////////////////////r6+v/r6+sz////AP///wD///8A+vr6b/r6+v//////////////////////////////////////////////////////////////////////////////////////+vr6/+vr6zP///8A////AP///wD6+vpv+vr6////////////////////////////////////////////////////////////////////////////+vr6/////+vr6zP///8A////AP///wD6+vpv+vr6//////////////////////////////////////////////////////////////////////////////////////////////////////r6+v/r6+sz////AP///wD///8A+vr6b/r6+v//////////////////////////////////////////////////////////////////////////////////////+vr6/+vr6zP///8A////AP///wD6+vpv+vr6////////////////////////////////////////////////////////////////////////////+vr6/////+vr6zP///8A////AP///wD6+vpv+vr6//////////////////////////////////////////////////////////////////////////////////////////////////////r6+v/r6+sz////AP///wD///8A+vr6b/r6+v//////////////////////////////////////////////////////////////////////////////////////+vr6/+vr6zP///8A////AP///wD6+vpv+vr6////////////////////////////////////////////////////////////////////////////+vr6/////+vr6zP///8A////AP///wD6+vpv+vr6//////////////////////////////////////////////////////////////////////////////////////////////////////r6+v/r6+sz////AP///wD///8A+vr6b/r6+v//////////////////////////////////////////////////////////////////////////////////////+vr6/+vr6zP///8A////AP///wD6+vpv+vr6////////////////////////////////////////////////////////////////////////////+vr6/////+vr6zP///8A////AP///wD6+vpv+vr6//////////////////////////////////////////////////////////////////////////////////////////////////////r6+v/r6+sz////AP///wD///8A+vr6b/r6+v//////////////////////////////////////////////////////////////////////////////////////+vr6/+vr6zP///8A////AP///wD6+vpv+vr6////////////////////////////////////////////////////////////////////////////+vr6/////+vr6zP///8A////AP///wD6+vpv+vr6//////////////////////////////////////////////////////////////////////////////////////////////////////r6+v/r6+sz////AP///wD///8A+vr6b/r6+v//////////////////////////////////////////////////////////////////////////////////////+vr6/+vr6zP///8A////AP///wD6+vpv+vr6////////////////////////////////////////////////////////////////////////////+vr6/////+vr6zP///8A////AP///wD6+vpv+vr6//////////////////////////////////////////////////////////////////////////////////////////////////////r6+v/r6+sz////AP///wD///8A+vr6b/r6+v//////////////////////////////////////////////////////////////////////////////////////+vr6/+vr6zP///8A////AP///wD6+vpv+vr6////////////////////////////////////////////////////////////////////////////+vr6/////+vr6zP///8A////AP///wD6+vpv+vr6//////////////////////////////////////////////////////////////////////////////////////////////////////r6+v/r6+sz////AP///wD///8A+vr6b/r6+v//////////////////////////////////////////////////////////////////////////////////////+vr6/+vr6zP///8A////AP///wD6+vpv+vr6////////////////////////////////////////////////////////////////////////////+vr6/////+vr6zP///8A////AP///wD6+vpv+vr6//////////////////////////////////////////////////////////////////////////////////////////////////////r6+v/r6+sz////AP///wD///8A+vr6b/r6+v//////////////////////////////////////////////////////////////////////////////////////+vr6/+vr6zP///8A////AP///wD6+vpv+vr6////////////////////////////////////////////////////////////////////////////+vr6/////+vr6zP///8A////AP///wD6+vpv+vr6//////////////////////////////////////////////////////////////////////////////////////////////////////r6+v/r6+sz////AP///wD///8A+vr6b/r6+v//////////////////////////////////////////////////////////////////////////////////////+vr6/+vr6zP///8A////AP///wD6+vpv+vr6////////////////////////////////////////////////////////////////////////////+vr6/////+vr6zP///8A////AP///wD6+vpv+vr6//////////////////////////////////////////////////////////////////////////////////////////////////////r6+v/r6+sz////AP///wD///8A+vr6b/r6+v//////////////////////////////////////////////////////////////////////////////////////+vr6/+vr6zP///8A////AP///wD6+vpv+vr6////////////////////////////////////////////////////////////////////////////+vr6/////+vr6zP///8A////AP///wD6+vpw+vr6//////////////////////////////////////////////////////////////////////////////////////////////////////r6+v/r6+s0////AP///wD///8A+vr6b/r6+v//////////////////////////////////////////////////////////////////////////////////////+vr6/+vr6zT///8A////AP///wD6+vpx+vr6////////////////////////////////////////////////////////////////////////////+vr6/////+vr6zX///8A////AP///wD6+vpx+vr6//////////////////////////////////////////////////////////////////////////////////////////////////////r6+v/r6+s1////AP///wD///8A+vr6cPr6+v//////////////////////////////////////////////////////////////////////////////////////+vr6//r6+jP///8A////AP///wD6+vpk+vr6////////////////////////////////////////////////////////////////////////////+vr6//////r6+lf///8A////AP///wD6+vpR+vr6//////////////////////////////////////////////////////////////////////////////////////////////////////n5+fP6+voB////AP///wD6+voD+vr68f//////////////////////////////////////////////////////////////////////////////////////+vr68vr6+hf///8A////AP///wD6+vok+/v7//////////////////////////////////////////////////////////////////////////////////////7+/v/6+vrQ////AP///wD///8A+vr6S/r6+v//////////////////////////////////////////////////////////////////////////////////////+vr63vr6+gr///8A////AP///wD6+vpp+vr6/////////////////////////////////////////////////////////////////////////////v7+//r6+v/6+vpj////AP///wD///8A+vr6g/r6+v//////////////////////////////////////////////////////////////////////+vr6//39/f/6+vqG////AP///wD///8A+vr6nvr6+v/////////////////////////////////////////////////7+/v//v7+//r6+v/6+vqr+vr6Av///wD///8A////APr6+rn6+vr///////////////////////////////////////39/f/6+vr/+vr6zPr6+mH6+voZ////AP///wD///8A////APr6+tn6+vr//////////////////////////////v7+//r6+v/6+vrW+vr6Uvr6+gf///8A////AP///wD///8A////APr6+vj6+vr//////////////////Pz8//r6+v/6+vr1+vr6S////wD///8A////AP///wD///8A////AP///wD///8A/Pz8Dv39/Zn+/v77+fn5//r6+v/7+/uJ/v7+Av///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A+/v7BP/m5gf6+voB////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A"
    },
    'youtube': {
        title: 'YouTube',
        favicon: 'data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIiIiP+IiIj/iIiI/4iIiP+IiIj/iIiI/4iIiP+IiIj/iIiI/4iIiP+IiIj/iIiI/4iIiP+IiIj/iIiI/4iIiP8AAAAAAAAAAAAAAAAAAAAAAAAAAIiIiP//////////////////////////////////////////////////////////////////////////////////////iIiI/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIiIiP//////////////////////////////////////////////////////////////////////////////////////iIiI/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIiIiP///////////////////////////////////////////////////////////////////////////4iIiP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACIiIj///////////////////////////////////////////////////////////////////////////+IiIj/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAiIiI////////////////////////////////////////////////////////////////////////////iIiI/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIiIiP///////////////////////////////////////////////////////////////////////////4iIiP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACIiIj///////+IiIj/iIiI/4iIiP+IiIj/iIiI/4iIiP+IiIj/iIiI/4iIiP//////iIiI/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIiIiP//////iIiI////////////////////////////////////////////////////////////iIiI/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIiIiP//////iIiI////////////////////////////////////////////////////////////iIiI/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIiIiP//////iIiI/4iIiP+IiIj/iIiI/4iIiP+IiIj/iIiI/4iIiP+IiIj//////4iIiP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACIiIj///////////////////////////////////////////////////////////////////////////+IiIj/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAiIiI/4iIiP+IiIj/iIiI/4iIiP+IiIj/iIiI/4iIiP+IiIj/iIiI/4iIiP+IiIj/iIiI/4iIiP+IiIj/iIiI/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='
    }
};

function setupTabCloaking() {
    const cloakToggle = document.getElementById('cloakToggle');
    const cloakDropdown = document.getElementById('cloakDropdown');
    const cloakButtons = document.querySelectorAll('.cloak-btn');
    
    // Toggle dropdown
    cloakToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        cloakDropdown.classList.toggle('active');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!cloakDropdown.contains(e.target) && e.target !== cloakToggle) {
            cloakDropdown.classList.remove('active');
        }
    });
    
    // Cloak buttons
    cloakButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const cloak = btn.getAttribute('data-cloak');
            applyCloaking(cloak);
            
            // Update active state
            cloakButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update toggle button
            if (cloak !== 'none') {
                cloakToggle.classList.add('active');
            } else {
                cloakToggle.classList.remove('active');
            }
        });
    });
}

function applyCloaking(cloak) {
    const data = cloakData[cloak];
    
    // Update title
    document.title = data.title;
    
    // Update favicon
    let favicon = document.querySelector("link[rel~='icon']");
    if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
    }
    
    if (data.favicon) {
        favicon.href = data.favicon;
    } else {
        favicon.href = '';
    }
    
    // Save preference
    localStorage.setItem('selectedCloak', cloak);
}

function loadSavedCloak() {
    const savedCloak = localStorage.getItem('selectedCloak') || 'none';
    applyCloaking(savedCloak);
    
    // Set active button
    const cloakButtons = document.querySelectorAll('.cloak-btn');
    cloakButtons.forEach(btn => {
        if (btn.getAttribute('data-cloak') === savedCloak) {
            btn.classList.add('active');
        }
    });
    
    // Update toggle button
    if (savedCloak !== 'none') {
        document.getElementById('cloakToggle').classList.add('active');
    }
}

// ===== EJECT BUTTON =====

function setupEjectButton() {
    const ejectButton = document.getElementById('ejectButton');
    
    ejectButton.addEventListener('click', () => {
        // Close the current tab
        window.close();
        
        // If window.close() doesn't work (some browsers block it), try this
        if (!window.closed) {
            window.location.href = 'about:blank';
        }
    });
}
