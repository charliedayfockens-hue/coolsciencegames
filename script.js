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
    setupGameViewer();
    setupRandomButton();
    setupRecentDropdown();
    loadSavedTheme();
    loadSavedCloak();
    setupClock();
    startSessionTimer();
    updateStats();
    updateLeaderboard();
    updateRecentGamesList();
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

// Open game inside the page viewer (NOT a new tab)
function openGame(filename) {
    const game = { filename, displayName: currentGame ? currentGame.displayName : formatGameName(filename) };
    launchGameViewer(game);
}

// Full-screen in-page game viewer
function launchGameViewer(game) {
    if (!game || !game.filename) return;
    currentGame = { filename: game.filename, displayName: game.displayName };

    // Load the game
    document.getElementById('gameFrame').src = 'assets/' + game.filename;
    document.getElementById('viewerGameTitle').textContent = game.displayName;

    // Show viewer (fixed toolbar + fixed frame come alive)
    document.getElementById('gameViewer').classList.add('active');

    // Hide the main page behind it
    var container = document.querySelector('.container');
    if (container) container.style.visibility = 'hidden';
    var lb = document.getElementById('leaderboard');
    if (lb) lb.style.display = 'none';

    // Track this play
    incrementPlayCount(game.filename);
    addRecentGame(game);
    window._gameStartTime = Date.now();
    updateStats();
    updateLeaderboard();
    updateRecentGamesList();
}

function closeGameViewer() {
    // Hide viewer
    document.getElementById('gameViewer').classList.remove('active');

    // Stop the game (clears audio/loops)
    document.getElementById('gameFrame').src = '';

    // Restore main page
    var container = document.querySelector('.container');
    if (container) container.style.visibility = '';
    var lb = document.getElementById('leaderboard');
    if (lb) lb.style.display = 'block';

    // Save time spent in game
    if (window._gameStartTime) {
        var secs = Math.floor((Date.now() - window._gameStartTime) / 1000);
        var prev = parseInt(localStorage.getItem('totalGameSecs') || '0');
        localStorage.setItem('totalGameSecs', (prev + secs).toString());
        window._gameStartTime = null;
    }
    updateStats();
    updateLeaderboard();

    // Also close sidebar if open
    var sidebar = document.getElementById('gameSidebar');
    if (sidebar) sidebar.classList.remove('active');
    var overlay = document.querySelector('.sidebar-overlay');
    if (overlay) overlay.classList.remove('active');
}

function setupGameViewer() {
    // ── Exit button ──────────────────────────────────────
    document.getElementById('exitViewerBtn').addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        closeGameViewer();
    });

    // ── Fullscreen button ────────────────────────────────
    document.getElementById('fsBtn').addEventListener('click', function(e) {
        e.preventDefault();
        const frame = document.getElementById('gameFrame');
        const viewer = document.getElementById('gameViewer');
        if (!document.fullscreenElement) {
            // Try iframe first for true game fullscreen, fall back to viewer div
            (frame.requestFullscreen || viewer.requestFullscreen.bind(viewer)).call(frame).catch(() => {
                viewer.requestFullscreen().catch(err => console.log('Fullscreen failed:', err));
            });
        } else {
            document.exitFullscreen();
        }
    });

    // ── Keyboard shortcuts ───────────────────────────────
    document.addEventListener('keydown', function(e) {
        const viewer = document.getElementById('gameViewer');
        if (!viewer.classList.contains('active')) return;
        if (e.key === 'Escape' && !document.fullscreenElement) {
            closeGameViewer();
        }
    });

    // ── FPS slider ───────────────────────────────────────
    const fpsSlider = document.getElementById('fpsSlider');
    const fpsDisplay = document.getElementById('fpsDisplay');
    fpsSlider.addEventListener('input', function() {
        const val = parseInt(fpsSlider.value);
        fpsDisplay.textContent = (val >= 120) ? '∞' : val;
        try {
            document.getElementById('gameFrame').contentWindow.postMessage({ type: 'fpsLimit', value: val }, '*');
        } catch(err) {}
    });

    // ── Volume slider ─────────────────────────────────────
    const volSlider = document.getElementById('volControl');
    const volDisplay = document.getElementById('volDisplay');
    volSlider.addEventListener('input', function() {
        volDisplay.textContent = volSlider.value + '%';
        try {
            document.getElementById('gameFrame').contentWindow.postMessage({ type: 'volume', value: volSlider.value / 100 }, '*');
        } catch(err) {}
    });
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
            launchGameViewer(currentGame);
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
    // Also track total games played counter
    const total = parseInt(localStorage.getItem('totalGamesPlayed') || '0');
    localStorage.setItem('totalGamesPlayed', (total + 1).toString());
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
    'none':      { title: 'Cool Science Games', favicon: '' },
    'schoology': { title: 'Home | Schoology', favicon: 'https://asset-cdn.schoology.com/sites/all/themes/schoology_theme/favicon.ico' },
    'google-classroom': { title: 'Home', favicon: 'https://ssl.gstatic.com/classroom/favicon.png' },
    'zoom':      { title: 'Zoom', favicon: 'https://zoom.us/favicon.ico' },
    'google':    { title: 'Google', favicon: 'https://www.google.com/favicon.ico' },
    'youtube':   { title: 'YouTube', favicon: 'https://www.youtube.com/favicon.ico' }
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

// ===== LEADERBOARD =====
function toggleLeaderboard() {
    const list = document.getElementById('leaderboardList');
    const arrow = document.getElementById('lbArrow');
    list.classList.toggle('expanded');
    arrow.textContent = list.classList.contains('expanded') ? '▲' : '▼';
}

function updateLeaderboard() {
    const withPlays = allGames.map(g => ({
        name: g.displayName,
        filename: g.filename,
        plays: getGlobalPlayCount(g.filename)
    })).sort((a, b) => b.plays - a.plays).slice(0, 20);

    const list = document.getElementById('leaderboardList');
    if (!withPlays.length || withPlays.every(g => g.plays === 0)) {
        list.innerHTML = '<div style="padding:10px;color:#999;font-size:.85rem;text-align:center">No games played yet!</div>';
        return;
    }
    list.innerHTML = withPlays.filter(g => g.plays > 0).map((g, i) => `
        <div class="leaderboard-item">
            <span class="rank">#${i + 1}</span>
            <span class="name">${g.name}</span>
            <span class="plays">${g.plays}</span>
        </div>`).join('');
}

function getGlobalPlayCount(filename) {
    const data = getGameData(filename);
    return data.playCount || 0;
}

// ===== STATS BAR =====
function updateStats() {
    // Total games played
    const played = parseInt(localStorage.getItem('totalGamesPlayed') || '0');
    const el = document.getElementById('gamesPlayedStat');
    if (el) el.textContent = '🎮 Played: ' + played;

    // Total time: session time + saved game time
    const savedSecs = parseInt(localStorage.getItem('totalGameSecs') || '0');
    const sessionSecs = window._sessionStart ? Math.floor((Date.now() - window._sessionStart) / 1000) : 0;
    // If currently in a game, also count current game time live
    const liveGameSecs = window._gameStartTime ? Math.floor((Date.now() - window._gameStartTime) / 1000) : 0;
    const totalSecs = savedSecs + sessionSecs + liveGameSecs;
    const totalMins = Math.floor(totalSecs / 60);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    const secs = totalSecs % 60;
    let timeStr;
    if (hrs > 0) {
        timeStr = hrs + 'h ' + mins + 'm';
    } else if (totalMins > 0) {
        timeStr = totalMins + 'm ' + secs + 's';
    } else {
        timeStr = secs + 's';
    }
    const tel = document.getElementById('timeStat');
    if (tel) tel.textContent = '⏱ ' + timeStr;
}

function startSessionTimer() {
    window._sessionStart = Date.now();
    // Update every second so time display is live
    setInterval(updateStats, 1000);
}

// ===== RECENT GAMES =====
function addRecentGame(game) {
    let recent = JSON.parse(localStorage.getItem('recentGames') || '[]');
    recent = recent.filter(g => g.filename !== game.filename);
    recent.unshift({ filename: game.filename, displayName: game.displayName });
    if (recent.length > 5) recent = recent.slice(0, 5);
    localStorage.setItem('recentGames', JSON.stringify(recent));
    updateRecentGamesList();
}

function updateRecentGamesList() {
    const recent = JSON.parse(localStorage.getItem('recentGames') || '[]');
    const el = document.getElementById('recentGamesList');
    if (!el) return;
    if (!recent.length) {
        el.innerHTML = '<p style="color:#999;font-size:.85rem">No recent games yet</p>';
        return;
    }
    el.innerHTML = recent.map(g => `
        <button onclick="openGameSidebar('${g.filename}','${g.displayName.replace(/'/g,"\\'")}');document.getElementById('recentDropdown').classList.remove('active');"
            style="display:block;width:100%;text-align:left;padding:8px 10px;margin:3px 0;background:rgba(102,126,234,.1);border:none;border-radius:8px;cursor:pointer;font-weight:600;color:#333;font-size:.9rem;">
            🎮 ${g.displayName}
        </button>`).join('');
}

function setupRecentDropdown() {
    const toggle = document.getElementById('recentToggle');
    const dropdown = document.getElementById('recentDropdown');
    if (!toggle || !dropdown) return;
    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
    });
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== toggle) {
            dropdown.classList.remove('active');
        }
    });
}

// ===== RANDOM GAME =====
function setupRandomButton() {
    const btn = document.getElementById('randomBtn');
    if (!btn) return;
    btn.addEventListener('click', function() {
        if (!allGames || allGames.length === 0) {
            alert('Games are still loading, please wait a moment!');
            return;
        }
        const game = allGames[Math.floor(Math.random() * allGames.length)];
        // Set currentGame so sidebar is aware
        currentGame = { filename: game.filename, displayName: game.displayName };
        launchGameViewer(currentGame);
    });
}

// ===== CLOCK =====
function setupClock() {
    const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    // Check if elements exist (some themes may hide them)
    function tick() {
        const n = new Date();
        const dateEl = document.getElementById('date');
        const clockEl = document.getElementById('clock');
        if (dateEl) dateEl.textContent = `${DAYS[n.getDay()]}, ${MONTHS[n.getMonth()]} ${n.getDate()}, ${n.getFullYear()}`;
        if (clockEl) clockEl.textContent = `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}:${String(n.getSeconds()).padStart(2,'0')}`;
    }
    tick();
    setInterval(tick, 1000);
}



