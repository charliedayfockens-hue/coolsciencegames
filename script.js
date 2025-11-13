/* script.js */
const DEV_CODE = 'dev123';               // CHANGE THIS to any secret you want
const STORAGE_KEY = 'gameHubGames';
const ASSETS_URL = 'assets/';            // relative to index.html

document.addEventListener('DOMContentLoaded', () => {
    const listEl = document.getElementById('game-list');
    const devEntry = document.getElementById('dev-entry');
    const devPanel = document.getElementById('dev-panel');
    const enterBtn = document.getElementById('enter-btn');
    const devCodeInput = document.getElementById('dev-code');
    const saveBtn = document.getElementById('save-game');
    const exitBtn = document.getElementById('exit-dev');
    const gameNameInput = document.getElementById('game-name');

    // ---------- LOAD GAMES ----------
    const loadGames = () => {
        const saved = localStorage.getItem(STORAGE_KEY);
        const games = saved ? JSON.parse(saved) : [];
        renderGames(games);
    };

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
            a.href = g.url;
            a.target = '_blank';
            a.rel = 'noopener';
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

        // Sanitize name: letters, numbers, dash, underscore only
        const name = rawName.replace(/[^a-zA-Z0-9\-_]/g, '');
        if (!name) { alert('Invalid name – use letters, numbers, - or _'); return; }

        const type = document.querySelector('input[name="type"]:checked').value;
        let url = '';
        let folder = '';

        if (type === 'folder') {
            folder = `${ASSETS_URL}${name}/`;
            url = `${folder}index.html`;
            // Create minimal index.html content
            const html = `<!DOCTYPE html><html><head><title>${name}</title></head><body><h1>${name}</h1><p>Edit this file in <code>assets/${name}/index.html</code></p></body></html>`;
            createFile(`${name}/index.html`, html);
        } else {
            url = `${ASSETS_URL}${name}.html`;
            const html = `<!DOCTYPE html><html><head><title>${name}</title></head><body><h1>${name}</h1><p>Edit this file in <code>assets/${name}.html</code></p></body></html>`;
            createFile(`${name}.html`, html);
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
        alert(`Game "${name}" added!`);
    });

    // ---------- FILE CREATION (via download) ----------
    const createFile = (path, content) => {
        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = path;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        // NOTE: The file is **downloaded** – you must place it manually into assets/
        alert(`Download started for ${path}. Place it in the "assets" folder (create subfolders if needed).`);
    };

    // ---------- INITIAL LOAD ----------
    loadGames();
});
