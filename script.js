// List of game files in the assets folder
// Update this array with the actual filenames from your assets folder
const gameFiles = [
    'Physics_Simulator.html',
    'Chemistry_Lab.html',
    'Biology_Quiz.html',
    'Math_Challenge.html',
    'Space_Explorer.html',
    'Robot_Builder.html',
    'Energy_Game.html',
    'Periodic_Table.html',
    'Solar_System.html',
    'DNA_Puzzle.html',
    'Gravity_Test.html',
    'Circuit_Builder.html'
];

let allGames = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadGames();
    setupSearch();
});

// Load and display all games
function loadGames() {
    const gamesGrid = document.getElementById('gamesGrid');
    gamesGrid.innerHTML = '<div class="loading">Loading games...</div>';
    
    // Convert filenames to game objects
    allGames = gameFiles.map((filename, index) => {
        return {
            filename: filename,
            displayName: formatGameName(filename)
        };
    });
    
    // Display games after a short delay for smooth animation
    setTimeout(() => {
        displayGames(allGames);
    }, 300);
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

// Optional: Fetch games automatically from assets folder
// This requires a server-side solution or a manifest file
// For GitHub Pages, you'll need to manually update the gameFiles array above

/*
// Alternative: Load from a manifest.json file
async function loadGamesFromManifest() {
    try {
        const response = await fetch('assets/manifest.json');
        const data = await response.json();
        gameFiles = data.games;
        loadGames();
    } catch (error) {
        console.error('Error loading manifest:', error);
        loadGames(); // Fall back to hardcoded list
    }
}
*/
