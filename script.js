/* script.js */
document.addEventListener('DOMContentLoaded', async () => {
    const listEl = document.getElementById('game-list');

    // Auto-detect username and repo from current URL
    const hostname = window.location.hostname;
    let username, repoName;
    try {
        if (!hostname.endsWith('.github.io')) {
            throw new Error('Not hosted on GitHub Pages');
        }
        username = hostname.slice(0, -10); // Remove '.github.io'
        
        const pathSegments = window.location.pathname.split('/').filter(s => s.length > 0);
        if (pathSegments.length > 0) {
            // Project site: username.github.io/repo/
            repoName = pathSegments[0];
        } else {
            // User site: username.github.io/
            repoName = `${username}.github.io`;
        }
    } catch (e) {
        listEl.innerHTML = `<p class="loading">Error detecting repo: ${e.message}<br>Make sure this is on GitHub Pages.</p>`;
        return;
    }
    const REPO = `${username}/${repoName}`;

    // Try 'main' first, fallback to 'gh-pages'
    const branches = ['main', 'gh-pages'];
    let items = null;
    let currentBranch = null;
    for (const branch of branches) {
        const apiUrl = `https://api.github.com/repos/${REPO}/contents/assets?ref=${branch}`;
        try {
            const resp = await fetch(apiUrl, {
                headers: {
                    'User-Agent': 'Game-Hub-Client' // Required to avoid blocks
                }
            });
            if (resp.ok) {
                items = await resp.json();
                currentBranch = branch;
                console.log(`Using branch: ${branch}`);
                break;
            } else {
                const errorText = await resp.text();
                console.warn(`Branch ${branch} failed: ${resp.status} - ${errorText}`);
            }
        } catch (e) {
            console.warn(`Branch ${branch} error: ${e.message}`);
        }
    }

    if (!items) {
        listEl.innerHTML = `<p class="loading">Error: Could not fetch assets (tried branches: ${branches.join(', ')}).<br>Check console (F12) for details. Repo detected as '${REPO}'.</p>`;
        return;
    }
    console.log('API Response:', items); // Debug: Check console for contents

    const games = [];

    for (const item of items) {
        const name = item.name;
        const type = item.type; // 'file' or 'dir'

        if (type === 'dir') {
            // Folder game → look for index.html inside
            try {
                const subApiUrl = `${item.url}?ref=${currentBranch}`;
                const subResp = await fetch(subApiUrl, {
                    headers: { 'User-Agent': 'Game-Hub-Client' }
                });
                if (!subResp.ok) throw new Error(`Subfolder fetch failed: ${subResp.status}`);
                const subItems = await subResp.json();
                const hasIndex = subItems.some(f => f.name.toLowerCase() === 'index.html');
                if (hasIndex) {
                    games.push({
                        name: name,
                        url: `assets/${name}/index.html`
                    });
                }
            } catch (subErr) {
                console.warn(`Skipping folder ${name}:`, subErr);
            }
        } else if (type === 'file' && name.toLowerCase().endsWith('.html')) {
            // Single HTML file
            const gameName = name.replace(/\.html$/i, '');
            games.push({
                name: gameName,
                url: `assets/${name}`
            });
        }
    }

    // Sort alphabetically
    games.sort((a, b) => a.name.localeCompare(b.name));

    if (games.length === 0) {
        listEl.innerHTML = '<p class="loading">No games found in assets/ – add a folder with index.html or a .html file!</p>';
        return;
    }

    const fragment = document.createDocumentFragment();
    for (const game of games) {
        const card = document.createElement('div');
        card.className = 'game-card';

        const link = document.createElement('a');
        link.href = game.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = game.name;

        card.appendChild(link);
        fragment.appendChild(card);
    }

    listEl.innerHTML = '';
    listEl.appendChild(fragment);
});
