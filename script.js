// ═══════════════════════════════════════════
// COOL SCIENCE GAMES - script.js
// ═══════════════════════════════════════════
let allGames = [];
let currentGame = null;
let showFavOnly = false;
let sessionStart = Date.now();
let gameTimer = null;
let activeGameStart = null;

// ═══ INIT ═══
document.addEventListener('DOMContentLoaded', () => {
    loadGames();
    setupTheme();
    setupDropdowns();
    setupSearch();
    setupFavorites();
    setupRandom();
    setupEject();
    setupCloaking();
    setupGameViewer();
    setupClock();
    startTimeTracker();
    updateStats();
    updateLeaderboard();
    updateRecentGames();
});

// ═══ LOAD GAMES ═══
async function loadGames() {
    const grid = document.getElementById('gamesGrid');
    grid.innerHTML = '<p style="color:white;text-align:center;padding:40px;grid-column:1/-1;">Loading games...</p>';

    const found = [];

    // Step 1: GitHub API (best for GitHub Pages)
    try {
        const host = window.location.hostname;
        const path = window.location.pathname.split('/').filter(Boolean);
        if (host.includes('github.io') && path.length) {
            const user = host.split('.')[0];
            const repo = path[0];
            const res = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/assets`);
            if (res.ok) {
                const files = await res.json();
                files.forEach(f => {
                    if (f.name.endsWith('.html')) {
                        found.push({ filename: f.name, displayName: prettify(f.name) });
                    }
                });
            }
        }
    } catch(e) {}

    // Step 2: Probe common names
    if (!found.length) {
        const names = ['test.html','game1.html','game2.html','game3.html','game4.html','game5.html',
            'Snake.html','Tetris.html','Pong.html','Breakout.html','2048.html','Flappy_Bird.html',
            'Tic_Tac_Toe.html','Memory_Game.html','Puzzle.html','Physics_Simulator.html',
            'Math_Challenge.html','platformer.html','racing.html','shooter.html','rpg.html',
            'runner.html','clicker.html','tower_defense.html'];
        await Promise.all(names.map(async n => {
            try {
                const r = await fetch(`assets/${n}`, { method:'HEAD' });
                if (r.ok) found.push({ filename:n, displayName:prettify(n) });
            } catch(e) {}
        }));
    }

    allGames = found;
    renderGames(found);
    updateLeaderboard();
    document.getElementById('gameCounter').textContent = `${found.length} Games`;
}

function prettify(filename) {
    return filename.replace('.html','').replace(/[_-]/g,' ')
        .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ═══ RENDER GAMES ═══
function renderGames(list) {
    const grid = document.getElementById('gamesGrid');
    const noRes = document.getElementById('noResults');
    document.getElementById('gameCounter').textContent = `${list.length} Games`;

    if (!list.length) {
        grid.innerHTML = '';
        noRes.style.display = 'block';
        return;
    }
    noRes.style.display = 'none';
    grid.innerHTML = '';

    list.forEach(game => {
        const btn = document.createElement('button');
        btn.className = 'game-button' + (isFav(game.filename) ? ' favorited' : '');
        btn.textContent = (isFav(game.filename) ? '⭐ ' : '') + game.displayName;
        btn.onclick = () => launchGame(game);
        grid.appendChild(btn);
    });
}

// ═══ GAME VIEWER ═══
function setupGameViewer() {
    document.getElementById('exitGameBtn').onclick = exitGame;
    document.getElementById('fullscreenBtn').onclick = toggleFullscreen;
    document.getElementById('minimizeBtn').onclick = toggleMinimize;

    document.getElementById('volumeControl').oninput = (e) => {
        document.getElementById('volumeVal').textContent = e.target.value + '%';
        // Attempt to set iframe volume via postMessage
        const frame = document.getElementById('gameFrame');
        try { frame.contentWindow.postMessage({ volume: e.target.value / 100 }, '*'); } catch(e) {}
    };

    // F11 fullscreen, Escape exit
    document.addEventListener('keydown', e => {
        if (document.getElementById('gameViewer').classList.contains('active')) {
            if (e.key === 'F11') { e.preventDefault(); toggleFullscreen(); }
            if (e.key === 'Escape' && document.fullscreenElement) document.exitFullscreen();
        }
    });
}

function launchGame(game) {
    currentGame = game;
    document.getElementById('viewerTitle').textContent = game.displayName;
    document.getElementById('gameFrame').src = `assets/${game.filename}`;

    // Hide menu, show viewer (smooth)
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('leaderboard').style.display = 'none';
    setTimeout(() => {
        document.getElementById('gameViewer').classList.add('active');
    }, 50);

    // Track play
    incrementPlays(game.filename);
    addRecentGame(game);
    activeGameStart = Date.now();

    // Update leaderboard
    updateLeaderboard();
    updateStats();
}

function exitGame() {
    const viewer = document.getElementById('gameViewer');
    viewer.classList.remove('active', 'minimized');

    // Track time spent in game
    if (activeGameStart) {
        const spent = Math.floor((Date.now() - activeGameStart) / 1000);
        const prev = parseInt(localStorage.getItem('totalGameSeconds') || '0');
        localStorage.setItem('totalGameSeconds', (prev + spent).toString());
        activeGameStart = null;
    }

    // Restore menu
    setTimeout(() => {
        document.getElementById('gameFrame').src = '';
        document.getElementById('mainMenu').classList.remove('hidden');
        document.getElementById('leaderboard').style.display = 'block';
        updateStats();
        updateLeaderboard();
    }, 50);
}

function toggleFullscreen() {
    const wrap = document.getElementById('gameViewer');
    if (!document.fullscreenElement) {
        wrap.requestFullscreen().catch(e => console.log(e));
    } else {
        document.exitFullscreen();
    }
}

function toggleMinimize() {
    const viewer = document.getElementById('gameViewer');
    viewer.classList.toggle('minimized');
    document.getElementById('minimizeBtn').textContent = viewer.classList.contains('minimized') ? '🗖 Max' : '🗕 Min';
    document.getElementById('mainMenu').classList.toggle('hidden', !viewer.classList.contains('minimized'));
    document.getElementById('leaderboard').style.display = viewer.classList.contains('minimized') ? 'block' : 'none';
}

// ═══ STATS ═══
function updateStats() {
    // Games played
    const played = parseInt(localStorage.getItem('gamesPlayedCount') || '0');
    document.getElementById('gamesPlayedCounter').textContent = `🎮 Played: ${played}`;

    // Time on site + in games
    const sessionSecs = Math.floor((Date.now() - sessionStart) / 1000);
    const gameSecs = parseInt(localStorage.getItem('totalGameSeconds') || '0');
    const totalMins = Math.floor((sessionSecs + gameSecs) / 60);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${totalMins}m`;
    document.getElementById('timeSpentCounter').textContent = `⏱ ${timeStr}`;
}

function startTimeTracker() {
    setInterval(updateStats, 10000); // every 10 seconds
}

// ═══ DATA STORAGE ═══
function getPlays(filename) {
    return parseInt(localStorage.getItem(`plays_${filename}`) || '0');
}
function incrementPlays(filename) {
    const prev = getPlays(filename);
    localStorage.setItem(`plays_${filename}`, (prev + 1).toString());
    const total = parseInt(localStorage.getItem('gamesPlayedCount') || '0');
    localStorage.setItem('gamesPlayedCount', (total + 1).toString());
}

function isFav(filename) {
    return localStorage.getItem(`fav_${filename}`) === '1';
}
function toggleFav(filename) {
    if (isFav(filename)) {
        localStorage.removeItem(`fav_${filename}`);
    } else {
        localStorage.setItem(`fav_${filename}`, '1');
    }
}

// ═══ RECENT GAMES ═══
function addRecentGame(game) {
    let recent = JSON.parse(localStorage.getItem('recentGames') || '[]');
    recent = recent.filter(g => g.filename !== game.filename);
    recent.unshift({ filename: game.filename, displayName: game.displayName });
    if (recent.length > 5) recent = recent.slice(0, 5);
    localStorage.setItem('recentGames', JSON.stringify(recent));
    updateRecentGames();
}

function updateRecentGames() {
    const recent = JSON.parse(localStorage.getItem('recentGames') || '[]');
    const list = document.getElementById('recentList');

    if (!recent.length) {
        list.innerHTML = '<p style="padding:10px;color:#999;font-size:0.9rem;">No recent games yet</p>';
        return;
    }

    list.innerHTML = recent.map(g => `
        <div class="recent-item" onclick="launchGameByFilename('${g.filename}')">
            <span>🎮</span>${g.displayName}
        </div>
    `).join('');
}

window.launchGameByFilename = function(filename) {
    const game = allGames.find(g => g.filename === filename);
    if (game) launchGame(game);
};

// ═══ LEADERBOARD ═══
function toggleLeaderboard() {
    const body = document.getElementById('leaderboardList');
    const arrow = document.getElementById('lbArrow');
    body.classList.toggle('open');
    arrow.textContent = body.classList.contains('open') ? '▲' : '▼';
}

function updateLeaderboard() {
    const withPlays = allGames.map(g => ({ ...g, plays: getPlays(g.filename) }))
        .sort((a,b) => b.plays - a.plays)
        .slice(0, 20);

    const list = document.getElementById('leaderboardList');

    if (!withPlays.length || withPlays.every(g => g.plays === 0)) {
        list.innerHTML = '<p style="padding:12px 16px;color:#999;font-size:0.85rem;">No games played yet!</p>';
        return;
    }

    list.innerHTML = withPlays.filter(g => g.plays > 0).map((g, i) => `
        <div class="lb-item">
            <span class="lb-rank">#${i+1}</span>
            <span class="lb-name">${g.displayName}</span>
            <span class="lb-plays">${g.plays}</span>
        </div>
    `).join('');
}

// ═══ SEARCH ═══
function setupSearch() {
    document.getElementById('searchBar').oninput = e => {
        const q = e.target.value.toLowerCase();
        const filtered = allGames.filter(g => g.displayName.toLowerCase().includes(q));
        renderGames(filtered);
    };
}

// ═══ FAVORITES ═══
function setupFavorites() {
    document.getElementById('favoritesToggle').onclick = () => {
        showFavOnly = !showFavOnly;
        document.getElementById('favoritesToggle').textContent = showFavOnly ? '🎮 All Games' : '⭐ Favorites';
        renderGames(showFavOnly ? allGames.filter(g => isFav(g.filename)) : allGames);
    };
}

// ═══ RANDOM GAME ═══
function setupRandom() {
    document.getElementById('randomBtn').onclick = () => {
        if (!allGames.length) return;
        const game = allGames[Math.floor(Math.random() * allGames.length)];
        launchGame(game);
    };
}

// ═══ EJECT ═══
function setupEject() {
    document.getElementById('ejectButton').onclick = () => {
        window.close();
        if (!window.closed) window.location.href = 'about:blank';
    };
}

// ═══ DROPDOWNS ═══
function setupDropdowns() {
    const pairs = [
        ['themeToggle', 'themeDropdown'],
        ['cloakToggle', 'cloakDropdown'],
        ['recentToggle', 'recentDropdown'],
    ];
    pairs.forEach(([btnId, ddId]) => {
        document.getElementById(btnId).onclick = e => {
            e.stopPropagation();
            const dd = document.getElementById(ddId);
            const isOpen = dd.classList.contains('open');
            // Close all
            document.querySelectorAll('.hdr-dropdown').forEach(d => d.classList.remove('open'));
            if (!isOpen) dd.classList.add('open');
        };
    });
    document.addEventListener('click', () => {
        document.querySelectorAll('.hdr-dropdown').forEach(d => d.classList.remove('open'));
    });
    document.querySelectorAll('.hdr-dropdown').forEach(dd => {
        dd.addEventListener('click', e => e.stopPropagation());
    });
}

// ═══ THEMES ═══
function setupTheme() {
    const saved = localStorage.getItem('theme') || 'default';
    applyTheme(saved);

    document.querySelectorAll('.theme-btn').forEach(btn => {
        if (btn.dataset.theme === saved) btn.classList.add('active');
        btn.onclick = () => {
            applyTheme(btn.dataset.theme);
            document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('customPanel').style.display = btn.dataset.theme === 'custom' ? 'block' : 'none';
        };
    });

    document.getElementById('bgColor').oninput = applyCustom;
    document.getElementById('bgShade').oninput = applyCustom;
    document.getElementById('fontPicker').onchange = applyCustom;

    // Restore custom settings
    if (saved === 'custom') {
        document.getElementById('bgColor').value = localStorage.getItem('c1') || '#667eea';
        document.getElementById('bgShade').value = localStorage.getItem('c2') || '#764ba2';
        document.getElementById('fontPicker').value = localStorage.getItem('cf') || "'Segoe UI',sans-serif";
        document.getElementById('customPanel').style.display = 'block';
        applyCustom();
    }

    // Restore saved Matrix canvas state
    if (saved === 'matrix') startMatrixCanvas();
}

function applyTheme(theme) {
    // Clear body classes
    body.className = '';
    document.body.className = '';
    if (theme !== 'default') document.body.classList.add(`theme-${theme}`);

    // Clear particles
    clearParticles();

    // Start special effects
    if (theme === 'matrix') startMatrixCanvas();
    else stopMatrixCanvas();

    if (theme === 'galaxy') spawnParticles('star', 12);
    if (theme === 'ice-kingdom') spawnParticles('snow', 15);
    if (theme === 'snowy-night') spawnParticles('snow', 18);
    if (theme === 'forest-fantasy') spawnParticles('leaf', 10);
    if (theme === 'fire-lava') spawnParticles('fire', 8);
    if (theme === 'steampunk') spawnParticles('gear', 3);

    localStorage.setItem('theme', theme);
}

function applyCustom() {
    const c1 = document.getElementById('bgColor').value;
    const c2 = document.getElementById('bgShade').value;
    const f = document.getElementById('fontPicker').value;
    document.body.classList.add('theme-custom');
    document.documentElement.style.setProperty('--bg1', c1);
    document.documentElement.style.setProperty('--bg2', c2);
    document.documentElement.style.setProperty('--font', f);
    localStorage.setItem('c1', c1);
    localStorage.setItem('c2', c2);
    localStorage.setItem('cf', f);
}

// ═══ MATRIX CANVAS ═══
let matrixInterval = null;
function startMatrixCanvas() {
    const canvas = document.getElementById('matrixCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const cols = Math.floor(canvas.width / 16);
    const drops = Array(cols).fill(1);
    const chars = '0101001010110100100101011010010010110100101001011010010010'.split('');

    if (matrixInterval) clearInterval(matrixInterval);
    matrixInterval = setInterval(() => {
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#00ff00';
        ctx.font = '14px Share Tech Mono, monospace';

        drops.forEach((y, i) => {
            const char = chars[Math.floor(Math.random() * chars.length)];
            ctx.fillText(char, i * 16, y * 16);
            if (y * 16 > canvas.height && Math.random() > 0.975) drops[i] = 0;
            drops[i]++;
        });
    }, 50);
}

function stopMatrixCanvas() {
    if (matrixInterval) { clearInterval(matrixInterval); matrixInterval = null; }
    const canvas = document.getElementById('matrixCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ═══ PARTICLES ═══
function clearParticles() {
    document.getElementById('particles').innerHTML = '';
}

function spawnParticles(type, count) {
    clearParticles();
    const container = document.getElementById('particles');

    const emojis = {
        snow: ['❄️','❅','❆','*'],
        leaf: ['🍃','🍂','🍁'],
        fire: ['🔥','✨','💥'],
        gear: ['⚙️'],
        star: ['✦','✧','✶','✷','✸']
    };

    for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = `${type}-particle`;
        el.textContent = emojis[type][Math.floor(Math.random() * emojis[type].length)];

        // Random position
        el.style.left = Math.random() * 100 + 'vw';
        el.style.top = type === 'fire' || type === 'gear' ? 'auto' : '-30px';
        if (type === 'fire') el.style.bottom = Math.random() * 20 + 'vh';
        if (type === 'gear') {
            el.style.top = Math.random() * 80 + 'vh';
            el.style.left = Math.random() * 90 + 'vw';
        }

        // Random duration/delay
        const dur = (8 + Math.random() * 12).toFixed(1);
        const delay = (Math.random() * 8).toFixed(1);
        el.style.animationDuration = dur + 's';
        el.style.animationDelay = delay + 's';
        el.style.animationIterationCount = 'infinite';

        // Random size
        el.style.fontSize = (1 + Math.random() * 1.5).toFixed(1) + 'rem';

        // Stars: random direction
        if (type === 'star') {
            el.style.setProperty('--dx', (Math.random() * 4 - 2).toFixed(1));
            el.style.setProperty('--dy', (Math.random() * 4 - 2).toFixed(1));
            el.style.top = Math.random() * 100 + 'vh';
        }

        container.appendChild(el);
    }
}

// ═══ CLOAKING ═══
const cloaks = {
    none:      { title: 'Cool Science Games', icon: '' },
    google:    { title: 'Google', icon: 'https://www.google.com/favicon.ico' },
    youtube:   { title: 'YouTube', icon: 'https://www.youtube.com/favicon.ico' },
    classroom: { title: 'Home - Google Classroom', icon: 'https://ssl.gstatic.com/classroom/favicon.png' },
    zoom:      { title: 'Zoom Meeting', icon: 'https://zoom.us/favicon.ico' },
    schoology: { title: 'Home | Schoology', icon: 'https://asset-cdn.schoology.com/sites/all/themes/schoology_theme/favicon.ico' }
};

function setupCloaking() {
    document.querySelectorAll('.cloak-item').forEach(btn => {
        btn.onclick = () => {
            applyCloak(btn.dataset.cloak);
            document.querySelectorAll('.cloak-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
    });
    applyCloak(localStorage.getItem('cloak') || 'none');
}

function applyCloak(key) {
    const d = cloaks[key] || cloaks.none;
    document.title = d.title;
    let link = document.querySelector("link[rel*='icon']");
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.href = d.icon;
    localStorage.setItem('cloak', key);
    // Mark active button
    document.querySelectorAll('.cloak-item').forEach(b => {
        b.classList.toggle('active', b.dataset.cloak === key);
    });
}

// ═══ CLOCK ═══
function setupClock() {
    const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    function tick() {
        const n = new Date();
        const h = String(n.getHours()).padStart(2,'0');
        const m = String(n.getMinutes()).padStart(2,'0');
        const s = String(n.getSeconds()).padStart(2,'0');
        const day = DAYS[n.getDay()];
        const mo = MONTHS[n.getMonth()];
        const d = n.getDate();
        const yr = n.getFullYear();
        document.getElementById('dateClock').textContent = `${day}, ${mo} ${d}, ${yr} — ${h}:${m}:${s}`;
    }
    tick();
    setInterval(tick, 1000);
}
