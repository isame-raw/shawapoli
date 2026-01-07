// =======================
// SHAWAPOLI GAME SCRIPT
// Phase 4 - With Player Property Panels
// =======================

// --- BASIC UI ELEMENTS ---
const rollButton = document.getElementById('rollButton');
const resetButton = document.getElementById('resetButton');
const diceResultSpan = document.getElementById('diceResult');
const currentPlayerSpan = document.getElementById('currentPlayer');
const currentPlayerMoneySpan = document.getElementById('currentPlayerMoney');
const playersPanel = document.getElementById('playersPanel');
const logPanel = document.getElementById('logPanel');
const panelsContainer = document.getElementById('panelsContainer');

// ---- CONFIGURATION ----
const gameConfig = {
    startingMoney: 1500,
    goSalary: 200,
    useFreeParkingPot: true,
    jailFine: 50,
    houseUpgradeCostFactor: 0.5,
    maxUpgradeLevel: 4,
    minPlayers: 2,
    maxPlayers: 6
};

// ---- CORE GAME STATE ----
const gameState = {
    players: [],
    tiles: [],
    tileData: [],
    numPlayers: 0,
    currentPlayerIndex: 0,
    turnPhase: "waiting_for_roll",
    dice: {
        lastRoll: null,
        history: []
    },
    propertyOwners: {},
    propertyUpgrades: {},
    freeParkingPot: 0,
    chanceDeck: [],
    chanceDiscard: [],
    communityDeck: [],
    communityDiscard: [],
    playerPanels: {} // Store player panel elements
};

const startingMoney = gameConfig.startingMoney;

// =======================
// LOG PANEL
// =======================

function addLog(text) {
    if (!logPanel) return;
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = text;
    logPanel.prepend(entry);
    const entries = logPanel.querySelectorAll('.log-entry');
    if (entries.length > 80) {
        entries[entries.length - 1].remove();
    }
}

// =======================
// MODAL / POPUP SYSTEM
// =======================

let modalOverlay = null;
let modalBox = null;
let modalMessage = null;
let modalButtonsContainer = null;

function initModal() {
    if (modalOverlay) return;

    modalOverlay = document.createElement('div');
    modalOverlay.id = 'gameModalOverlay';
    Object.assign(modalOverlay.style, {
        position: 'fixed',
        inset: '0',
        backgroundColor: 'rgba(0,0,0,0.75)',
        display: 'none',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '9999',
        backdropFilter: 'blur(3px)'
    });

    modalBox = document.createElement('div');
    Object.assign(modalBox.style, {
        backgroundColor: '#131827',
        color: '#fff',
        padding: '24px 28px',
        borderRadius: '12px',
        minWidth: '300px',
        maxWidth: '400px',
        boxShadow: '0 0 25px rgba(0,0,0,0.8)',
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
        border: '2px solid rgba(255,255,255,0.15)'
    });

    modalMessage = document.createElement('div');
    Object.assign(modalMessage.style, {
        marginBottom: '18px',
        whiteSpace: 'pre-line',
        fontSize: '16px',
        lineHeight: '1.5',
        color: '#f0f0f0'
    });

    modalButtonsContainer = document.createElement('div');
    Object.assign(modalButtonsContainer.style, {
        display: 'flex',
        justifyContent: 'center',
        gap: '12px',
        marginTop: '15px'
    });

    modalBox.appendChild(modalMessage);
    modalBox.appendChild(modalButtonsContainer);
    modalOverlay.appendChild(modalBox);
    document.body.appendChild(modalOverlay);
}

function showPopup(message, buttons, callback) {
    initModal();
    modalMessage.textContent = message;
    modalButtonsContainer.innerHTML = '';

    buttons.forEach(btn => {
        const b = document.createElement('button');
        b.textContent = btn.label;
        Object.assign(b.style, {
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #1d9bf0, #0072ff)',
            color: '#fff',
            boxShadow: '0 0 15px rgba(0,114,255,0.5)',
            transition: 'all 0.2s ease',
            minWidth: '80px'
        });
        
        b.addEventListener('mouseenter', () => {
            b.style.transform = 'translateY(-2px)';
            b.style.boxShadow = '0 0 20px rgba(0,114,255,0.7)';
        });
        
        b.addEventListener('mouseleave', () => {
            b.style.transform = 'translateY(0)';
            b.style.boxShadow = '0 0 15px rgba(0,114,255,0.5)';
        });
        
        b.addEventListener('click', () => {
            modalOverlay.style.display = 'none';
            if (callback) callback(btn.value);
        });
        modalButtonsContainer.appendChild(b);
    });

    modalOverlay.style.display = 'flex';
}

function showMessage(text, cb) {
    showPopup(text, [{ label: 'OK', value: 'ok' }], () => {
        if (cb) cb();
    });
}

// =======================
// UTILS
// =======================

function rollSingleDie() {
    return Math.floor(Math.random() * 6) + 1;
}

// =======================
// BOARD SETUP - SIMPLE 40 TILES
// =======================

const allTiles = Array.from(document.querySelectorAll('.board .tile'));
gameState.tiles = allTiles;

// =======================
// TILE DATA (Monopoly standard)
// =======================

const monopolyTileOrder = [
    { name: 'GO', type: 'go' },
    { name: 'Mediterranean Avenue', type: 'property', price: 60, rent: 2, colorGroup: 'brown' },
    { name: 'Community Chest', type: 'community' },
    { name: 'Baltic Avenue', type: 'property', price: 60, rent: 4, colorGroup: 'brown' },
    { name: 'Income Tax', type: 'tax', amount: 200 },
    { name: 'Reading Railroad', type: 'railroad', price: 200, baseRent: 25 },
    { name: 'Oriental Avenue', type: 'property', price: 100, rent: 6, colorGroup: 'lightblue' },
    { name: 'Chance', type: 'chance' },
    { name: 'Vermont Avenue', type: 'property', price: 100, rent: 6, colorGroup: 'lightblue' },
    { name: 'Connecticut Avenue', type: 'property', price: 120, rent: 8, colorGroup: 'lightblue' },
    { name: 'Jail / Just Visiting', type: 'jail' },
    { name: 'St. Charles Place', type: 'property', price: 140, rent: 10, colorGroup: 'pink' },
    { name: 'Electric Company', type: 'utility', price: 150 },
    { name: 'States Avenue', type: 'property', price: 140, rent: 10, colorGroup: 'pink' },
    { name: 'Virginia Avenue', type: 'property', price: 160, rent: 12, colorGroup: 'pink' },
    { name: 'Pennsylvania Railroad', type: 'railroad', price: 200, baseRent: 25 },
    { name: 'St. James Place', type: 'property', price: 180, rent: 14, colorGroup: 'orange' },
    { name: 'Community Chest', type: 'community' },
    { name: 'Tennessee Avenue', type: 'property', price: 180, rent: 14, colorGroup: 'orange' },
    { name: 'New York Avenue', type: 'property', price: 200, rent: 16, colorGroup: 'orange' },
    { name: 'Free Parking', type: 'freeparking' },
    { name: 'Kentucky Avenue', type: 'property', price: 220, rent: 18, colorGroup: 'red' },
    { name: 'Chance', type: 'chance' },
    { name: 'Indiana Avenue', type: 'property', price: 220, rent: 18, colorGroup: 'red' },
    { name: 'Illinois Avenue', type: 'property', price: 240, rent: 20, colorGroup: 'red' },
    { name: 'B. & O. Railroad', type: 'railroad', price: 200, baseRent: 25 },
    { name: 'Atlantic Avenue', type: 'property', price: 260, rent: 22, colorGroup: 'yellow' },
    { name: 'Ventnor Avenue', type: 'property', price: 260, rent: 22, colorGroup: 'yellow' },
    { name: 'Water Works', type: 'utility', price: 150 },
    { name: 'Marvin Gardens', type: 'property', price: 280, rent: 24, colorGroup: 'yellow' },
    { name: 'Go To Jail', type: 'gotojail' },
    { name: 'Pacific Avenue', type: 'property', price: 300, rent: 26, colorGroup: 'green' },
    { name: 'North Carolina Avenue', type: 'property', price: 300, rent: 26, colorGroup: 'green' },
    { name: 'Community Chest', type: 'community' },
    { name: 'Pennsylvania Avenue', type: 'property', price: 320, rent: 28, colorGroup: 'green' },
    { name: 'Short Line Railroad', type: 'railroad', price: 200, baseRent: 25 },
    { name: 'Chance', type: 'chance' },
    { name: 'Park Place', type: 'property', price: 350, rent: 35, colorGroup: 'blue' },
    { name: 'Luxury Tax', type: 'tax', amount: 100 },
    { name: 'Boardwalk', type: 'property', price: 400, rent: 50, colorGroup: 'blue' }
];

gameState.tileData = [];
for (let i = 0; i < 40; i++) {
    gameState.tileData[i] = {
        ...monopolyTileOrder[i],
        position: i
    };
}

// =======================
// OWNERSHIP + UPGRADES
// =======================

gameState.propertyOwners = {};
gameState.propertyUpgrades = {};
const propertyOwners = gameState.propertyOwners;
const propertyUpgrades = gameState.propertyUpgrades;

// =======================
// PLAYER PROPERTY PANELS
// =======================

function createPlayerPanel(player) {
    const panel = document.createElement('div');
    panel.className = `player-panel player${player.id}-panel`;
    panel.dataset.playerId = player.id;
    
    panel.innerHTML = `
        <div class="player-panel-header">
            <h4>Player ${player.id}</h4>
            <span class="player-panel-money">$${player.money}</span>
        </div>
        <div class="player-properties-list" id="playerProperties${player.id}">
            <div class="no-properties">No properties yet</div>
        </div>
    `;
    
    return panel;
}

function updatePlayerPanel(player) {
    const panel = gameState.playerPanels[player.id];
    if (!panel) return;
    
    // Update money
    const moneySpan = panel.querySelector('.player-panel-money');
    if (moneySpan) {
        moneySpan.textContent = `$${player.money}`;
    }
    
    // Update properties list
    const propertiesList = panel.querySelector('.player-properties-list');
    if (!propertiesList) return;
    
    // Clear current list
    propertiesList.innerHTML = '';
    
    // Get all properties owned by this player
    const ownedProperties = [];
    for (const [position, ownerId] of Object.entries(propertyOwners)) {
        if (ownerId === player.id) {
            const tileData = gameState.tileData[position];
            if (tileData) {
                ownedProperties.push({
                    position: parseInt(position),
                    data: tileData,
                    level: propertyUpgrades[position] || 0
                });
            }
        }
    }
    
    // Sort by color group
    ownedProperties.sort((a, b) => {
        const colorOrder = ['brown', 'lightblue', 'pink', 'orange', 'red', 'yellow', 'green', 'blue', 'railroad', 'utility'];
        const aIndex = colorOrder.indexOf(a.data.colorGroup || a.data.type);
        const bIndex = colorOrder.indexOf(b.data.colorGroup || b.data.type);
        return aIndex - bIndex;
    });
    
    // Display properties
    if (ownedProperties.length === 0) {
        propertiesList.innerHTML = '<div class="no-properties">No properties yet</div>';
    } else {
        ownedProperties.forEach(prop => {
            const item = document.createElement('div');
            item.className = `player-property-item ${prop.data.colorGroup || prop.data.type}`;
            
            let levelText = '';
            if (prop.level > 0) {
                if (prop.level === 1) levelText = '1 House';
                else if (prop.level === 2) levelText = '2 Houses';
                else if (prop.level === 3) levelText = '3 Houses';
                else if (prop.level === 4) levelText = '4 Houses';
                else if (prop.level === 5) levelText = 'Hotel';
            }
            
            item.innerHTML = `
                <span>${prop.data.name}</span>
                ${levelText ? `<span class="property-level">${levelText}</span>` : ''}
            `;
            
            propertiesList.appendChild(item);
        });
    }
    
    // Update panel state
    panel.classList.remove('active', 'bankrupt');
    if (player.id === gameState.players[gameState.currentPlayerIndex]?.id) {
        panel.classList.add('active');
    }
    if (player.isBankrupt) {
        panel.classList.add('bankrupt');
    }
}

function updateAllPlayerPanels() {
    gameState.players.forEach(player => {
        updatePlayerPanel(player);
    });
}

// =======================
// PLAYERS (dynamic 2–6)
// =======================

gameState.players = [];
const players = gameState.players;
const playerMoneySpans = [];

function createPlayer(id, className) {
    return {
        id,
        position: 0,
        money: startingMoney,
        isBankrupt: false,
        inJail: false,
        jailTurns: 0,
        jailFreeCards: 0,
        token: (() => {
            const el = document.createElement('div');
            el.className = `player-token ${className}`;
            return el;
        })()
    };
}

function initPlayers(numPlayers) {
    gameState.players = [];
    players.length = 0;
    playersPanel.innerHTML = '';
    panelsContainer.innerHTML = '';
    playerMoneySpans.length = 0;
    gameState.playerPanels = {};
    gameState.numPlayers = numPlayers;

    for (let i = 1; i <= numPlayers; i++) {
        const p = createPlayer(i, `player${i}`);
        players.push(p);

        // Create player info card
        const card = document.createElement('div');
        card.className = `player-info player${i}-info`;
        card.dataset.playerId = String(i);

        const spanMoney = document.createElement('span');
        spanMoney.textContent = p.money;

        card.innerHTML = `P${i}: $`;
        card.appendChild(spanMoney);
        playersPanel.appendChild(card);

        playerMoneySpans.push(spanMoney);

        // Create player property panel
        const panel = createPlayerPanel(p);
        panelsContainer.appendChild(panel);
        gameState.playerPanels[p.id] = panel;
    }

    gameState.currentPlayerIndex = 0;
}

// =======================
// DISPLAY HELPERS
// =======================

function updateMoneyDisplay() {
    for (let i = 0; i < players.length; i++) {
        if (playerMoneySpans[i]) {
            playerMoneySpans[i].textContent = players[i].money;
        }
    }
    
    // Update current player money in turn info
    const currentPlayer = players[gameState.currentPlayerIndex];
    if (currentPlayer && currentPlayerMoneySpan) {
        currentPlayerMoneySpan.textContent = `$${currentPlayer.money}`;
    }
}

function updatePlayerPositions() {
    gameState.tiles.forEach(tile => {
        const tokens = tile.querySelectorAll('.player-token');
        tokens.forEach(token => token.remove());
    });
    
    players.forEach(player => {
        if (player.isBankrupt) return;
        
        const tile = gameState.tiles[player.position];
        if (tile) {
            tile.appendChild(player.token);
        }
    });
}

function updateActivePlayerUI() {
    const cards = playersPanel.querySelectorAll('.player-info');
    cards.forEach((card, idx) => {
        const player = players[idx];
        if (!player) return;
        
        card.classList.toggle('active', idx === gameState.currentPlayerIndex && !player.isBankrupt);
        card.classList.toggle('bankrupt', player.isBankrupt);
    });

    const current = players[gameState.currentPlayerIndex];
    currentPlayerSpan.textContent = current ? current.id : '-';
    
    // Update player panels
    updateAllPlayerPanels();
}

function updateActiveBoardUI() {
    players.forEach((player, idx) => {
        if (player.isBankrupt) {
            player.token.style.opacity = '0.3';
            player.token.style.transform = 'scale(0.8)';
            player.token.style.border = '2px solid #999';
            player.token.style.zIndex = '1';
        } else if (idx === gameState.currentPlayerIndex) {
            player.token.style.transform = 'scale(1.4)';
            player.token.style.zIndex = '100';
            player.token.style.border = '3px solid yellow';
            player.token.style.boxShadow = '0 0 15px yellow';
            player.token.style.opacity = '1';
        } else {
            player.token.style.transform = 'scale(1)';
            player.token.style.zIndex = '10';
            player.token.style.border = '3px solid #ffffff';
            player.token.style.boxShadow = '0 0 8px rgba(0,0,0,0.7)';
            player.token.style.opacity = '1';
        }
    });

    gameState.tiles.forEach(tile => {
        tile.style.outline = '';
        tile.style.boxShadow = '';
    });
    
    const activePlayer = players[gameState.currentPlayerIndex];
    if (activePlayer && !activePlayer.isBankrupt) {
        const activeTile = gameState.tiles[activePlayer.position];
        if (activeTile) {
            activeTile.style.outline = '4px solid #ffeb3b';
            activeTile.style.boxShadow = '0 0 20px rgba(255, 235, 59, 0.8)';
        }
    }
}

// =======================
// ANIMATED MOVEMENT
// =======================

function movePlayerSteps(player, steps, callback) {
    if (steps === 0) {
        if (callback) callback();
        return;
    }

    const totalTiles = 40;
    let stepsTaken = 0;

    const moveStep = () => {
        const oldPosition = player.position;
        
        player.position = (player.position + 1) % totalTiles;
        stepsTaken++;
        
        if (player.position === 0 && oldPosition !== 0) {
            player.money += gameConfig.goSalary;
            updateMoneyDisplay();
            addLog(`Player ${player.id} collected $${gameConfig.goSalary} for passing GO.`);
        }
        
        updatePlayerPositions();
        
        if (stepsTaken < steps) {
            setTimeout(moveStep, 150);
        } else {
            if (callback) callback();
        }
    };

    moveStep();
}

// =======================
// RENT / MONOPOLIES
// =======================

function playerOwnsAllInColorGroup(playerId, colorGroup) {
    if (!colorGroup) return false;
    
    const relevantTiles = gameState.tileData.filter(
        t => t && t.type === 'property' && t.colorGroup === colorGroup
    );
    
    if (relevantTiles.length === 0) return false;
    
    return relevantTiles.every(t => {
        const owner = propertyOwners[t.position];
        return owner === playerId;
    });
}

function countOwnedOfType(playerId, type) {
    return gameState.tileData.filter(
        t => t && t.type === type && propertyOwners[t.position] === playerId
    ).length;
}

function getUpgradeLevel(position) {
    return propertyUpgrades[position] || 0;
}

function calculateRent(tileData, ownerId, position) {
    const type = tileData.type;

    if (type === 'property') {
        const base = tileData.rent || 0;
        const hasMono = playerOwnsAllInColorGroup(ownerId, tileData.colorGroup);
        const monoMult = hasMono ? 2 : 1;
        const level = getUpgradeLevel(position);
        const upgradeMult = 1 + level;
        return base * monoMult * upgradeMult;
    }

    if (type === 'railroad') {
        const count = countOwnedOfType(ownerId, 'railroad');
        if (!count) return 0;
        const base = tileData.baseRent || 25;
        if (count === 1) return base;
        if (count === 2) return base * 2;
        if (count === 3) return base * 4;
        return base * 8;
    }

    if (type === 'utility') {
        if (!gameState.dice.lastRoll) return 0;
        const total = gameState.dice.lastRoll.total || 0;
        const count = countOwnedOfType(ownerId, 'utility');
        if (count === 1) return total * 4;
        if (count >= 2) return total * 10;
        return 0;
    }

    return 0;
}

// =======================
// BANKRUPTCY & ENDGAME
// =======================

function handleBankruptcy(player) {
    if (player.money >= 0 || player.isBankrupt) return;

    player.money = 0;
    player.isBankrupt = true;
    updateMoneyDisplay();

    // Release all properties owned by this player
    for (const key in propertyOwners) {
        if (propertyOwners[key] === player.id) {
            delete propertyOwners[key];
            delete propertyUpgrades[key];
            const tile = gameState.tiles[key];
            if (tile) {
                tile.classList.remove(
                    'owned-player1',
                    'owned-player2',
                    'owned-player3',
                    'owned-player4',
                    'owned-player5',
                    'owned-player6'
                );
            }
        }
    }

    addLog(`Player ${player.id} is bankrupt and out of the game.`);
    showMessage(`Player ${player.id} is bankrupt and out of the game!`);

    const remaining = players.filter(p => !p.isBankrupt);
    if (remaining.length === 1) {
        endGame(remaining[0]);
    }
    
    updateAllPlayerPanels();
}

function endGame(winner) {
    gameState.turnPhase = "game_over";
    rollButton.disabled = true;

    if (winner) {
        addLog(`Game over! Player ${winner.id} wins with $${winner.money}!`);
        showMessage(`Game over! Player ${winner.id} wins with $${winner.money}!`);
    } else {
        addLog('Game over!');
        showMessage('Game over!');
    }

    updateActivePlayerUI();
    updateActiveBoardUI();
}

// =======================
// CHANCE & COMMUNITY
// =======================

function initDecks() {
    gameState.chanceDeck = [
        { type: 'move_to', targetName: 'GO', text: 'Advance to GO. Collect salary.' },
        { type: 'pay', amount: 50, text: 'Pay 50 in school fees.' },
        { type: 'receive', amount: 100, text: 'Bank error in your favor. Collect 100.' },
        { type: 'move_steps', steps: -3, text: 'Go back 3 spaces.' },
        { type: 'go_to_jail', text: 'Go directly to Jail. Do not pass GO.' },
        { type: 'receive', amount: 150, text: 'You won a small lottery. Collect 150.' }
    ];
    gameState.chanceDiscard = [];

    gameState.communityDeck = [
        { type: 'receive', amount: 50, text: 'You received 50 as a gift.' },
        { type: 'pay', amount: 50, text: 'Doctor\'s fee. Pay 50.' },
        { type: 'receive', amount: 100, text: 'Inheritance. Collect 100.' },
        { type: 'move_to', targetName: 'GO', text: 'Advance to GO. Collect salary.' },
        { type: 'pay', amount: 100, text: 'Pay 100 for services.' },
        { type: 'go_to_jail', text: 'Go directly to Jail.' }
    ];
    gameState.communityDiscard = [];
    
    gameState.chanceDeck = gameState.chanceDeck.sort(() => Math.random() - 0.5);
    gameState.communityDeck = gameState.communityDeck.sort(() => Math.random() - 0.5);
}

function drawCard(deckName) {
    let deck = deckName === 'chance' ? gameState.chanceDeck : gameState.communityDeck;
    let discard = deckName === 'chance' ? gameState.chanceDiscard : gameState.communityDiscard;

    if (deck.length === 0) {
        deck = discard;
        discard = [];
    }
    if (deck.length === 0) return null;

    const card = deck.shift();
    discard.push(card);

    if (deckName === 'chance') {
        gameState.chanceDeck = deck;
        gameState.chanceDiscard = discard;
    } else {
        gameState.communityDeck = deck;
        gameState.communityDiscard = discard;
    }
    return card;
}

function findTilePositionByName(name) {
    const entry = gameState.tileData.find(t => t && t.name === name);
    return entry ? entry.position : -1;
}

function applyCardEffect(player, card, done) {
    addLog(`Player ${player.id} drew card: ${card.text}`);
    showMessage(card.text, () => {
        if (card.type === 'pay') {
            player.money -= card.amount;
            updateMoneyDisplay();
            handleBankruptcy(player);
            updatePlayerPanel(player);
            done();
            return;
        }

        if (card.type === 'receive') {
            player.money += card.amount;
            updateMoneyDisplay();
            updatePlayerPanel(player);
            done();
            return;
        }

        if (card.type === 'go_to_jail') {
            sendPlayerToJail(player, () => {
                done();
            });
            return;
        }

        if (card.type === 'move_to') {
            const pos = findTilePositionByName(card.targetName);
            if (pos !== -1) {
                const tile = gameState.tileData[pos];
                if (tile && tile.type === 'go') {
                    player.money += gameConfig.goSalary;
                    updateMoneyDisplay();
                    addLog(`Player ${player.id} collected $${gameConfig.goSalary} for advancing to GO.`);
                }
                player.position = pos;
                updatePlayerPositions();
                handleLanding(player, done);
            } else {
                done();
            }
            return;
        }

        if (card.type === 'move_steps') {
            const steps = card.steps;
            const moveCallback = () => {
                handleLanding(player, done);
            };
            
            if (steps < 0) {
                player.position = (player.position + steps + 40) % 40;
                updatePlayerPositions();
                handleLanding(player, done);
            } else {
                movePlayerSteps(player, steps, moveCallback);
            }
            return;
        }

        done();
    });
}

// =======================
// JAIL
// =======================

function sendPlayerToJail(player, callback) {
    const jailPosition = gameState.tileData.findIndex(t => t && t.type === 'jail');
    if (jailPosition !== -1) {
        player.position = jailPosition;
        player.inJail = true;
        player.jailTurns = 0;
        updatePlayerPositions();
        addLog(`Player ${player.id} was sent to Jail.`);
        showMessage(`Player ${player.id} is sent to Jail!`, () => {
            if (callback) callback();
        });
    } else if (callback) {
        callback();
    }
}

function handleJailAtTurnStart(player, afterDecision) {
    if (!player.inJail) {
        afterDecision();
        return;
    }

    if (player.money >= gameConfig.jailFine) {
        showPopup(
            `Player ${player.id}, you are in Jail.\nPay $${gameConfig.jailFine} to get out?`,
            [
                { label: 'Pay & Get Out', value: 'pay' },
                { label: 'Stay This Turn', value: 'stay' }
            ],
            choice => {
                if (choice === 'pay') {
                    player.money -= gameConfig.jailFine;
                    player.inJail = false;
                    player.jailTurns = 0;
                    updateMoneyDisplay();
                    handleBankruptcy(player);
                    updatePlayerPanel(player);
                    addLog(`Player ${player.id} paid $${gameConfig.jailFine} to leave Jail.`);
                    afterDecision();
                } else {
                    player.jailTurns += 1;
                    addLog(`Player ${player.id} stayed in Jail this turn.`);
                    afterDecision('skipTurn');
                }
            }
        );
    } else {
        showMessage(
            `Player ${player.id} is in Jail and cannot afford the fine.\nThey stay in Jail this turn.`,
            () => {
                player.jailTurns += 1;
                addLog(`Player ${player.id} remains in Jail (no money for fine).`);
                afterDecision('skipTurn');
            }
        );
    }
}

// =======================
// LANDING LOGIC
// =======================

function markTileAsOwned(position, playerId) {
    const tile = gameState.tiles[position];
    if (!tile) return;
    
    tile.classList.remove(
        'owned-player1',
        'owned-player2',
        'owned-player3',
        'owned-player4',
        'owned-player5',
        'owned-player6'
    );
    tile.classList.add(`owned-player${playerId}`);
}

function offerUpgradeIfPossible(player, tileData, position, done) {
    const level = getUpgradeLevel(position);
    if (level >= gameConfig.maxUpgradeLevel) {
        done();
        return;
    }
    if (!tileData.price) {
        done();
        return;
    }

    const upgradeCost = Math.round(
        tileData.price * gameConfig.houseUpgradeCostFactor * (level + 1)
    );
    if (player.money < upgradeCost) {
        done();
        return;
    }

    showPopup(
        `You own ${tileData.name}.\nUpgrade level: ${level} → ${level + 1} for $${upgradeCost}?`,
        [
            { label: 'Upgrade', value: 'yes' },
            { label: 'Skip', value: 'no' }
        ],
        choice => {
            if (choice === 'yes') {
                player.money -= upgradeCost;
                propertyUpgrades[position] = level + 1;
                updateMoneyDisplay();
                handleBankruptcy(player);
                updatePlayerPanel(player);
                addLog(`Player ${player.id} upgraded ${tileData.name} to level ${level + 1}.`);
                showMessage(`${tileData.name} is now level ${level + 1}.`, () => done());
            } else {
                done();
            }
        }
    );
}

function handleLanding(player, done) {
    const position = player.position;
    const tileData = gameState.tileData[position];
    if (!tileData) {
        done();
        return;
    }

    const type = tileData.type;

    if (type === 'go') {
        done();
        return;
    }

    if (type === 'freeparking') {
        if (gameConfig.useFreeParkingPot && gameState.freeParkingPot > 0) {
            const pot = gameState.freeParkingPot;
            player.money += pot;
            gameState.freeParkingPot = 0;
            updateMoneyDisplay();
            updatePlayerPanel(player);
            addLog(`Player ${player.id} collected $${pot} from Free Parking.`);
            showMessage(
                `Free Parking bonus!\nPlayer ${player.id} collects $${pot}.`,
                () => done()
            );
        } else {
            done();
        }
        return;
    }

    if (type === 'property' || type === 'railroad' || type === 'utility') {
        const ownerId = propertyOwners[position];

        if (!ownerId) {
            const price = tileData.price || 0;
            if (price <= 0) {
                done();
                return;
            }
            if (player.money < price) {
                showMessage(
                    `Player ${player.id} does not have enough to buy ${tileData.name}.`,
                    () => done()
                );
                return;
            }
            showPopup(
                `Player ${player.id}, buy ${tileData.name} for $${price}?`,
                [
                    { label: 'Buy', value: 'buy' },
                    { label: 'Skip', value: 'skip' }
                ],
                choice => {
                    if (choice === 'buy') {
                        player.money -= price;
                        propertyOwners[position] = player.id;
                        updateMoneyDisplay();
                        markTileAsOwned(position, player.id);
                        handleBankruptcy(player);
                        updatePlayerPanel(player);
                        addLog(`Player ${player.id} bought ${tileData.name} for $${price}.`);
                        showMessage(
                            `Player ${player.id} bought ${tileData.name}!`,
                            () => done()
                        );
                    } else {
                        done();
                    }
                }
            );
            return;
        }

        if (ownerId === player.id && type === 'property') {
            offerUpgradeIfPossible(player, tileData, position, done);
            return;
        }

        const owner = players.find(p => p.id === ownerId);
        const rent = calculateRent(tileData, ownerId, position);

        if (rent <= 0 || !owner) {
            done();
            return;
        }

        player.money -= rent;
        owner.money += rent;
        updateMoneyDisplay();
        handleBankruptcy(player);
        updatePlayerPanel(player);
        updatePlayerPanel(owner);
        addLog(
            `Player ${player.id} pays $${rent} rent to Player ${ownerId} for ${tileData.name}.`
        );

        showMessage(
            `Player ${player.id} pays $${rent} rent to Player ${ownerId} for ${tileData.name}.`,
            () => done()
        );
        return;
    }

    if (type === 'tax') {
        const amount = tileData.amount || 0;
        if (amount > 0) {
            player.money -= amount;
            if (gameConfig.useFreeParkingPot) {
                gameState.freeParkingPot += amount;
            }
            updateMoneyDisplay();
            handleBankruptcy(player);
            updatePlayerPanel(player);
            addLog(`Player ${player.id} paid $${amount} for ${tileData.name}.`);
            showMessage(
                `Player ${player.id} paid $${amount} for ${tileData.name}.`,
                () => done()
            );
        } else {
            done();
        }
        return;
    }

    if (type === 'chance') {
        const card = drawCard('chance');
        if (!card) {
            done();
            return;
        }
        applyCardEffect(player, card, done);
        return;
    }

    if (type === 'community') {
        const card = drawCard('community');
        if (!card) {
            done();
            return;
        }
        applyCardEffect(player, card, done);
        return;
    }

    if (type === 'jail') {
        done();
        return;
    }

    if (type === 'gotojail') {
        sendPlayerToJail(player, () => {
            done();
        });
        return;
    }

    done();
}

// =======================
// TURN SYSTEM
// =======================

function beginTurn() {
    if (gameState.turnPhase === "game_over") {
        rollButton.disabled = true;
        return;
    }

    if (players[gameState.currentPlayerIndex].isBankrupt) {
        const total = players.length;
        let nextIndex = gameState.currentPlayerIndex;
        for (let i = 0; i < total; i++) {
            nextIndex = (nextIndex + 1) % total;
            if (!players[nextIndex].isBankrupt) {
                gameState.currentPlayerIndex = nextIndex;
                break;
            }
        }
    }

    const player = players[gameState.currentPlayerIndex];
    addLog(`Player ${player.id}'s turn.`);

    updateMoneyDisplay();
    updateActivePlayerUI();
    updateActiveBoardUI();

    handleJailAtTurnStart(player, decision => {
        if (decision === 'skipTurn') {
            endTurn();
            return;
        }

        if (gameState.turnPhase === "game_over") {
            rollButton.disabled = true;
            return;
        }

        gameState.turnPhase = "waiting_for_roll";
        rollButton.disabled = false;
    });
}

function endTurn() {
    if (gameState.turnPhase === "game_over") return;

    const total = players.length;
    let nextIndex = gameState.currentPlayerIndex;

    for (let i = 0; i < total; i++) {
        nextIndex = (nextIndex + 1) % total;
        if (!players[nextIndex].isBankrupt) {
            gameState.currentPlayerIndex = nextIndex;
            beginTurn();
            return;
        }
    }

    endGame(null);
}

// =======================
// BUTTON HANDLERS
// =======================

rollButton.addEventListener('click', () => {
    if (gameState.turnPhase !== "waiting_for_roll") {
        showMessage("You cannot roll right now.");
        return;
    }

    const currentPlayer = players[gameState.currentPlayerIndex];
    if (currentPlayer.isBankrupt) {
        showMessage("This player is bankrupt and cannot play.");
        endTurn();
        return;
    }
    if (currentPlayer.inJail) {
        showMessage("You are in Jail this turn.");
        endTurn();
        return;
    }

    rollButton.disabled = true;
    gameState.turnPhase = "moving";

    const die1 = rollSingleDie();
    const die2 = rollSingleDie();
    const steps = die1 + die2;

    diceResultSpan.textContent = `${die1} + ${die2} = ${steps}`;
    gameState.dice.lastRoll = { d1: die1, d2: die2, total: steps };
    gameState.dice.history.push(gameState.dice.lastRoll);
    addLog(`Player ${currentPlayer.id} rolled ${die1} + ${die2} = ${steps}.`);

    movePlayerSteps(currentPlayer, steps, () => {
        handleLanding(currentPlayer, () => {
            if (gameState.turnPhase === "game_over") {
                return;
            }
            gameState.turnPhase = "turn_complete";
            endTurn();
        });
    });
});

resetButton.addEventListener('click', () => {
    showPopup(
        'Reset the board, dice, and money?',
        [
            { label: 'Yes', value: 'yes' },
            { label: 'No', value: 'no' }
        ],
        first => {
            if (first !== 'yes') return;

            showPopup(
                'Are you sure you want to Reset ALL progress?!',
                [
                    { label: 'Yes, reset', value: 'yes' },
                    { label: 'Cancel', value: 'no' }
                ],
                second => {
                    if (second !== 'yes') return;

                    diceResultSpan.textContent = '-';
                    gameState.dice.lastRoll = null;
                    gameState.dice.history = [];
                    gameState.freeParkingPot = 0;

                    players.forEach(player => {
                        player.position = 0;
                        player.money = startingMoney;
                        player.isBankrupt = false;
                        player.inJail = false;
                        player.jailTurns = 0;
                        player.jailFreeCards = 0;
                    });

                    updatePlayerPositions();
                    updateMoneyDisplay();

                    for (const key in propertyOwners) delete propertyOwners[key];
                    for (const key in propertyUpgrades) delete propertyUpgrades[key];

                    gameState.tiles.forEach(tile => {
                        tile.classList.remove(
                            'owned-player1',
                            'owned-player2',
                            'owned-player3',
                            'owned-player4',
                            'owned-player5',
                            'owned-player6'
                        );
                        tile.style.outline = '';
                        tile.style.boxShadow = '';
                    });

                    gameState.currentPlayerIndex = 0;
                    gameState.turnPhase = "waiting_for_roll";
                    rollButton.disabled = false;

                    logPanel.innerHTML = '';
                    addLog('Game reset.');

                    initDecks();
                    updateAllPlayerPanels();
                    beginTurn();
                }
            );
        }
    );
});

// =======================
// PLAYER COUNT SELECTION & INIT
// =======================

function askPlayerCount(callback) {
    const buttons = [];
    for (let n = gameConfig.minPlayers; n <= gameConfig.maxPlayers; n++) {
        buttons.push({ label: `${n} Players`, value: n });
    }

    showPopup(
        'How many players?\n(2–6)',
        buttons,
        value => {
            const num = Number(value);
            if (!num || num < gameConfig.minPlayers || num > gameConfig.maxPlayers) {
                callback(4);
            } else {
                callback(num);
            }
        }
    );
}

// =======================
// INIT
// =======================

function startGame() {
    initModal();
    initDecks();
    askPlayerCount(numPlayers => {
        initPlayers(numPlayers);
        updatePlayerPositions();
        updateMoneyDisplay();
        updateAllPlayerPanels();
        addLog(`Game started with ${numPlayers} players.`);
        beginTurn();
    });
}

// Start the game when page loads
window.addEventListener('DOMContentLoaded', startGame);