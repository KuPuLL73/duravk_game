// *** ОБЯЗАТЕЛЬНАЯ ИНИЦИАЛИЗАЦИЯ TG ***
const tg = window.Telegram.WebApp; 

// --- ГЛОБАЛЬНЫЕ ДАННЫЕ И СОСТОЯНИЕ ---
const suits = ['♠', '♥', '♦', '♣'];
const values = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const playerProfile = {
    balance: 100,
    activeSkin: 'default' 
};

// ГЛАВНЫЙ ОБЪЕКТ СОСТОЯНИЯ ИГРЫ
let gameState = {
    deck: [], trump: null, trumpSuit: null, playerHand: [], opponentHand: [], 
    activeCards: [], attacker: 'player' 
};

// --- ФУНКЦИИ КОЛОДЫ И ПРАВИЛ ---

function createDeck() {
    const deck = [];
    let idCounter = 1;
    for (const suit of suits) {
        for (const value of values) {
            deck.push({
                id: idCounter++,
                suit: suit,
                value: value,
                isTrump: false,
                isPlayed: false
            });
        }
    }
    return deck;
}

function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
    return array;
}

function canBeat(attacker, defender, trumpSuit) {
    if (attacker.suit !== defender.suit) {
        if (defender.suit === trumpSuit && attacker.suit !== trumpSuit) {
            return true;
        }
        return false;
    }
    return values.indexOf(defender.value) > values.indexOf(attacker.value);
}

function isCardValidForThrowIn(card) {
    if (gameState.activeCards.length === 0) {
        return true;
    }
    
    const activeValues = gameState.activeCards.flatMap(move => [
        move.attacker.value, 
        move.defender ? move.defender.value : null
    ]).filter(v => v !== null);

    return activeValues.includes(card.value);
}

function checkWinCondition() {
    const deckEmpty = gameState.deck.length === 0;

    if (gameState.playerHand.length === 0 && deckEmpty) {
        alert("🎉 ПОБЕДА! Вы вышли из игры!");
        return true;
    }
    
    if (gameState.opponentHand.length === 0 && deckEmpty) {
        alert("😭 ПОРАЖЕНИЕ! Соперник вышел из игры.");
        return true;
    }

    return false;
}

function drawCards(playerKey) {
    const hand = gameState[playerKey];
    while (hand.length < 6 && gameState.deck.length > 0) {
        const card = gameState.deck.pop();
        hand.push(card);
    }
    
    hand.sort((a, b) => {
        if (a.suit < b.suit) return -1;
        if (a.suit > b.suit) return 1;
        return values.indexOf(a.value) - values.indexOf(b.value);
    });

    checkWinCondition(); 
}


// --- ЛОГИКА ИИ СОПЕРНИКА (БОТ) ---

function botTakeCards() {
    gameState.activeCards.forEach(move => {
        gameState.opponentHand.push(move.attacker);
        if (move.defender) {
            gameState.opponentHand.push(move.defender);
        }
    });
    
    gameState.activeCards = [];
    
    gameState.opponentHand.sort((a, b) => {
        if (a.suit < b.suit) return -1;
        if (a.suit > b.suit) return 1;
        return values.indexOf(a.value) - values.indexOf(b.value);
    });

    drawCards('playerHand');
    drawCards('opponentHand');

    gameState.attacker = 'player'; 
    
    renderGameStatic();
    renderTable(); 
    renderPlayerHand();
    updateMoveButtonsVisibility();
}

function botDefend() {
    const lastMoveIndex = gameState.activeCards.length - 1;
    const currentAttacker = gameState.activeCards[lastMoveIndex].attacker;

    let cardToDefend = null;
    let cardIndex = -1;

    for (let i = 0; i < gameState.opponentHand.length; i++) {
        const potentialDefender = gameState.opponentHand[i];
        if (canBeat(currentAttacker, potentialDefender, gameState.trumpSuit)) {
            cardToDefend = potentialDefender;
            cardIndex = i;
            break; 
        }
    }

    if (cardToDefend) {
        gameState.opponentHand.splice(cardIndex, 1);
        gameState.activeCards[lastMoveIndex].defender = cardToDefend;
        
        checkWinCondition(); 
        
        gameState.attacker = 'player';
        
    } else {
        botTakeCards();
        return;
    }

    renderGameStatic();
    renderTable(); 
    renderPlayerHand(); 
    updateMoveButtonsVisibility();
}

function botAttack() {
    if (gameState.opponentHand.length === 0) return;

    const cardToAttack = gameState.opponentHand.shift(); 

    gameState.activeCards.push({
        attacker: cardToAttack,
        defender: null
    });

    checkWinCondition(); 

    gameState.attacker = 'player'; 

    renderGameStatic(); 
    renderTable();      
    updateMoveButtonsVisibility();
}

function botPlay() {
    setTimeout(() => {
        if (gameState.attacker === 'opponent') {
            if (gameState.activeCards.length > 0) {
                botDefend();
            } else {
                botAttack();
            }
        }
    }, 1000); 
}

// --- ФУНКЦИИ ОТРОВИСКИ И ОСНОВНАЯ ЛОГИКА ---

function createCardElement(card) {
    const cardDiv = document.createElement('div');
    cardDiv.classList.add('card');
    cardDiv.dataset.cardId = card.id;
    
    const isRed = (card.suit === '♥' || card.suit === '♦');
    cardDiv.classList.add(isRed ? 'red' : 'black');

    cardDiv.innerHTML = `
        <div class="card-value">${card.value}</div>
        <div class="card-suit">${card.suit}</div>
        <div class="card-bottom">
            <div class="card-value">${card.value}</div>
            <div class="card-suit-small">${card.suit}</div>
        </div>
    `;
    return cardDiv;
}

function updateMoveButtonsVisibility() {
    const moveBtnsEl = document.getElementById('move-btns');
    let shouldShow = false;

    if (gameState.activeCards.length > 0) {
        if (gameState.attacker === 'opponent') {
            shouldShow = true; 
        } else if (gameState.attacker === 'player') {
            const lastMove = gameState.activeCards[gameState.activeCards.length - 1];
            if (lastMove && lastMove.defender) {
                 shouldShow = true;
            }
        }
    }

    if (shouldShow) {
        moveBtnsEl.style.visibility = 'visible';
    } else {
        moveBtnsEl.style.visibility = 'hidden';
    }
}


function renderPlayerHand() {
    const container = document.getElementById('player-hand');
    container.innerHTML = ''; 
    const myCards = gameState.playerHand;

    myCards.forEach((cardData, index) => {
        const cardEl = createCardElement(cardData);
        cardEl.classList.add('hand-card'); 
        
        // *** ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ: Параметры веера для лучшей видимости ***
        const totalCards = myCards.length;
        const middle = (totalCards - 1) / 2;
        
        const rotateAngle = (index - middle) * 5; 
        const translateY = Math.abs(index - middle) * 7; // УВЕЛИЧЕНО до 7
        
        cardEl.style.zIndex = index + 10; 

        cardEl.style.transform = `rotate(${rotateAngle}deg) translateY(${translateY}px)`;

        cardEl.addEventListener('click', () => {
            tg.HapticFeedback.impactOccurred('light');
            
            if (gameState.activeCards.length > 0) {
                 if (gameState.attacker === 'player') {
                     makeMove(cardData.id);
                 } else {
                     handleDefense(cardData.id);
                 }
            } else {
                makeMove(cardData.id);
            }
        });

        container.appendChild(cardEl);
    });
}

function renderGameStatic() {
    const opponentContainer = document.getElementById('opponent-hand');
    opponentContainer.innerHTML = '';
    
    for(let i=0; i < gameState.opponentHand.length; i++) {
        const back = document.createElement('div');
        back.className = 'card-back';
        back.style.marginLeft = (i === 0) ? '0' : '-20px';
        opponentContainer.appendChild(back);
    }

    const deckZone = document.getElementById('deck-zone');
    deckZone.innerHTML = '';
    
    if (gameState.trump) {
        const trumpCardData = gameState.trump;
        const trumpEl = createCardElement(trumpCardData);
        trumpEl.classList.add('trump-card');
        deckZone.appendChild(trumpEl);
    }

    if (gameState.deck.length > 0) {
        const deckStack = document.createElement('div');
        deckStack.className = 'card-back deck-stack';
        deckZone.appendChild(deckStack);
    }
}

function renderTable() {
    const tableContainer = document.getElementById('table-zone');
    tableContainer.innerHTML = '';
    
    gameState.activeCards.forEach((move, index) => {
        const attackerCardEl = createCardElement(move.attacker);
        attackerCardEl.style.position = 'relative'; 
        attackerCardEl.style.transform = `translateY(${index * 10}px)`; 
        
        if (move.defender) { 
            const defenderCardEl = createCardElement(move.defender);
            defenderCardEl.style.position = 'relative';
            defenderCardEl.style.transform = `translateX(15px) translateY(${(index * 10) - 10}px) rotate(10deg)`;
            attackerCardEl.appendChild(defenderCardEl);
        }

        const cardStack = document.createElement('div');
        cardStack.classList.add('card-stack');
        cardStack.appendChild(attackerCardEl);

        tableContainer.appendChild(cardStack);
    });
}

function makeMove(cardId) {
    if (gameState.attacker !== 'player' && gameState.activeCards.length > 0) {
        return;
    }
    
    if (gameState.playerHand.length === 0) return;

    const cardIndex = gameState.playerHand.findIndex(card => card.id == cardId);
    if (cardIndex === -1) return;

    const cardToMove = gameState.playerHand[cardIndex];

    if (!isCardValidForThrowIn(cardToMove)) {
        tg.HapticFeedback.impactOccurred('error'); 
        return;
    }

    gameState.playerHand.splice(cardIndex, 1);
    
    gameState.activeCards.push({
        attacker: cardToMove,
        defender: null
    });

    checkWinCondition();

    renderPlayerHand(); 
    renderTable();      
    
    gameState.attacker = 'opponent'; 
    
    if (gameState.activeCards.length === 1 && gameState.attacker === 'opponent') {
        botPlay();
    }
    
    updateMoveButtonsVisibility();
}

function handleDefense(cardId) {
    if (gameState.activeCards.length === 0 || gameState.attacker !== 'opponent') {
        return;
    }
    
    const lastMoveIndex = gameState.activeCards.length - 1;
    const currentAttacker = gameState.activeCards[lastMoveIndex].attacker;

    const defenderIndex = gameState.playerHand.findIndex(card => card.id == cardId);
    if (defenderIndex === -1) return;
    const cardToDefend = gameState.playerHand[defenderIndex];
    
    if (canBeat(currentAttacker, cardToDefend, gameState.trumpSuit)) {
        gameState.playerHand.splice(defenderIndex, 1);
        gameState.activeCards[lastMoveIndex].defender = cardToDefend;
        
        checkWinCondition(); 
        
        gameState.attacker = 'player'; 
        
    } else {
        tg.HapticFeedback.impactOccurred('error');
        return;
    }

    renderPlayerHand(); 
    renderTable(); 
    updateMoveButtonsVisibility();
}

function endMove() {
    if (gameState.activeCards.length === 0) {
        return;
    }
    
    gameState.attacker = 'opponent'; 

    drawCards('playerHand');
    drawCards('opponentHand');
    
    gameState.activeCards = []; 

    renderGameStatic();
    renderPlayerHand();
    renderTable();
    
    botPlay();
    updateMoveButtonsVisibility();
}

function takeCards() {
    if (gameState.activeCards.length === 0) {
        return;
    }
    
    gameState.activeCards.forEach(move => {
        gameState.playerHand.push(move.attacker);
        if (move.defender) {
            gameState.playerHand.push(move.defender);
        }
    });
    
    gameState.activeCards = [];
    
    gameState.playerHand.sort((a, b) => {
        if (a.suit < b.suit) return -1;
        if (a.suit > b.suit) return 1;
        return values.indexOf(a.value) - values.indexOf(b.value);
    });

    gameState.attacker = 'opponent'; 

    drawCards('opponentHand');
    drawCards('playerHand');
    
    renderGameStatic();
    renderPlayerHand();
    renderTable();
    
    botPlay();
    updateMoveButtonsVisibility();
}

function initGame() {
    let fullDeck = createDeck();
    let shuffledDeck = shuffle(fullDeck);
    
    gameState = {
        deck: [], trump: null, trumpSuit: null, playerHand: [], opponentHand: [], 
        activeCards: [], attacker: 'player'
    };

    for (let i = 0; i < 6; i++) {
        gameState.playerHand.push(shuffledDeck.pop());
        gameState.opponentHand.push(shuffledDeck.pop());
    }
    
    gameState.trump = shuffledDeck.pop();
    gameState.trump.isTrump = true;
    gameState.trumpSuit = gameState.trump.suit;
    gameState.deck = shuffledDeck;

    gameState.playerHand.sort((a, b) => {
        if (a.suit < b.suit) return -1;
        if (a.suit > b.suit) return 1;
        return values.indexOf(a.value) - values.indexOf(b.value);
    });
    
    renderGameStatic();
    renderPlayerHand();
    renderTable(); 
    updateMoveButtonsVisibility(); 
    
    return gameState;
}


// --- ФИНАЛЬНЫЙ ЗАПУСК И ИНИЦИАЛИЗАЦИЯ API ---

// Привязка кнопок (УДАЛИЛИ ЛИШНЮЮ ПРИВЯЗКУ)
document.getElementById('takeBtn').addEventListener('click', takeCards);
document.getElementById('passBtn').addEventListener('click', endMove);
// Привязки для заглушек 💎 и 🛡️ не нужны

// Инициализация игры
initGame();

// Безопасный вызов Telegram API
tg.ready();
if (tg.isExpanded === false) {
    tg.expand();
}
