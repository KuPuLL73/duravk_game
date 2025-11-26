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

// --- Создание HTML карты (КЛАССИЧЕСКИЙ ДИЗАЙН) ---
function createCardElement(card) {
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.id = card.id;

    // Цвет
    if (card.suit === '♥' || card.suit === '♦') el.classList.add('red');
    else el.classList.add('black');

    // HTML структура: Угол левый, Центр, Угол правый
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

// Рендер руки игрока (ВЕЕР)
function renderPlayerHand() {
    const container = document.getElementById('player-hand');
    container.innerHTML = '';
    
    const cards = gameState.playerHand;
    const total = cards.length;
    const middle = (total - 1) / 2;

    cards.forEach((card, index) => {
        const el = createCardElement(card);
        el.classList.add('hand-card');

        // Логика веера:
        // Смещаем карты вправо (translateX), чтобы видеть левый угол
        // Поворачиваем (rotate)
        // Опускаем боковые карты (translateY)
        
        const offset = index - middle;
        const rotate = offset * 5;  // Поворот 5 градусов
        const x = offset * 40;      // Отступ 40px (достаточно чтобы видеть цифру)
        const y = Math.abs(offset) * 15; // Арка

        el.style.transform = `translateX(${x}px) translateY(${y}px) rotate(${rotate}deg)`;
        el.style.zIndex = index; // Каждая следующая карта поверх предыдущей

        el.onclick = () => onCardClick(card.id);
        container.appendChild(el);
    });
}

function renderTable() {
    const container = document.getElementById('table-zone');
    container.innerHTML = '';
    gameState.activeCards.forEach(move => {
        const pair = document.createElement('div');
        pair.className = 'card-pair';
        
        // Атака
        const c1 = createCardElement(move.attacker);
        pair.appendChild(c1);

        // Защита
        if (move.defender) {
            const c2 = createCardElement(move.defender);
            pair.appendChild(c2);
        }
        container.appendChild(pair);
    });
}

function renderOpponent() {
    const container = document.getElementById('opponent-hand');
    container.innerHTML = '';
    for(let i=0; i<gameState.opponentHand.length; i++) {
        const back = document.createElement('div');
        back.className = 'card-back';
        container.appendChild(back);
    }
}

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
        container.appendChild(stack);
    }
}

function updateButtons() {
    const takeBtn = document.getElementById('takeBtn');
    const passBtn = document.getElementById('passBtn');
    
    takeBtn.style.display = 'none';
    passBtn.style.display = 'none';

    if (gameState.activeCards.length > 0) {
        // Если атакует бот -> Мы берем
        if (gameState.attacker === 'opponent') {
            takeBtn.style.display = 'block';
        } 
        // Если атакуем мы
        else if (gameState.attacker === 'player') {
            // Если последняя карта отбита -> Можно Бито
            const last = gameState.activeCards[gameState.activeCards.length - 1];
            if (last && last.defender) {
                passBtn.style.display = 'block';
            }
        }
    }
}

// --- ИГРОВАЯ ЛОГИКА ---

function onCardClick(id) {
    tg.HapticFeedback.impactOccurred('light');

    if (gameState.activeCards.length === 0) {
        // Первый ход
        if (gameState.attacker === 'player') makeMove(id);
    } else {
        // Бой
        if (gameState.attacker === 'player') makeMove(id); // Подкинуть
        else playerDefend(id); // Отбиться
    }
}

function makeMove(id) {
    const idx = gameState.playerHand.findIndex(c => c.id == id);
    if (idx === -1) return;
    const card = gameState.playerHand[idx];

    // Проверка подкидывания
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
    
    // Бот думает
    setTimeout(botPlay, 1000);
}

function playerDefend(id) {
    const idx = gameState.playerHand.findIndex(c => c.id == id);
    const card = gameState.playerHand[idx];
    const lastMove = gameState.activeCards[gameState.activeCards.length - 1];

    if (canBeat(lastMove.attacker, card)) {
        gameState.playerHand.splice(idx, 1);
        lastMove.defender = card;
        gameState.attacker = 'player'; // Ждем БИТО
        updateUI();
    } else {
        tg.HapticFeedback.impactOccurred('error');
    }
}

// --- ВСПОМОГАТЕЛЬНЫЕ ---

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

    // 1. Атака (стол пуст)
    if (gameState.activeCards.length === 0) {
        if (gameState.opponentHand.length === 0) return;
        const card = gameState.opponentHand.shift(); // Берем первую
        gameState.activeCards.push({ attacker: card, defender: null });
        gameState.attacker = 'player';
        updateUI();
        return;
    }

    // 2. Защита
    const last = gameState.activeCards[gameState.activeCards.length - 1];
    if (!last.defender) {
        let defIdx = gameState.opponentHand.findIndex(c => canBeat(last.attacker, c));
        if (defIdx !== -1) {
            const card = gameState.opponentHand.splice(defIdx, 1)[0];
            last.defender = card;
            gameState.attacker = 'player'; // Отбился
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
// Перемешка
for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
}

gameState.deck = deck;
// Раздача
for(let i=0; i<6; i++) {
    gameState.playerHand.push(gameState.deck.pop());
    gameState.opponentHand.push(gameState.deck.pop());
}
gameState.trump = gameState.deck.pop();
gameState.trumpSuit = gameState.trump.suit;
gameState.deck.unshift(gameState.trump);

updateUI();
