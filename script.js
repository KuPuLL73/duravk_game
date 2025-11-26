const tg = window.Telegram.WebApp;
tg.ready();
if (!tg.isExpanded) tg.expand();

// Данные
const suits = ['♠', '♥', '♦', '♣'];
const values = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Состояние
let gameState = {
    deck: [], trump: null, trumpSuit: null, 
    playerHand: [], opponentHand: [], 
    activeCards: [], attacker: 'player' 
};

// --- Создание HTML карты ---
function createCardElement(card, isBack = false) {
    if (isBack) {
        const el = document.createElement('div');
        el.className = 'card-back';
        return el;
    }

    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.id = card.id;

    if (card.suit === '♥' || card.suit === '♦') el.classList.add('red');
    else el.classList.add('black');

    el.innerHTML = `
        <div class="corner top-left">
            <span>${card.value}</span>
            <span>${card.suit}</span>
        </div>
        <div class="main-suit">${card.suit}</div>
        <div class="corner bottom-right">
            <span>${card.value}</span>
            <span>${card.suit}</span>
        </div>
    `;
    return el;
}

// --- UI Логика ---

function updateUI() {
    renderPlayerHand();
    renderTable();
    renderOpponent();
    renderDeck();
    updateButtons();
}

// Рендер руки игрока (ДИНАМИЧЕСКАЯ ПЛОТНОСТЬ)
function renderPlayerHand() {
    const container = document.getElementById('player-hand');
    container.innerHTML = '';
    
    const cards = gameState.playerHand;
    const total = cards.length;
    const cardWidth = 90; 
    
    // Динамическая настройка веера в зависимости от количества карт
    let angleRange, overlap;

    if (total <= 6) {
        angleRange = 40; 
        overlap = 50; // Высокое перекрытие (плотный веер)
    } else if (total <= 10) {
        angleRange = 60; 
        overlap = 40; // Среднее перекрытие
    } else { // 11+ карт
        angleRange = 70; 
        overlap = 30; // Минимальное перекрытие
    }
    
    const angleStep = total > 1 ? angleRange / (total - 1) : 0;
    const startAngle = -angleRange / 2;

    const handWidth = total * overlap + (cardWidth - overlap);

    cards.forEach((card, index) => {
        const el = createCardElement(card);
        el.classList.add('hand-card');

        const rotate = startAngle + (angleStep * index);
        const xTranslate = (index * overlap) - (handWidth / 2);
        
        const middleOffset = Math.abs(index - (total - 1) / 2);
        const yTranslate = middleOffset * 10; 
        
        el.style.transform = `translateX(${xTranslate}px) translateY(${yTranslate}px) rotate(${rotate}deg)`;
        el.style.zIndex = index; 

        el.onclick = () => onCardClick(card.id);
        container.appendChild(el);
    });
}

// Рендер руки соперника (ЦЕНТРОВКА И МЕНЬШИЙ ВЕЕР)
function renderOpponent() {
    const container = document.getElementById('opponent-hand');
    container.innerHTML = '';
    
    const count = gameState.opponentHand.length;
    // Параметры веера, соответствующие новому, меньшему размеру (см. styles.css .top-player .card-back)
    const arcAngle = 40; // Чуть больше угол
    const startAngle = -arcAngle / 2;
    const step = count > 1 ? arcAngle / (count - 1) : 0;
    const cardWidth = 45; // Уменьшенная ширина рубашки
    const overlap = 15; // Уменьшенное наложение

    const handWidth = count * overlap + (cardWidth - overlap);

    for(let i=0; i<count; i++) {
        const back = document.createElement('div');
        back.className = 'card-back';
        
        const rotate = count > 1 ? startAngle + (step * i) : 0;
        const xOffset = (i * overlap) - (handWidth / 2); // Центрирование

        // Сдвиг Y, чтобы карты были видны
        back.style.transform = `translateX(${xOffset}px) translateY(15px) rotate(${rotate}deg)`; 
        back.style.zIndex = i;
        container.appendChild(back);
    }
}

function renderTable() {
    const container = document.getElementById('table-zone');
    container.innerHTML = '';
    gameState.activeCards.forEach(move => {
        const pair = document.createElement('div');
        pair.className = 'card-pair';
        
        // Атакующая карта (первая, z-index 1)
        const c1 = createCardElement(move.attacker);
        pair.appendChild(c1);

        // Защищающая карта (вторая, z-index 2, с офсетом в CSS)
        if (move.defender) {
            const c2 = createCardElement(move.defender);
            pair.appendChild(c2);
        }
        container.appendChild(pair);
    });
}

// Рендер колоды (Без изменений)
function renderDeck() {
    const container = document.getElementById('deck-zone');
    container.innerHTML = '';
    
    if (gameState.trump) {
        const trump = createCardElement(gameState.trump);
        trump.classList.add('trump-card');
        container.appendChild(trump);
    }
    
    if (gameState.deck.length > 0) {
        const stack = document.createElement('div');
        stack.className = 'card-back deck-stack';

        const countEl = document.createElement('div');
        countEl.className = 'deck-count';
        countEl.textContent = gameState.deck.length;
        stack.appendChild(countEl); 
        
        container.appendChild(stack);
    }
}

function updateButtons() {
    const takeBtn = document.getElementById('takeBtn');
    const passBtn = document.getElementById('passBtn');
    
    takeBtn.style.display = 'none';
    passBtn.style.display = 'none';

    if (gameState.activeCards.length > 0) {
        if (gameState.attacker === 'opponent') {
            takeBtn.style.display = 'block';
        } 
        else if (gameState.attacker === 'player') {
            const last = gameState.activeCards[gameState.activeCards.length - 1];
            if (last && last.defender) {
                passBtn.style.display = 'block';
            }
        }
    }
}

// --- ИГРОВАЯ ЛОГИКА (Не изменена) ---

function onCardClick(id) {
    tg.HapticFeedback.impactOccurred('light');

    if (gameState.activeCards.length === 0) {
        if (gameState.attacker === 'player') makeMove(id);
    } else {
        if (gameState.attacker === 'player') makeMove(id);
        else playerDefend(id);
    }
}

function makeMove(id) {
    const idx = gameState.playerHand.findIndex(c => c.id == id);
    if (idx === -1) return;
    const card = gameState.playerHand[idx];

    if (gameState.activeCards.length > 0) {
        const validValues = gameState.activeCards.flatMap(m => [m.attacker.value, m.defender?.value]).filter(v=>v);
        if (!validValues.includes(card.value)) {
            tg.HapticFeedback.impactOccurred('error');
            return;
        }
    }

    gameState.playerHand.splice(idx, 1);
    gameState.activeCards.push({ attacker: card, defender: null });
    
    gameState.attacker = 'opponent'; 
    updateUI();
    
    setTimeout(botPlay, 1000);
}

function playerDefend(id) {
    const idx = gameState.playerHand.findIndex(c => c.id == id);
    const card = gameState.playerHand[idx];
    const lastMove = gameState.activeCards[gameState.activeCards.length - 1];

    if (canBeat(lastMove.attacker, card)) {
        gameState.playerHand.splice(idx, 1);
        lastMove.defender = card;
        gameState.attacker = 'player'; 
        updateUI();
    } else {
        tg.HapticFeedback.impactOccurred('error');
    }
}

function canBeat(atk, def) {
    if (atk.suit === def.suit) return values.indexOf(def.value) > values.indexOf(atk.value);
    if (def.suit === gameState.trumpSuit) return true;
    return false;
}

function createDeckStruct() {
    const d = []; let id=1;
    suits.forEach(s => values.forEach(v => d.push({id: id++, suit: s, value: v})));
    return d;
}

// --- БОТ ---
function botPlay() {
    if (gameState.attacker !== 'opponent') return;

    if (gameState.activeCards.length === 0) {
        if (gameState.opponentHand.length === 0) return;
        const card = gameState.opponentHand.shift(); 
        gameState.activeCards.push({ attacker: card, defender: null });
        gameState.attacker = 'player';
        updateUI();
        return;
    }

    const last = gameState.activeCards[gameState.activeCards.length - 1];
    if (!last.defender) {
        let defIdx = gameState.opponentHand.findIndex(c => canBeat(last.attacker, c));
        if (defIdx !== -1) {
            const card = gameState.opponentHand.splice(defIdx, 1)[0];
            last.defender = card;
            gameState.attacker = 'player';
            updateUI();
        } else {
            botTake();
        }
    }
}

function botTake() {
    gameState.activeCards.forEach(m => {
        gameState.opponentHand.push(m.attacker);
        if(m.defender) gameState.opponentHand.push(m.defender);
    });
    gameState.activeCards = [];
    drawCards();
    gameState.attacker = 'player';
    updateUI();
}

// --- КНОПКИ ---

document.getElementById('takeBtn').onclick = () => {
    gameState.activeCards.forEach(m => {
        gameState.playerHand.push(m.attacker);
        if(m.defender) gameState.playerHand.push(m.defender);
    });
    gameState.activeCards = [];
    drawCards();
    gameState.attacker = 'opponent';
    updateUI();
    setTimeout(botPlay, 1000);
};

document.getElementById('passBtn').onclick = () => {
    gameState.activeCards = [];
    drawCards();
    gameState.attacker = 'opponent';
    updateUI();
    setTimeout(botPlay, 1000);
};

function drawCards() {
    while(gameState.playerHand.length < 6 && gameState.deck.length > 0) gameState.playerHand.push(gameState.deck.pop());
    while(gameState.opponentHand.length < 6 && gameState.deck.length > 0) gameState.opponentHand.push(gameState.deck.pop());
    gameState.playerHand.sort((a,b) => values.indexOf(a.value) - values.indexOf(b.value));
}

// --- START ---
let deck = createDeckStruct();
for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
}

gameState.deck = deck;
for(let i=0; i<6; i++) {
    gameState.playerHand.push(gameState.deck.pop());
    gameState.opponentHand.push(gameState.deck.pop());
}
gameState.trump = gameState.deck.pop();
gameState.trumpSuit = gameState.trump.suit;
gameState.deck.unshift(gameState.trump);

updateUI();
