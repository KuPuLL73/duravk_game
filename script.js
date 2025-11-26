const tg = window.Telegram.WebApp;
// --- ГЛОБАЛЬНЫЕ ДАННЫЕ И СОСТОЯНИЕ ---
const suits = ['♠', '♥', '♦', '♣'];
const values = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const playerProfile = {
    balance: 100,
    inventory: ['default', 'skin-cyberpunk', 'skin-gold'],
    activeSkin: 'default' 
};

// ГЛАВНЫЙ ОБЪЕКТ СОСТОЯНИЯ ИГРЫ
let gameState = {
    deck: [],          
    trump: null,       
    trumpSuit: null,   
    playerHand: [],    
    opponentHand: [],  
    activeCards: [],   
    attacker: 'player' 
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

// 12. НОВАЯ ФУНКЦИЯ: Проверка условия победы
function checkWinCondition() {
    const deckEmpty = gameState.deck.length === 0;

    if (gameState.playerHand.length === 0 && deckEmpty) {
        console.log("🎉 Игрок победил! Вы вышли!");
        alert("🎉 ПОБЕДА! Вы вышли из игры!");
        return true;
    }
    
    if (gameState.opponentHand.length === 0 && deckEmpty) {
        console.log("😭 Соперник победил! Бот вышел!");
        alert("😭 ПОРАЖЕНИЕ! Соперник вышел из игры.");
        return true;
    }

    return false;
}

// Добор карт из колоды до 6 штук (ОБНОВЛЕНО)
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

    console.log(`[Добор] ${playerKey === 'playerHand' ? 'Игрок' : 'Соперник'} добрал карты. В руке: ${hand.length}`);
    checkWinCondition(); // ПРОВЕРКА ПОБЕДЫ ПОСЛЕ ДОБОРА
}


// --- ЛОГИКА ИИ СОПЕРНИКА (БОТ) ---

function botTakeCards() {
    console.log(`🤖 Бот забирает карты со стола.`);
    
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
    
    console.log(`Бот взял карты. Теперь ходит игрок.`);
    
    renderGameStatic();
    renderTable(); 
    renderPlayerHand();
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
        
        console.log(`🤖 Бот отбился: ${cardToDefend.value}${cardToDefend.suit} побила ${currentAttacker.value}${currentAttacker.suit}.`);
        
        checkWinCondition(); // ПРОВЕРКА ПОБЕДЫ ПОСЛЕ ХОДА БОТА
        gameState.attacker = 'player';
        
    } else {
        botTakeCards();
    }

    renderGameStatic();
    renderTable(); 
    renderPlayerHand(); 
}

// Бот атакует (ОБНОВЛЕНО)
function botAttack() {
    if (gameState.opponentHand.length === 0) return; // Нельзя ходить, если нет карт

    const cardToAttack = gameState.opponentHand.shift(); 

    gameState.activeCards.push({
        attacker: cardToAttack,
        defender: null
    });

    console.log(`🤖 Бот пошел: ${cardToAttack.value}${cardToAttack.suit}.`);
    
    checkWinCondition(); // ПРОВЕРКА ПОБЕДЫ ПОСЛЕ ХОДА БОТА

    gameState.attacker = 'player'; 

    renderGameStatic(); 
    renderTable();      
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
    
    if (playerProfile.activeSkin !== 'default') {
        cardDiv.classList.add(playerProfile.activeSkin);
    }

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

function renderPlayerHand() {
    // ... (Отрисовка руки)
    const container = document.getElementById('player-hand');
    container.innerHTML = ''; 
    const myCards = gameState.playerHand;

    myCards.forEach((cardData, index) => {
        const cardEl = createCardElement(cardData);
        cardEl.classList.add('hand-card'); 
        
        const totalCards = myCards.length;
        const middle = (totalCards - 1) / 2;
        const rotateAngle = (index - middle) * 7; 
        const translateY = Math.abs(index - middle) * 5;
        cardEl.style.transform = `rotate(${rotateAngle}deg) translateY(${translateY}px)`;

        cardEl.addEventListener('click', () => {
            tg.HapticFeedback.impactOccurred('light');
            
            if (gameState.attacker === 'opponent') {
                if (gameState.activeCards.length === 0) {
                    // Это попытка игрока ходить, когда очередь соперника
                    console.log("Сейчас ход соперника, вы не можете ходить.");
                } else {
                    // Это попытка игрока отбиться (защита от бота)
                    handleDefense(cardData.id); 
                }
            } else {
                // Игрок атакует (активный ход)
                makeMove(cardData.id);
            }
        });

        container.appendChild(cardEl);
    });
}

function renderGameStatic() {
    // ... (Отрисовка оппонента и колоды)
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
    // ... (Отрисовка стола)
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

// Игрок атакует (ОБНОВЛЕНО)
function makeMove(cardId) {
    if (gameState.attacker !== 'player') {
        console.log("Сейчас не ваш ход.");
        return;
    }
    
    if (gameState.playerHand.length === 0) return; // Защита от хождения пустой рукой

    const cardIndex = gameState.playerHand.findIndex(card => card.id == cardId);
    if (cardIndex === -1) return;

    const cardToMove = gameState.playerHand.splice(cardIndex, 1)[0];
    
    gameState.activeCards.push({
        attacker: cardToMove,
        defender: null
    });

    console.log(`Ход сделан: ${cardToMove.value}${cardToMove.suit}.`);
    
    checkWinCondition(); // ПРОВЕРКА ПОБЕДЫ ПОСЛЕ ХОДА ИГРОКА

    renderPlayerHand(); 
    renderTable();      
    
    gameState.attacker = 'opponent'; 
    console.log('Ход перешел к ЗАЩИТНИКУ (Бот).');

    botPlay();
}

// Игрок отбивается (ОБНОВЛЕНО)
function handleDefense(cardId) {
    // Здесь мы обрабатываем ситуацию, когда бот атаковал, а игрок должен отбиться
    if (gameState.attacker !== 'player' && gameState.activeCards.length > 0) {
        
        const lastMoveIndex = gameState.activeCards.length - 1;
        const currentAttacker = gameState.activeCards[lastMoveIndex].attacker;

        const defenderIndex = gameState.playerHand.findIndex(card => card.id == cardId);
        if (defenderIndex === -1) return;
        const cardToDefend = gameState.playerHand[defenderIndex];
        
        if (canBeat(currentAttacker, cardToDefend, gameState.trumpSuit)) {
            gameState.playerHand.splice(defenderIndex, 1);
            gameState.activeCards[lastMoveIndex].defender = cardToDefend;
            
            console.log(`✅ Игрок отбился: ${cardToDefend.value}${cardToDefend.suit} побила ${currentAttacker.value}${currentAttacker.suit}.`);
            
            checkWinCondition(); // ПРОВЕРКА ПОБЕДЫ ПОСЛЕ ХОДА ИГРОКА
            
            // Ход переходит к атакующему (боту), чтобы он мог подкинуть карту
            gameState.attacker = 'opponent'; 
            console.log('Ход перешел к АТАКУЮЩЕМУ (Бот) для подкидывания.');
            
            // В этой версии бот не умеет подкидывать. Переход хода будет через "Бито".
            
        } else {
            console.log(`❌ Нельзя отбиться: ${cardToDefend.value}${cardToDefend.suit} не бьет ${currentAttacker.value}${currentAttacker.suit}.`);
            return;
        }

        renderPlayerHand(); 
        renderTable(); 
    } else {
        // Если игрок нажал на карту в неправильной фазе, просто передаем управление
        makeMove(cardId);
    }
}

// Логика "Бито" (конец боя)
function endMove() {
    if (gameState.activeCards.length === 0) {
        console.log("На столе нет карт, чтобы сказать 'Бито'.");
        return;
    }

    // 1. Добор карт (Сначала Атакующий (игрок), потом Защитник (бот))
    drawCards('playerHand');
    drawCards('opponentHand');

    gameState.attacker = 'opponent';
    
    gameState.activeCards = []; 
    console.log("Бито! Стол очищен. Ход переходит к сопернику.");

    renderGameStatic();
    renderPlayerHand();
    renderTable();
    
    botPlay();
}

// Логика "Беру" (Забрать карты)
function takeCards() {
    if (gameState.activeCards.length === 0) {
        console.log("На столе нет карт, чтобы забрать.");
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

    console.log(`Игрок взял карты со стола. Теперь в руке: ${gameState.playerHand.length} карт.`);

    // Добор карт (Сначала Соперник, потом Игрок)
    drawCards('opponentHand');
    drawCards('playerHand');
    
    gameState.attacker = 'opponent'; 
    
    renderGameStatic();
    renderPlayerHand();
    renderTable();
    
    botPlay();
}


// Смена скинов
function openSkinShop() {
    let message = '';
    
    if (playerProfile.activeSkin === 'default') {
        playerProfile.activeSkin = 'skin-cyberpunk';
        message = 'Выбран скин: Киберпанк';
    } else if (playerProfile.activeSkin === 'skin-cyberpunk') {
        playerProfile.activeSkin = 'skin-gold';
        message = 'Выбран скин: Золотой (Легендарка!)';
    } else {
        playerProfile.activeSkin = 'default';
        message = 'Скин сброшен на стандартный.';
    }

    console.log(`--- Скин изменен: ${message} ---`); 
    
    renderPlayerHand();
    renderGameStatic();
    renderTable();
}

// Инициализация игры (Раздача)
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

    console.log(`Козырь: ${gameState.trump.value}${gameState.trump.suit}. В колоде: ${gameState.deck.length} карт.`);
    
    renderGameStatic();
    renderPlayerHand();
    renderTable(); 
    
    return gameState;
}


// --- ЗАПУСК ИГРЫ И ПРИВЯЗКА СОБЫТИЙ ---

document.getElementById('skinShopBtn').addEventListener('click', openSkinShop);
document.getElementById('takeBtn').addEventListener('click', takeCards);
document.getElementById('passBtn').addEventListener('click', endMove);


initGame();
