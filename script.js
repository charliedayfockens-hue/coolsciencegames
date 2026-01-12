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
    gamesGrid.innerHTML = '<div class="loading">Scanning for games...</div>';
    
    try {
        // Method 1: Try to fetch the assets directory listing
        const response = await fetch('assets/');
        const text = await response.text();
        
        // Parse HTML to find .html files
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const links = doc.querySelectorAll('a');
        
        const gameFiles = [];
        links.forEach(link => {
            const href = link.getAttribute('href');
            // Only include .html files, exclude index.html if present
            if (href && href.endsWith('.html') && href !== 'index.html') {
                gameFiles.push(href.split('/').pop()); // Get just the filename
            }
        });
        
        if (gameFiles.length > 0) {
            allGames = gameFiles.map(filename => ({
                filename: filename,
                displayName: formatGameName(filename)
            }));
            displayGames(allGames);
        } else {
            throw new Error('No games found via directory listing');
        }
    } catch (error) {
        console.log('Direct folder scanning not available, using GitHub API method...');
        
        // Method 2: Try GitHub API (works for GitHub Pages)
        try {
            // Extract repo info from URL
            const pathParts = window.location.pathname.split('/').filter(p => p);
            const username = pathParts[0] || 'your-username';
            const repo = pathParts[1] || 'your-repo';
            
            const apiUrl = `https://api.github.com/repos/${username}/${repo}/contents/assets`;
            const response = await fetch(apiUrl);
            const files = await response.json();
            
            if (Array.isArray(files)) {
                const gameFiles = files
                    .filter(file => file.name.endsWith('.html') && file.name !== 'index.html')
                    .map(file => file.name);
                
                allGames = gameFiles.map(filename => ({
                    filename: filename,
                    displayName: formatGameName(filename)
                }));
                
                displayGames(allGames);
            } else {
                throw new Error('GitHub API returned unexpected format');
            }
        } catch (apiError) {
            console.log('GitHub API method failed, trying brute force detection...');
            
            // Method 3: Brute force - try common filenames
            await detectGamesBruteForce();
        }
    }
}

// Brute force detection - tries to HEAD request common game filenames
async function detectGamesBruteForce() {
    const gamesGrid = document.getElementById('gamesGrid');
    gamesGrid.innerHTML = '<div class="loading">Searching for games...</div>';
    
    // Generate possible game filenames to check
    const possibleNames = [];
    
    // Try numbered games
    for (let i = 1; i <= 50; i++) {
        possibleNames.push(`game${i}.html`);
        possibleNames.push(`game-${i}.html`);
        possibleNames.push(`game_${i}.html`);
    }
    
    // Try common game name patterns
    const commonPrefixes = ['math', 'science', 'physics', 'chemistry', 'biology', 'space', 
                           'puzzle', 'quiz', 'challenge', 'simulator', 'lab', 'adventure',
                           'racing', 'shooter', 'platformer', 'arcade', 'casual'];
    
    commonPrefixes.forEach(prefix => {
        possibleNames.push(`${prefix}.html`);
        possibleNames.push(`${prefix}-game.html`);
        possibleNames.push(`${prefix}_game.html`);
        for (let i = 1; i <= 10; i++) {
            possibleNames.push(`${prefix}${i}.html`);
            possibleNames.push(`${prefix}-${i}.html`);
            possibleNames.push(`${prefix}_${i}.html`);
        }
    });
    
    // Add the example games
    possibleNames.push('Physics_Simulator.html');
    possibleNames.push('Math_Challenge.html');
    
    const foundGames = [];
    const checkBatch = 10; // Check 10 files at a time
    
    for (let i = 0; i < possibleNames.length; i += checkBatch) {
        const batch = possibleNames.slice(i, i + checkBatch);
        const checks = batch.map(name => checkGameExists(name));
        const results = await Promise.all(checks);
        
        results.forEach((exists, idx) => {
            if (exists) {
                foundGames.push(batch[idx]);
            }
        });
        
        // Update progress
        gamesGrid.innerHTML = `<div class="loading">Found ${foundGames.length} games... (${Math.min(i + checkBatch, possibleNames.length)}/${possibleNames.length} checked)</div>`;
    }
    
    if (foundGames.length > 0) {
        allGames = foundGames.map(filename => ({
            filename: filename,
            displayName: formatGameName(filename)
        }));
        displayGames(allGames);
    } else {
        gamesGrid.innerHTML = `
            <div class="loading" style="text-align: center;">
                <p style="font-size: 1.4rem; margin-bottom: 15px;">No games found! 😢</p>
                <p style="font-size: 1rem; opacity: 0.9;">Add .html game files to the 'assets' folder in your repository.</p>
                <p style="font-size: 0.9rem; margin-top: 10px; opacity: 0.8;">
                    The website will automatically detect them once you add them!
                </p>
            </div>
        `;
    }
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
