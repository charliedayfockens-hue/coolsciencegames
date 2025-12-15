// ... (keep the top part unchanged until the try block)

try {
    // ... (fetch items unchanged)

    for (const item of items) {
        if (item.type === 'dir') {
            // Your repo has almost no real dirs with games, but keep this for future
            const r = await fetch(item.url);
            const files = await r.json();
            const htmlFile = files.find(f => f.name.toLowerCase().endsWith('.html'));
            const previewFile = files.find(f => 
                f.name.toLowerCase().includes('preview') && 
                (f.name.toLowerCase().endsWith('.png') || f.name.toLowerCase().endsWith('.jpg'))
            );
            if (htmlFile) {
                allGames.push({
                    name: item.name,
                    url: `${baseUrl}assets/${encodeURIComponent(item.name)}/${htmlFile.name}`,
                    preview: previewFile ? `${baseUrl}assets/${encodeURIComponent(item.name)}/${previewFile.name}` : null,
                    lowerName: item.name.toLowerCase()
                });
            }
        } else if (item.name.toLowerCase().endsWith('.html')) {
            const gameName = item.name.replace(/\.html?$/i, '');
            // Look for preview: "GameName-preview.png" or similar
            const previewItem = items.find(i => 
                i.name.toLowerCase() === `${gameName.toLowerCase()}-preview.png` ||
                i.name.toLowerCase() === `${gameName.toLowerCase()}-preview.jpg` ||
                i.name.toLowerCase() === `preview-${gameName.toLowerCase()}.png` ||
                i.name.toLowerCase().startsWith(gameName.toLowerCase()) && i.name.toLowerCase().includes('preview')
            );

            allGames.push({
                name: gameName,
                url: `${baseUrl}assets/${item.name}`,
                preview: previewItem ? `${baseUrl}assets/${previewItem.name}` : null,
                lowerName: gameName.toLowerCase()
            });
        }
    }

    // Optional: Nicer display names (replace - and _ with spaces, capitalize)
    allGames = allGames.map(g => ({
        ...g,
        displayName: g.name.replace(/[-_]/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase())
    }));

    allGames.sort((a, b) => a.displayName.localeCompare(b.displayName));
} catch (e) {
    // ... (error handling unchanged)
}

// Update render function
const render = (games) => {
    listEl.innerHTML = '';
    counterEl.textContent = `${games.length} Game${games.length === 1 ? '' : 's'} Available`;

    if (games.length === 0) {
        listEl.innerHTML = '<p class="loading">No games match your search.</p>';
        return;
    }

    const frag = document.createDocumentFragment();
    games.forEach(g => {
        const card = document.createElement('div');
        card.className = 'game-card';

        // Add preview image if exists
        if (g.preview) {
            const img = document.createElement('img');
            img.src = g.preview;
            img.alt = `${g.displayName || g.name} preview`;
            img.loading = 'lazy'; // Faster loading
            card.appendChild(img);
        }

        // The button/link
        const a = document.createElement('a');
        a.href = g.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = g.displayName || g.name;
        card.appendChild(a);

        frag.appendChild(card);
    });
    listEl.appendChild(frag);
};

render(allGames);

// ... (search unchanged, but use g.displayName in filter if you added it)
