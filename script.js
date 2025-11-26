const tg = window.Telegram.WebApp; 
tg.ready();
if (!tg.isExpanded) tg.expand();

// --- ДАННЫЕ ---
const suits = ['♠', '♥', '♦', '♣'];
const values = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

let gameState = {
    deck: [], trump: null, trumpSuit: null, playerHand: [], opponentHand: [], 
    activeCards: [], attacker: 'player' 
};

// --- СОЗДАНИЕ КАРТ ---
function createDeck() {
    const deck = [];
    let idCounter = 1;
    for (const suit of suits) {
        for (const value of values) {
            deck.push({ id: idCounter++, suit, value });
        }
    }
    return deck;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Новая верстка карты (Большая)
function createCardElement(card) {
    const cardDiv = document.createElement('div');
    cardDiv.classList.add('card');
    cardDiv.dataset.cardId = card.id;
    
    const isRed = (card.suit === '♥' || card.suit === '♦');
    cardDiv.classList.add(isRed ? 'red' : 'black');

    cardDiv.innerHTML = `
        <div class="card-top">
            <span>${card.value}</span> <span>${card.suit}</span>
        </div>
        <div class="card-center">${card.suit}</div>
        <div class="card-bottom">
            <span>${card.value}</span> <span>${card.suit}</span>
        </div>
    `;
    return cardDiv;
}

// --- ЛОГИКА ОТОБРАЖЕНИЯ UI ---

function updateUI() {
    renderPlayerHand();
    renderTable();
    renderStatic();
    updateButtons();
}

function updateButtons() {
    const actionBar = document.getElementById('action-bar');
    const takeBtn = document.getElementById('takeBtn');
    const passBtn = document.getElementById('passBtn');

    takeBtn.style.display = 'none';
    passBtn.style.display = 'none';
    actionBar.classList.remove('visible');

    // Логика кнопок
    if (gameState.activeCards.length > 0) {
        if (gameState.attacker === 'opponent') {
            // Бот атакует -> Мы можем взять
            takeBtn.style.display = 'block';
            actionBar.classList.add('visible');
        } else if (gameState.attacker === 'player') {
            // Мы атакуем. Если есть отбитая карта -> Можно нажать Бито
            const lastMove = gameState.activeCards[gameState.activeCards.length - 1];
            if (lastMove && lastMove.defender) {
                passBtn.style.display = 'block';
                actionBar.classList.add('visible');
            }
        }
    }
}

// --- РЕНДЕРИНГ ---

function renderPlayerHand() {
    const container = document.getElementById('player-hand');
    container.innerHTML = ''; 
    const cards = gameState.playerHand;
    const total = cards.length;
    const middle = (total - 1) / 2;

    cards.forEach((card, index) => {
        const el = createCardElement(card);
        el.classList.add('hand-card');
        
        // Настройка веера для БОЛЬШИХ карт
        const offset = index - middle;
        const rotate = offset * 5;     // Угол поворота
        const x = offset * 35;         // Смещение по горизонтали (чтобы видеть карты)
        const y = Math.abs(offset) * 10; // Смещение аркой вниз
        
        el.style.transform = `translateX(${x}px) translateY(${y}px) rotate(${rotate}deg)`;
        el.style.zIndex = index;

        el.addEventListener('click', () => onCardClick(card.id));
        container.appendChild(el);
    });
}

function renderTable() {
    const container = document.getElementById('table-zone');
    container.innerHTML = '';
    
    gameState.activeCards.forEach(move => {
        const stack = document.createElement('div');
        stack.className = 'card-stack';
        
        const card1 = createCardElement(move.attacker);
        stack.appendChild(card1);

        if (move.defender) {
            const card2 = createCardElement(move.defender);
            stack.appendChild(card2);
        }
        container.appendChild(stack);
    });
}

function renderStatic() {
    // Соперник
    const oppContainer = document.getElementById('opponent-hand');
    oppContainer.innerHTML = '';
    for(let i=0; i<gameState.opponentHand.length; i++) {
        const back = document.createElement('div');
        back.className = 'card-back';
        oppContainer.appendChild(back);
    }

    // Колода
    const deckContainer = document.getElementById('deck-zone');
    deckContainer.innerHTML = '';
    if(gameState.trump) {
        // Козырь
        const trump = createCardElement(gameState.trump);
        trump.classList.add('trump-card');
        // Делаем козырь визуально меньше или таким же, как в руке
        trump.style.transform = "scale(0.8) rotate(90deg) translateX(20px)";
        deckContainer.appendChild(trump);
    }
    if(gameState.deck.length > 0) {
        const stack = document.createElement('div');
        stack.className = 'card-back deck-stack';
        deckContainer.appendChild(stack);
    }
}


// --- ИГРОВАЯ ЛОГИКА ---

function onCardClick(id) {
    tg.HapticFeedback.impactOccurred('light');

    if (gameState.activeCards.length === 0) {
        // Первый ход
        if (gameState.attacker === 'player') makeMove(id);
    } else {
        // Бой идет
        if (gameState.attacker === 'player') {
             makeMove(id); // Подкидывание
        } else {
             playerDefend(id); // Защита
        }
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
    
    gameState.attacker = 'opponent'; // Передаем ход боту
    updateUI();
    
    // Бот отвечает
    if (gameState.activeCards.length === 1 || !gameState.activeCards[gameState.activeCards.length-1].defender) {
        setTimeout(botPlay, 1000);
    }
}

function playerDefend(id) {
    const idx = gameState.playerHand.findIndex(c => c.id == id);
    const card = gameState.playerHand[idx];
    
    const lastMove = gameState.activeCards[gameState.activeCards.length - 1];
    
    if (canBeat(lastMove.attacker, card)) {
        gameState.playerHand.splice(idx, 1);
        lastMove.defender = card;
        gameState.attacker = 'player'; // Ход игрока (нажать Бито)
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

// --- БОТ ---
function botPlay() {
    if (gameState.attacker !== 'opponent') return;

    // 1. Бот Атакует (если стол пуст)
    if (gameState.activeCards.length === 0) {
        if (gameState.opponentHand.length === 0) return;
        const card = gameState.opponentHand.shift();
        gameState.activeCards.push({ attacker: card, defender: null });
        gameState.attacker = 'player';
        updateUI();
        return;
    }

    // 2. Бот Защищается
    const lastMove = gameState.activeCards[gameState.activeCards.length - 1];
    if (!lastMove.defender) {
        // Ищем карту
        let defIdx = -1;
        // Простая логика: ищем первую подходящую
        for(let i=0; i<gameState.opponentHand.length; i++) {
            if (canBeat(lastMove.attacker, gameState.opponentHand[i])) {
                defIdx = i; break;
            }
        }

        if (defIdx !== -1) {
            // Отбился
            const card = gameState.opponentHand.splice(defIdx, 1)[0];
            lastMove.defender = card;
            gameState.attacker = 'opponent'; // Бот может подкинуть? Нет, пока передаем ход игроку "Бито"
            // В упрощенной версии сразу даем игроку Бито
            gameState.attacker = 'player';
            updateUI();
        } else {
            // Бот берет
            botTake();
        }
    }
}

function botTake() {
    // Бот забирает все карты
    gameState.activeCards.forEach(m => {
        gameState.opponentHand.push(m.attacker);
        if(m.defender) gameState.opponentHand.push(m.defender);
    });
    gameState.activeCards = [];
    drawCards();
    gameState.attacker = 'player'; // Игрок ходит
    updateUI();
}

// --- ДЕЙСТВИЯ ---

function playerPass() { // БИТО
    gameState.activeCards = [];
    drawCards();
    gameState.attacker = 'opponent'; // Ход бота
    updateUI();
    setTimeout(botPlay, 1000);
}

function playerTake() { // БЕРУ
    gameState.activeCards.forEach(m => {
        gameState.playerHand.push(m.attacker);
        if(m.defender) gameState.playerHand.push(m.defender);
    });
    gameState.activeCards = [];
    drawCards();
    gameState.attacker = 'opponent'; // Ходит бот (т.к. мы взяли)
    updateUI();
    setTimeout(botPlay, 1000);
}

function drawCards() {
    while(gameState.playerHand.length < 6 && gameState.deck.length > 0) 
        gameState.playerHand.push(gameState.deck.pop());
    while(gameState.opponentHand.length < 6 && gameState.deck.length > 0) 
        gameState.opponentHand.push(gameState.deck.pop());
    
    // Сортировка
    gameState.playerHand.sort((a,b) => values.indexOf(a.value) - values.indexOf(b.value));
}

// --- START ---
document.getElementById('takeBtn').addEventListener('click', playerTake);
document.getElementById('passBtn').addEventListener('click', playerPass);

let deck = shuffle(createDeck());
// Раздача
for(let i=0; i<6; i++) {
    gameState.playerHand.push(deck.pop());
    gameState.opponentHand.push(deck.pop());
}
gameState.trump = deck.pop();
gameState.trumpSuit = gameState.trump.suit;
gameState.deck = deck;
// Козырь в начало колоды (низ стопки)
gameState.deck.unshift(gameState.trump);

updateUI();
