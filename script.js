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
        overlap = 50; 
    } else if (total <= 10) {
        angleRange = 60; 
        overlap = 40; 
    } else { 
        angleRange = 70; 
        overlap = 30; 
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

// Рендер руки соперника
function renderOpponent() {
    const container = document.getElementById('opponent-hand');
    container.innerHTML = '';
    
    const count = gameState.opponentHand.length;
    
    const arcAngle = 40; 
    const startAngle = -arcAngle / 2;
    const step = count > 1 ? arcAngle / (count - 1) : 0;
    const cardWidth = 45; 
    const overlap = 15; 

    const handWidth = count * overlap + (cardWidth - overlap);

    for(let i=0; i<count; i++) {
        const back = document.createElement('div');
        back.className = 'card-back';
        
        const rotate = count > 1 ? startAngle + (step * i) : 0;
        const xOffset = (i * overlap) - (handWidth / 2); 

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
        
        const c1 = createCardElement(move.attacker);
        pair.appendChild(c1);

        if (move.defender) {
            const c2 = createCardElement(move.defender);
            pair.appendChild(c2);
        }
        container.appendChild(pair);
    });
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
            // Кнопка "БЕРУ" появляется, когда игрок защищается
            takeBtn.style.display = 'block';
        } 
        else if (gameState.attacker === 'player') {
            // Кнопка "БИТО" появляется, когда игрок атакует и все карты покрыты
            const allDefended = gameState.activeCards.every(m => m.defender);
            if (allDefended) {
                passBtn.style.display = 'block';
            }
        }
    }
}

// --- ИГРОВАЯ ЛОГИКА ---

function onCardClick(id) {
    tg.HapticFeedback.impactOccurred('light');

    if (gameState.activeCards.length === 0) {
        // Начало атаки игрока
        if (gameState.attacker === 'player') makeMove(id);
    } else {
        // Подбрасывание или защита
        if (gameState.attacker === 'player') makeMove(id);
        else playerDefend(id); // Игрок защищается
    }
}

function makeMove(id) {
    const idx = gameState.playerHand.findIndex(c => c.id == id);
    if (idx === -1) return;
    const card = gameState.playerHand[idx];

    // Проверка на возможность подбрасывания
    if (gameState.activeCards.length > 0) {
        const validValues = gameState.activeCards.flatMap(m => [m.attacker.value, m.defender?.value]).filter(v=>v);
        if (!validValues.includes(card.value)) {
            tg.HapticFeedback.impactOccurred('error');
            return;
        }
    }

    gameState.playerHand.splice(idx, 1);
    gameState.activeCards.push({ attacker: card, defender: null });
    
    // Если игрок только начал атаку, ход переходит к защитнику-боту.
    if (gameState.activeCards.length === 1 && gameState.attacker === 'player') {
        gameState.attacker = 'opponent'; 
    }

    updateUI();
    
    // Если карты не покрыты, бот должен защищаться немедленно
    if (gameState.attacker === 'opponent') {
        setTimeout(botPlay, 1000);
    }
}

// ФИКС ОШИБКИ: Игрок остается защитником
function playerDefend(id) {
    // Проверка, что игрок действительно защищается (есть непокрытая карта)
    const lastUncovered = gameState.activeCards.find(m => !m.defender);
    if (!lastUncovered) return; // Все покрыто, это ошибка клика

    const idx = gameState.playerHand.findIndex(c => c.id == id);
    const card = gameState.playerHand[idx];
    
    if (canBeat(lastUncovered.attacker, card)) {
        gameState.playerHand.splice(idx, 1);
        lastUncovered.defender = card;
        
        // !!! КЛЮЧЕВОЙ ФИКС: НЕ МЕНЯЕМ gameState.attacker. Игрок все еще защитник.
        
        updateUI();

        // После успешной защиты, бот (атакующий) решает, подкинуть ли еще карту.
        setTimeout(botThrowInNextCard, 500); 
        
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

// --- ЛОГИКА БОТА ---

// НОВАЯ ФУНКЦИЯ: Бот подкидывает карту после успешной защиты игрока
function botThrowInNextCard() {
    if (gameState.attacker !== 'opponent') return; 

    // 1. Собираем все ранги на столе
    const tableValues = gameState.activeCards.flatMap(m => [m.attacker.value, m.defender?.value]).filter(v => v);

    // 2. Ищем карту, которую бот может подкинуть
    let throwInCardIdx = gameState.opponentHand.findIndex(card => tableValues.includes(card.value));
    
    // 3. Проверка лимитов защиты
    const totalCardsOnTable = gameState.activeCards.length * 2; // Максимум, сколько уже лежит
    const maxAttackLimit = Math.min(6, gameState.playerHand.length); // Максимальное число карт для подбрасывания

    if (throwInCardIdx !== -1 && gameState.activeCards.length < maxAttackLimit) {
        const card = gameState.opponentHand.splice(throwInCardIdx, 1)[0];
        gameState.activeCards.push({ attacker: card, defender: null });
        
        // Состояние остается прежним: игрок должен защищаться.
        updateUI();
    } else {
        // Бот не может или не хочет больше подкидывать. Атака завершена.
        // Передаем ход игроку, чтобы он нажал "БИТО".
        gameState.attacker = 'player'; 
        updateUI();
    }
}

// Бот защищается (когда игрок атаковал) или атакует с нуля (когда игрок забрал)
function botPlay() {
    if (gameState.attacker !== 'opponent') {
        // Если бот должен атаковать с нуля (после того как игрок забрал)
        if (gameState.activeCards.length === 0) {
            if (gameState.opponentHand.length === 0) return;
            const card = gameState.opponentHand.shift(); 
            gameState.activeCards.push({ attacker: card, defender: null });
            gameState.attacker = 'player'; // Игрок должен защищаться
            updateUI();
        }
        return;
    }

    // Если бот должен защищаться (когда игрок атакует)
    const last = gameState.activeCards[gameState.activeCards.length - 1];
    if (last && !last.defender) {
        let defIdx = gameState.opponentHand.findIndex(c => canBeat(last.attacker, c));
        
        if (defIdx !== -1) {
            // Успешная защита
            const card = gameState.opponentHand.splice(defIdx, 1)[0];
            last.defender = card;
            
            gameState.attacker = 'player'; // После успешной защиты бот может подкинуть (игрок будет в makeMove)
            updateUI();
            
            // Бот может подкинуть больше карт.
            setTimeout(botThrowInNextCardForDefense, 500); 

        } else {
            // Бот не может защититься -> Бот берет.
            botTake();
        }
    }
}

// Добавим отдельную функцию для подбрасывания ботом, когда он защищается
function botThrowInNextCardForDefense() {
    if (gameState.attacker !== 'player') return; // Только если игрок атакует

    const tableValues = gameState.activeCards.flatMap(m => [m.attacker.value, m.defender?.value]).filter(v => v);
    
    let throwInCardIdx = gameState.playerHand.findIndex(card => tableValues.includes(card.value));
    
    if (throwInCardIdx !== -1) {
        // Если игрок может подкинуть, он ждет клика. 
        // Если нет, бот (защитник) ничего не делает, ждет клика "БИТО" от игрока.
        // Здесь мы просто выходим, полагаясь на клик игрока (makeMove).
        return;
    } else {
        // Игрок не может больше подкидывать. Бот (защитник) ждет клика "БИТО"
    }
}


function botTake() {
    gameState.activeCards.forEach(m => {
        gameState.opponentHand.push(m.attacker);
        if(m.defender) gameState.opponentHand.push(m.defender);
    });
    gameState.activeCards = [];
    drawCards();
    gameState.attacker = 'player'; // Игрок начинает следующую атаку
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
    gameState.attacker = 'opponent'; // Бот начинает следующую атаку
    updateUI();
    setTimeout(botPlay, 1000);
};

document.getElementById('passBtn').onclick = () => {
    gameState.activeCards = [];
    drawCards();
    // Если игрок был атакующим, он пропускает ход. Начинает бот.
    if (gameState.attacker === 'player') { 
        gameState.attacker = 'opponent'; 
        setTimeout(botPlay, 1000);
    } 
    // Если игрок был защитником (после того как бот остановился), он пропускает ход. Начинает игрок.
    else if (gameState.attacker === 'opponent') {
        gameState.attacker = 'player';
    }
    updateUI();
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
