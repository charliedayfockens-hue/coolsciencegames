// This will be populated automatically by scanning the assets folder
let allGames = [];
let currentTheme = 'default';

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadGamesAutomatically();
    setupSearch();
    setupThemeChanger();
    loadSavedTheme();
});

// Automatically load games from assets folder
async function loadGamesAutomatically() {
    const gamesGrid = document.getElementById('gamesGrid');
    gamesGrid.innerHTML = '<div class="loading">Looking for games in assets folder...</div>';
    
    // Method 1: Try GitHub API first (most reliable for GitHub Pages)
    try {
        // Get the repo path from the URL
        const path = window.location.pathname;
        const pathParts = path.split('/').filter(p => p);
        
        // Check if we're on GitHub Pages
        if (pathParts.length >= 2 && window.location.hostname.includes('github.io')) {
            const username = pathParts[0];
            const repo = pathParts[1];
            
            const apiUrl = `https://api.github.com/repos/${username}/${repo}/contents/assets`;
            const response = await fetch(apiUrl);
            
            if (response.ok) {
                const files = await response.json();
                const gameFiles = files
                    .filter(file => file.type === 'file' && file.name.endsWith('.html'))
                    .map(file => file.name);
                
                if (gameFiles.length > 0) {
                    allGames = gameFiles.map(filename => ({
                        filename: filename,
                        displayName: formatGameName(filename)
                    }));
                    displayGames(allGames);
                    return;
                }
            }
        }
    } catch (error) {
        console.log('GitHub API method failed:', error);
    }
    
    // Method 2: Try direct folder listing
    try {
        const response = await fetch('assets/');
        if (response.ok) {
            const text = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            const links = doc.querySelectorAll('a');
            
            const gameFiles = [];
            links.forEach(link => {
                const href = link.getAttribute('href');
                if (href && href.endsWith('.html')) {
                    // Get just the filename without path
                    const filename = href.split('/').pop();
                    if (filename !== 'index.html') {
                        gameFiles.push(filename);
                    }
                }
            });
            
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
        console.log('Direct folder listing failed:', error);
    }
    
    // Method 3: Quick smart check - only check a few common patterns
    gamesGrid.innerHTML = '<div class="loading">Searching for games... this will take a moment...</div>';
    const foundGames = await quickGameSearch();
    
    if (foundGames.length > 0) {
        allGames = foundGames.map(filename => ({
            filename: filename,
            displayName: formatGameName(filename)
        }));
        displayGames(allGames);
    } else {
        gamesGrid.innerHTML = `
            <div class="loading" style="text-align: center;">
                <p style="font-size: 1.4rem; margin-bottom: 15px;">😢 No games found in assets folder!</p>
                <p style="font-size: 1rem; opacity: 0.9; margin-bottom: 10px;">Make sure:</p>
                <p style="font-size: 0.9rem; opacity: 0.8;">1. Files are in the 'assets' folder</p>
                <p style="font-size: 0.9rem; opacity: 0.8;">2. Files end with .html</p>
                <p style="font-size: 0.9rem; opacity: 0.8;">3. You've pushed to GitHub</p>
                <p style="font-size: 0.8rem; margin-top: 15px; opacity: 0.7;">Current path: ${window.location.href}</p>
            </div>
        `;
    }
}

// Quick search for common game patterns
async function quickGameSearch() {
    const possibleNames = [];
    
    // Check numbered games (1-20 only)
    for (let i = 1; i <= 20; i++) {
        possibleNames.push(`game${i}.html`);
        possibleNames.push(`game-${i}.html`);
        possibleNames.push(`game_${i}.html`);
    }
    
    // Check common single word names
    const commonWords = ['math', 'science', 'physics', 'chemistry', 'biology', 
                        'space', 'puzzle', 'quiz', 'test', 'adventure', 'racing',
                        'shooter', 'platformer', 'arcade', 'snake', 'pong', 'tetris'];
    
    commonWords.forEach(word => {
        possibleNames.push(`${word}.html`);
        possibleNames.push(`${word}-game.html`);
        possibleNames.push(`${word}_game.html`);
    });
    
    // Add the example games
    possibleNames.push('Physics_Simulator.html');
    possibleNames.push('Math_Challenge.html');
    possibleNames.push('index.html');
    
    const foundGames = [];
    
    // Check in batches of 5 to be faster
    for (let i = 0; i < possibleNames.length; i += 5) {
        const batch = possibleNames.slice(i, i + 5);
        const results = await Promise.all(batch.map(name => checkGameExists(name)));
        
        results.forEach((exists, idx) => {
            if (exists && batch[idx] !== 'index.html') {
                foundGames.push(batch[idx]);
            }
        });
    }
    
    return foundGames;
}

// Check if a game file exists
async function checkGameExists(filename) {
    try {
        const response = await fetch(`assets/${filename}`, { method: 'HEAD' });
        return response.ok;
    } catch (e) {
        return false;
    }
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
        
        // Open game in new tab when clicked
        button.addEventListener('click', () => {
            openGame(game.filename);
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
    const themePanel = document.getElementById('themePanel');
    const closePanel = document.getElementById('closeThemePanel');
    const themeButtons = document.querySelectorAll('.theme-btn');
    const customColorPanel = document.getElementById('customColorPanel');
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'theme-overlay';
    document.body.appendChild(overlay);
    
    // Toggle panel
    themeToggle.addEventListener('click', () => {
        themePanel.classList.add('active');
        overlay.classList.add('active');
    });
    
    closePanel.addEventListener('click', () => {
        themePanel.classList.remove('active');
        overlay.classList.remove('active');
    });
    
    overlay.addEventListener('click', () => {
        themePanel.classList.remove('active');
        overlay.classList.remove('active');
    });
    
    // Theme buttons
    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
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
