/* script.js – FIXED: Opens games as webpages, not source code */
const DEV_CODE = 'dev123';               // CHANGE THIS to any secret you want
const STORAGE_KEY = 'gameHubGames';
const ASSETS_URL = './assets/';          // FIXED: Relative path for browser

document.addEventListener('DOMContentLoaded', () => {
    const listEl = document.getElementById('game-list');
    const devEntry = document.getElementById('dev-entry');
    const devPanel = document.getElementById('dev-panel');
    const enterBtn = document.getElementById('enter-btn');
    const devCodeInput = document.getElementById('dev-code');
    const saveBtn = document.getElementById('save-game');
    const exitBtn = document.getElementById('exit-dev');
    const gameNameInput = document.getElementById('game-name');

    // ---------- LOAD & SCAN GAMES ----------
    const loadGames = () => {
        const saved = localStorage.getItem(STORAGE_KEY);
        const savedGames = saved ? JSON.parse(saved) : [];
        
        // ALSO SCAN assets/ folder automatically (for manual additions)
        scanAssetsFolder(savedGames).then(allGames => {
            // Remove duplicates (saved takes priority)
            const uniqueGames = allGames.filter((game, index, self) => 
                index === self.findIndex(g => g.name === game.name)
            );
            renderGames(uniqueGames);
        });
    };

    // ---------- SCAN ASSETS FOLDER (automatic detection) ----------
    const scanAssetsFolder = async (savedGames) => {
        const games = [...savedGames];
        
        try {
            // List all items in assets/
            const assetsDir = await getDirectoryContents('./assets/');
            for (const item of assetsDir) {
                const name = item.name;
                
                if (item.type === 'directory') {
                    // Folder: look for any .html file
                    const folderContents = await getDirectoryContents(`./assets/${name}/`);
                    const htmlFile = folderContents.find(f => f.name.toLowerCase().endsWith('.html'));
                    if (htmlFile && !games.some(g => g.name === name)) {
                        games.push({
                            name: name,
                            url: `./assets/${name}/${htmlFile.name}`  // FIXED: Browser path
                        });
                    }
                } else if (item.name.toLowerCase().endsWith('.html')) {
                    // Single HTML file
                    const gameName = item.name.replace(/\.html$/i, '');
                    if (!games.some(g => g.name === gameName)) {
                        games.push({
                            name: gameName,
                            url: `./assets/${item.name}`  // FIXED: Browser path
                        });
                    }
                }
            }
        } catch (e) {
            console.warn('Could not scan assets folder:', e);
        }
        
        return games;
    };

    // ---------- RENDER GAMES ----------
    const renderGames = (games) => {
        listEl.innerHTML = '';
        if (games.length === 0) {
            listEl.innerHTML = '<p class="loading">No games yet – activate Dev Mode to add some!</p>';
            return;
        }
        const frag = document.createDocumentFragment();
        games.sort((a,b) => a.name.localeCompare(b.name));
        games.forEach(g => {
            const card = document.createElement('div');
            card.className = 'game-card';
            const a = document.createElement('a');
            a.href = g.url;           // FIXED: Proper relative path
            a.target = '_blank';
            a.rel = 'noopener noreferrer';  // Security
            a.textContent = g.name;
            card.appendChild(a);
            frag.appendChild(card);
        });
        listEl.appendChild(frag);
    };

    // ---------- DEV MODE ----------
    enterBtn.addEventListener('click', () => {
        if (devCodeInput.value === DEV_CODE) {
            devEntry.classList.add('hidden');
            devPanel.classList.remove('hidden');
            devCodeInput.value = '';
            alert('Dev Mode Activated!');
        } else {
            alert('Wrong code!');
        }
    });

    exitBtn.addEventListener('click', () => {
        devPanel.classList.add('hidden');
        devEntry.classList.remove('hidden');
    });

    // ---------- SAVE NEW GAME ----------
    saveBtn.addEventListener('click', () => {
        const rawName = gameNameInput.value.trim();
        if (!rawName) { alert('Enter a name!'); return; }

        // Sanitize name
        const name = rawName.replace(/[^a-zA-Z0-9\-_]/g, '');
        if (!name) { alert('Invalid name – use letters, numbers, - or _'); return; }

        const type = document.querySelector('input[name="type"]:checked').value;
        let url = '';

        if (type === 'folder') {
            url = `./assets/${name}/index.html`;  // FIXED: Browser path
            const html = `<!DOCTYPE html>
<html>
<head>
    <title>${name}</title>
    <meta charset="UTF-8">
    <style>body { font-family: Arial; text-align: center; padding: 50px; background: #222; color: white; }</style>
</head>
<body>
    <h1>${name}</h1>
    <p>🎮 Game loaded successfully!</p>
    <p><small>Edit this file: <code>assets/${name}/index.html</code></small></p>
    <script>console.log('${name} game started!');</script>
</body>
</html>`;
            downloadFile(`${name}/index.html`, html);
        } else {
            url = `./assets/${name}.html`;  // FIXED: Browser path
            const html = `<!DOCTYPE html>
<html>
<head>
    <title>${name}</title>
    <meta charset="UTF-8">
    <style>body { font-family: Arial; text-align: center; padding: 50px; background: #222; color: white; }</style>
</head>
<body>
    <h1>${name}</h1>
    <p>🎮 Game loaded successfully!</p>
    <p><small>Edit this file: <code>assets/${name}.html</code></small></p>
    <script>console.log('${name} game started!');</script>
</body>
</html>`;
            downloadFile(`${name}.html`, html);
        }

        // Save to localStorage
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        if (saved.some(g => g.name === name)) {
            alert('Game with this name already exists!');
            return;
        }
        saved.push({ name, url });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

        gameNameInput.value = '';
        loadGames();
        alert(`"${name}" added! Place the downloaded file in assets/ and refresh.`);
    });

    // ---------- DOWNLOAD HELPER ----------
    const downloadFile = (filename, content) => {
        const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // ---------- FOLDER SCANNING HELPER (File System Access API) ----------
    const getDirectoryContents = async (path) => {
        if ('showDirectoryPicker' in window) {
            // Modern browsers: use File System Access API
            try {
                const dirHandle = await window.showDirectoryPicker();
                return await scanDirHandle(dirHandle);
            } catch (e) {
                return [];
            }
        }
        return []; // Fallback: manual folder management
    };

    const scanDirHandle = async (dirHandle) => {
        const files = [];
        for await (const [name, handle] of dirHandle.entries()) {
            if (handle.kind === 'file') {
                const file = await handle.getFile();
                files.push({ name, type: 'file' });
            }
        }
        return files;
    };

    // ---------- INITIAL LOAD ----------
    loadGames();
});
