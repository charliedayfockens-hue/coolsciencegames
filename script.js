document.addEventListener('DOMContentLoaded', () => {
    const listEl = document.getElementById('game-list');
    const searchInput = document.getElementById('search-bar');
    const counterEl = document.getElementById('game-counter');

    const isGitHubPages = location.hostname.includes('github.io');
    const basePath = isGitHubPages ? '/coolsciencegames/' : '/';
    const baseUrl = location.origin + basePath;

    // ALL GAMES FROM ASSETS FOLDER (525+)
    let allGames = [
        "12 Mini Battles.html",
        "1v1.LoL.html",
        "3D Bowling.html",
        "8 Ball Billiards Classic.html",
        "8 Ball Pool.html",
        "99 Balls.html",
        "A Bite at Freddy.html",
        "A Dance of Fire and Ice.html",
        "A Small World Cup.html",
        "Abandoned.html",
        "Achievement Unlocked 2.html",
        "Achievement Unlocked 3.html",
        "Achievement Unlocked.html",
        "AdVenture Capitalist.html",
        "Adventure Driver.html",
        "Ages of Conflict.html",
        "Alien Hominid.html",
        "Amanda the Adventurer.html",
        "Amaze.html",
        "Andy's Apple Farm.html",
        "Angry Birds Showdown.html",
        "Angry Birds.html",
        "Aquapark.io.html",
        "Archery World Tour.html",
        "Attack Hole.html",
        "Aviamasters.html",
        "BLOODMONEY!.html",
        "Backrooms.html",
        "Bacon May Die.html",
        "Bad Ice Cream 2.html",
        "Bad Ice Cream 3.html",
        "Bad Ice Cream.html",
        "Bad Monday Simulator.html",
        "Bad Parenting.html",
        "Bad Time Simulator.html",
        "Baldi's Basics Classic Remastered.html",
        "Baldi's Basics Plus.html",
        "Baldi's Basics.html",
        "Ball Blast.html",
        "Baseball Bros.html",
        "Basket Battle.html",
        "Basket Bros.html",
        "Basket Random.html",
        "Basketball Frvr.html",
        "Basketball Stars.html",
        "Bazooka Boy.html",
        "Bendy and the Ink Machine.html",
        "Big ICE Tower Tiny Square.html",
        "Big NEON Tower Tiny Square.html",
        "Big Tower Tiny Square.html",
        "Big Tower Tiny Squares 2.html",
        "Binding of Issac Wrath of the Lamb.html",
        "Bit Guns.html",
        "BitLife.html",
        "BitPlanes.html",
        "Black Jack.html",
        "Blade Ball.html",
        "Block Blast.html",
        "Block Post.html",
        "Blocky Snakes.html",
        "Bloons TD 2.html",
        "Bloons TD 3.html",
        "Bloons TD 4.html",
        "Bloons TD 5.html",
        "Bloons TD.html",
        "Bloxors.html",
        "Blumgi Rocket.html",
        "Bob The Robber 2.html",
        "Boom Slinger Reboom.html",
        "Bottle Jump 3D.html",
        "Bouncemasters.html",
        "Bowmasters.html",
        "Boxing Random.html",
        "Brawl Guys.io.html",
        "Bridge Race.html",
        "Buildnow.gg.html",
        "Burrito Bison.html",
        "Bust-A-Loop.html",
        "CG FC 25.html",
        "Call of Duty Nazi Zombie Portable.html",
        "Candy Crush.html",
        "Cannon Balls 3D.html",
        "Cannon Basketball 2.html",
        "Cannon Basketball.html",
        "Carrom Clash.html",
        "Cat Connection.html",
        "Cat Gunner - Super Zombie Shoot.html",
        "Cave Story.html",
        "Celeste PICO-8.html",
        "Celeste.html",
        "Cheese Chompers 3D.html",
        "Chess Classics.html",
        "Chiikawa Puzzle.html",
        "Choppy Orc.html",
        "CircleO 2.html",
        "CircleO.html",
        "City Smash.html",
        "Clash of Vikings.html",
        "Class of 09.html",
        "Cluster Truck.html",
        "Code Editor.html",
        "Color Match.html",
        "Color Water Sort 3D.html",
        "Cookie Clicker.html",
        "Core Ball.html",
        "Crazy Cars.html",
        "Crazy Chicken 3D.html",
        "Crazy Kitty 3D.html",
        "Crossy Road.html",
        "Cubefield.html",
        "Cuphead.html",
        "Cut the Rope Holiday.html",
        "Cut the Rope Time Travel.html",
        "Cut the Rope.html",
        "DON'T YOU LECTURE ME.html",
        "DOOM.html",
        "Dadish 2.html",
        "Dadish 3.html",
        "Dadish 3D.html",
        "Dadish.html",
        "Daily Dadish.html",
        "Dan the Man.html",
        "Dead Plate.html",
        "Death Run 3D.html",
        "Deltatraveler.html",
        "Dig Deep.html",
        "Do NOT Take This Cat Home.html",
        "Doge Miner.html",
        "Doodle Jump.html",
        "Doom 2.html",
        "Doom 3.html",
        "Dragon Vs Bricks.html",
        "Draw Climber.html",
        "Draw Joust.html",
        "Draw the Line.html",
        "Dreadhead Parkour.html",
        "Drift Boss.html",
        "Drift Hunters.html",
        "Drive Mad.html",
        "Driven Wild.html",
        "Duck Life 2.html",
        "Duck Life 3.html",
        "Duck Life 4.html",
        "Duck Life 5.html",
        "Duck Life.html",
        "Elastic Man.html",
        "EmulatorJS.html",
        "Endoparasitic.html",
        "Escape Road.html",
        "Evil Glitch.html",
        "EvoWars.io.html",
        "Fallout.html",
        "Fancy Pants Adventure 2.html",
        "Fancy Pants Adventure 3.html",
        "Fancy Pants Adventure 4 Part 1.html",
        "Fancy Pants Adventure 4 Part 2.html",
        "Fancy Pants Adventure.html",
        "Fears to Fathom Home Alone.html",
        "Fireboy & Watergirl 2 Light Temple.html",
        "Fireboy & Watergirl 3 Ice Temple.html",
        "Five Nights At Candys 2.html",
        "Five Nights At Candys.html",
        "Five Nights at Freddy's 2.html",
        "Five Nights at Freddy's 3.html",
        "Five Nights at Freddy's 4.html",
        "Five Nights at Freddy's 4_ Halloween.html",
        "Five Nights at Freddy's.html",
        "Five Nights at Freddy's_ Pizza Simulator.html",
        "Five Nights at Freddy's_ Sister Location.html",
        "Five Nights at Freddy's_ Ultimate Custom Night.html",
        "Five Nights at Freddy's_ World.html",
        "Five Nights at Winston's.html",
        "Flappy Bird.html",
        "Flappy Dunk.html",
        "Football Bros.html",
        "Fork N Sausage.html",
        "Fortzone Battle Royale.html",
        "Friday Night Funkin 17 Buck Floor 1.html",
        "Friday Night Funkin B-Sides.html",
        "Friday Night Funkin BopCity.html",
        "Friday Night Funkin Cyber Sensation.html",
        "Friday Night Funkin Darkness Takeover.html",
        "Friday Night Funkin FIRE IN THE HOLE Lobotomy Dash Funkin.html",
        "Friday Night Funkin Hit Single Real.html",
        "Friday Night Funkin Indie Cross.html",
        "Friday Night Funkin Jeffy's Endless Aethos.html",
        "Friday Night Funkin Mario's Madness.html",
        "Friday Night Funkin Mistful Crimson Morning Reboot.html",
        "Friday Night Funkin Neo.html",
        "Friday Night Funkin Pibby Apocalypse.html",
        "Friday Night Funkin Sarvente's Mid-Fight Masses.html",
        "Friday Night Funkin Soft.html",
        "Friday Night Funkin Sonic EXE 4.0.html",
        "Friday Night Funkin Sonic Legacy.html",
        "Friday Night Funkin Sunday Night Suicide (Rookie Edition).html",
        "Friday Night Funkin Twiddlefinger.html",
        "Friday Night Funkin VS Impostor v4.html",
        "Friday Night Funkin VS. KAPI.html",
        "Friday Night Funkin Vs. Dave and Bambi v3.html",
        "Friday Night Funkin vs Bob v2.0 (Bob's Onslaught).html",
        "Friday Night Funkin vs Carol V2.html",
        "Friday Night Funkin vs Creepypasta JP.html",
        "Friday Night Funkin vs Garcello.html",
        "Friday Night Funkin vs Hatsune Miku.html",
        "Friday Night Funkin vs Hex.html",
        "Friday Night Funkin vs Hypno's Lullaby V2.html",
        "Friday Night Funkin vs Hypno's Lullaby.html",
        "Friday Night Funkin vs Imposter Alternate.html",
        "Friday Night Funkin vs Nonsense.html",
        "Friday Night Funkin vs Shaggy.html",
        "Friday Night Funkin vs Sky.html",
        "Friday Night Funkin vs Tricky.html",
        "Friday Night Funkin'_ V.S. Whitty.html",
        "Friday Night Funkin'_ vs. QT.html",
        "Friday Night Funkin.html",
        "Friday Night Funkin’ Wednesday's Infidelity.html",
        "Fruit Ninja.html",
        "Gameboy Advance Emulator.html",
        "Generic Fighter Maybe.html",
        "Geometry Dash Lite.html",
        "Get Yoked.html",
        "Getaway Shootout.html",
        "Getting Over It with Bennett Foddy.html",
        "Gladihoppers.html",
        "Gobble.html",
        "God's Flesh.html",
        "Godzilla Diakaiju Battle Royale.html",
        "Google Feud.html",
        "Granny 2.html",
        "Granny 3.html",
        "Granny.html",
        "Groon Groon.html",
        "Growden.io.html",
        "Guess Their Answer.html",
        "Gunspin.html",
        "Half Life.html",
        "Happy Sheepies.html",
        "Happy Wheels.html",
        "Harvest.io.html",
        "Hide N Seek.html",
        "Highway Racer 2 REMASTERED.html",
        "Highway Racer 2.html",
        "Highway Racer.html",
        "Hill Climb Racing Lite.html",
        "Hollow Knight.html",
        "Hotline Miami.html",
        "House of Hazards.html",
        "Hypper Sandbox.html",
        "Ice Dodo.html",
        "Idle Breakout.html",
        "Idle Dice.html",
        "Idle Lumber Inc..html",
        "Idle Mining Empire.html",
        "Jelly Drift.html",
        "Jelly Mario.html",
        "Jelly Resturant.html",
        "Jetpack Joyride.html",
        "Johnny Trigger.html",
        "Journey Downhill.html",
        "JustFall.lol.html",
        "Karlson.html",
        "Kindergarten 2.html",
        "Kindergarten 3.html",
        "Kindergarten.html",
        "Kitchen Bazar.html",
        "KittyToy.html",
        "Lacey's Flash Games.html",
        "Learn 2 Fly 2.html",
        "Learn 2 Fly 3.html",
        "Learn 2 Fly Idle.html",
        "Learn 2 Fly.html",
        "Line Rider.html",
        "Little Runmo.html",
        "Love Letters.html",
        "Madalin Stunt Cars 2.html",
        "Madalin Stunt Cars 3.html",
        "Magic Tiles 3.html",
        "Melon Playground.html",
        "Metal Gear Solid.html",
        "Minecraft 1.12.2.html",
        "Minecraft 1.21.4.html",
        "Minecraft 1.5.2.html",
        "Minecraft 1.8.8.html",
        "Minecraft Alpha 1.2.6.html",
        "Minecraft Beta 1.3.html",
        "Minecraft Beta 1.7.3.html",
        "Minecraft Indev.html",
        "Minesweeper Mania.html",
        "MinesweeperPlus.html",
        "Mob Control.html",
        "Monkey Mart.html",
        "Monster Tracks.html",
        "Moto X3M 2.html",
        "Moto X3M 3.html",
        "Moto X3M Pool Party.html",
        "Moto X3M Spooky.html",
        "Moto X3M Winter.html",
        "Moto X3M.html",
        "My Teardrop.html",
        "N-gon.html",
        "Newgrounds Rumble.html",
        "Ninja vs EVILCORP.html",
        "Nubby's Number Factory.html",
        "Off.html",
        "OffRoad Mountain Bike.html",
        "Omori.html",
        "Oneshot Legacy.html",
        "Oshi Oshi Punch.html",
        "OvO 2.html",
        "OvO Dimensions.html",
        "OvO.html",
        "Pac-Man Superfest.html",
        "Pac-man (Horror).html",
        "Pac-man World 2.html",
        "Pac-man World.html",
        "Papa's Bakeria.html",
        "Papa's Burgeria.html",
        "Papa's Cheeseria.html",
        "Papa's Cupcakeria.html",
        "Papa's Donutria.html",
        "Papa's Freezeria.html",
        "Papa's Hot Dogeria.html",
        "Papa's Pancakeria.html",
        "Papa's Pastaria.html",
        "Papa's Pizzeria.html",
        "Papa's Scooperia.html",
        "Papa's Sushiria.html",
        "Papa's Taco Mia.html",
        "Papa's Wingeria.html",
        "Paper.io 2.html",
        "Papers Please.html",
        "Papery Planes.html",
        "Parappa The Rapper.html",
        "Parking Fury 3D.html",
        "Parking Rush.html",
        "People Playground.html",
        "Pixel Gun Survival.html",
        "Pizza Tower Scoutdigo.html",
        "Pizza Tower.html",
        "Plants vs Zombies.html",
        "Plinko.html",
        "Pokemon Emerald.html",
        "Pokemon Red.html",
        "Pokey Ball.html",
        "Portaboy+.html",
        "Pottery Master.html",
        "Pou.html",
        "Protektor.html",
        "PvZ2 Gardenless.html",
        "Quake 3 Arena.html",
        "R.E.P.O.html",
        "RE RUN.html",
        "Race Master 3D.html",
        "Race Master.html",
        "Raft Wars 2.html",
        "Raft Wars.html",
        "Raft.html",
        "Ragdoll Archers.html",
        "Ragdoll Hit.html",
        "Rainbow Obby.html  ",
        "Recoil.html",
        "Red Ball 2.html",
        "Red Ball 3.html",
        "Red Ball 4 Vol. 2.html",
        "Red Ball 4 Vol. 3.html",
        "Red Ball 4.html",
        "Red Ball.html",
        "Retro Bowl College.html",
        "Retro Bowl.html",
        "Riddle School 2.html",
        "Riddle School 3.html",
        "Riddle School 4.html",
        "Riddle School 5.html",
        "Riddle School.html",
        "Riddle Transfer 2.html",
        "Riddle Transfer.html",
        "RigBMX 2.html",
        "RigBMX.html",
        "Road of Fury Desert Strike.html",
        "Rolling Sky.html",
        "Rolly Vortex.html",
        "Rooftop Snipers 2.html",
        "Rooftop Snipers.html",
        "Room Sort.html",
        "Run 2.html",
        "Run 3.html",
        "Run.html",
        "Sandboxels.html",
        "Sandspiel.html",
        "Sandstone.html",
        "Sandtris.html",
        "Schoolboy Runaway.html",
        "Scrap Metal 3.html",
        "Shapez.io.html",
        "Shipo.io.html",
        "Side Effects.html",
        "Sky Riders.html",
        "Slender The Eight Pages.html",
        "Slice It All.html",
        "Slime Rancher.html",
        "Slither.io.html",
        "Slope 2.html",
        "Slope.html",
        "Slowroads.html",
        "Smash Karts.html",
        "Snow Rider 3D.html",
        "Snowbattle.io.html",
        "Solar Smash.html",
        "Sonic 2 Community Cut.html",
        "Sonic 3 Angel Island Remastered.html",
        "Sonic CD.html",
        "Sonic Mania.html",
        "Sort The Court!.html",
        "Space Waves.html",
        "Speed Stars.html",
        "Spelunky Classic HD.html",
        "Spider Doll.html",
        "Sprunki.html",
        "State.io.html",
        "Station 141.html",
        "Station Saturn.html",
        "Steal A Brainrot.html",
        "Stick With It.html",
        "Stickman & Guns.html",
        "Stickman Boost.html",
        "Stickman Climb.html",
        "Stickman Fight Ragdoll.html",
        "Stickman Golf.html",
        "Stickman Hook.html",
        "Sticky Dash.html",
        "Subway Surfers Barcelona.html",
        "Subway Surfers Beijing.html",
        "Subway Surfers Berlin.html",
        "Subway Surfers Buenos Aires.html",
        "Subway Surfers Havana.html",
        "Subway Surfers Houston.html",
        "Subway Surfers Iceland.html",
        "Subway Surfers London.html",
        "Subway Surfers Mexico.html",
        "Subway Surfers Miami.html",
        "Subway Surfers Monaco.html",
        "Subway Surfers New Orleans.html",
        "Subway Surfers St. Petersburg.html",
        "Subway Surfers Winter Holiday.html",
        "Subway Surfers Zurich.html",
        "Subway Surfers_ San Francisco.html",
        "Super Mario 63.html",
        "Super Mario 64.html",
        "Super Mario Bros.html",
        "Super Smash Flash.html",
        "Super Star Car.html",
        "Superhot.html",
        "Supreme Duelist.html",
        "Survival Race.html",
        "Swordfight.html",
        "Swords & Souls.html",
        "Tag.html",
        "Tall Man Run.html",
        "Tanuki Sunset.html",
        "Tattletail.html",
        "Temple Run 2.html",
        "Ten Minutes Till Dawn.html",
        "Territorial.io.html",
        "That's Not My Neighbor.html",
        "The Deadseat.html",
        "The Final Earth 2.html",
        "The Impossible Quiz.html",
        "The Legend Of Zelda Ocarina of Time.html",
        "The Legend of Zelda Majora's Mask.html",
        "The Man From The Window.html",
        "The Man In The Window.html",
        "The Oregon Trail (Text Version).html",
        "The World's Hardest Game 3.html",
        "The World's Hardest Game 4.html",
        "The World's Hardest Game.html",
        "They Are Coming.html",
        "This is the Only Level 2.html",
        "This is the Only Level.html",
        "Tiletopia.html",
        "Time Shooter 1.html",
        "Time Shooter 2.html",
        "Time Shooter 3_ SWAT.html",
        "Tiny Fishing.html",
        "Tomb of the Mask.html",
        "Tomodachi Collection.html",
        "Toss the Turtle.html",
        "Touhou Luminous Strike.html",
        "Touhou Mother.html",
        "Tower Crash 3D.html",
        "Traffic Rider.html",
        "Trivia Crack.html",
        "Tube Jumpers.html",
        "Tunnel Rush.html",
        "Turbo Stars.html",
        "ULTRAKILL.html",
        "Undertale Yellow.html",
        "Undertale.html",
        "Vex 2.html",
        "Vex 3 Xmas.html",
        "Vex 3.html",
        "Vex 4.html",
        "Vex 5.html",
        "Vex 6.html",
        "Vex 7.html",
        "Vex 8.html",
        "Vex Challenges.html",
        "Vex X3M 2.html",
        "Vex X3M.html",
        "Vex.html",
        "War The Knights.html",
        "Waterworks.html",
        "Webfishing.html",
        "Wheely 2.html",
        "Wheely 3.html",
        "Wheely 4 Time Travel.html",
        "Wheely 5 Armageddon.html",
        "Wheely 6 Fairy Tale.html",
        "Wheely 7 Detective.html",
        "Wheely 8 Alien.html",
        "Wheely.html",
        "Wordle.html",
        "World Box.html",
        "Yandere Simulator.html",
        "Yume Nikki.html",
        "osu!.html"
    ];

    // Convert to object format
    allGames = allGames.map(file => {
        const baseName = file.replace(/\.html?$/i, '');
        const cleanName = baseName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        return {
            name: cleanName,
            file: file,
            url: `${baseUrl}assets/${file}`,
            image: `${baseUrl}assets/Images/${baseName}.jpg`, // tries .jpg - change to .png if needed
            lowerName: cleanName.toLowerCase(),
            description: '' // add description files later if you want
        };
    });

    render(allGames);

    // === RANDOM GAME BUTTON ===
    const randomBtn = document.createElement('button');
    randomBtn.id = 'random-game-btn';
    randomBtn.innerHTML = '<span>Random Game</span>';
    randomBtn.addEventListener('click', () => {
        const randomIndex = Math.floor(Math.random() * allGames.length);
        window.open(allGames[randomIndex].url, '_blank');
    });
    document.body.appendChild(randomBtn);

    // === MY FAVORITES BUTTON ===
    const favoritesBtn = document.createElement('button');
    favoritesBtn.id = 'favorites-btn';
    favoritesBtn.innerHTML = '<span>My Favorites</span>';
    let showingFavorites = false;
    favoritesBtn.addEventListener('click', () => {
        showingFavorites = !showingFavorites;
        favoritesBtn.classList.toggle('active', showingFavorites);
        favoritesBtn.querySelector('span').textContent = showingFavorites ? 'Show All Games' : 'My Favorites';
        const favorites = JSON.parse(localStorage.getItem('gameFavorites') || '[]');
        render(showingFavorites ? allGames.filter(g => favorites.includes(g.url)) : allGames);
    });
    document.body.appendChild(favoritesBtn);

    // === DARK/LIGHT MODE TOGGLE ===
    const themeToggleBtn = document.createElement('button');
    themeToggleBtn.id = 'theme-toggle-btn';
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        themeToggleBtn.textContent = '☀️';
    } else {
        themeToggleBtn.textContent = '🌙';
    }
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        if (document.body.classList.contains('light-mode')) {
            themeToggleBtn.textContent = '☀️';
            localStorage.setItem('theme', 'light');
        } else {
            themeToggleBtn.textContent = '🌙';
            localStorage.setItem('theme', 'dark');
        }
    });
    document.body.appendChild(themeToggleBtn);

    function render(games) {
        listEl.innerHTML = '';
        counterEl.textContent = `${games.length} Game${games.length === 1 ? '' : 's'} Available`;

        if (games.length === 0) {
            listEl.innerHTML = '<p class="loading">No games found.</p>';
            return;
        }

        const frag = document.createDocumentFragment();
        const favorites = JSON.parse(localStorage.getItem('gameFavorites') || '[]');

        games.forEach(g => {
            const card = document.createElement('div');
            card.className = 'game-card';
            card.style.position = 'relative';

            if (g.image) {
                const img = document.createElement('img');
                img.src = g.image;
                img.alt = g.name;
                img.loading = 'lazy';
                img.onerror = () => img.remove(); // hide if no image
                card.appendChild(img);
            }

            // Favorite heart
            const heart = document.createElement('button');
            heart.className = 'favorite-btn';
            heart.innerHTML = favorites.includes(g.url) ? '❤️' : '♡';
            heart.addEventListener('click', (e) => {
                e.stopPropagation();
                let favs = JSON.parse(localStorage.getItem('gameFavorites') || '[]');
                if (favs.includes(g.url)) {
                    favs = favs.filter(u => u !== g.url);
                    heart.innerHTML = '♡';
                } else {
                    favs.push(g.url);
                    heart.innerHTML = '❤️';
                }
                localStorage.setItem('gameFavorites', JSON.stringify(favs));
            });
            card.appendChild(heart);

            const bottom = document.createElement('div');
            bottom.className = 'card-bottom';

            const title = document.createElement('div');
            title.className = 'game-title';
            title.textContent = g.name;
            bottom.appendChild(title);

            if (g.description) {
                const desc = document.createElement('p');
                desc.className = 'game-desc';
                desc.textContent = g.description;
                bottom.appendChild(desc);
            }

            const a = document.createElement('a');
            a.href = g.url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.appendChild(bottom);
            card.appendChild(a);

            frag.appendChild(card);
        });

        listEl.appendChild(frag);
    }

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        const filtered = query ? allGames.filter(g => g.lowerName.includes(query)) : allGames;
        render(filtered);
    });
});

// Keep your other button code (credits, eject, cloak, request, settings) as before — they work the same with static games.
