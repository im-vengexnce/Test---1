const board = document.getElementById('board');
const timerDisplay = document.getElementById('time');
const pauseButton = document.getElementById('pause');
const resumeButton = document.getElementById('resume');
const resetButton = document.getElementById('reset');
const undoButton = document.getElementById('undo');
const redoButton = document.getElementById('redo');

let boardState = [];
let currentPlayer = 'player1';
let timer = 60;
let interval;
let history = [];
let redoStack = [];
let bullet = null;
let gamePaused = false;

const pieceTypes = ['titan', 'tank', 'ricochet', 'semiricochet', 'cannon'];

const shootSound = document.getElementById('shoot-sound');
const hitSound = document.getElementById('hit-sound');
const swapSound = document.getElementById('swap-sound');
const passThroughSound = document.getElementById('pass-through-sound');

function shootBullet(row, col, direction) {
    bullet = { row, col, direction, player: currentPlayer };
    shootSound.play();
    moveBullet();
}

function initBoard() {
    board.innerHTML = '';
    boardState = Array.from({ length: 8 }, () => Array(8).fill(null));
    placeInitialPieces();
    renderBoard();
}

function placeInitialPieces() {
    placePiece(0, 0, 'titan');
    placePiece(0, 7, 'titan');
    placePiece(7, 0, 'cannon');
    placePiece(7, 7, 'cannon');
    // Add more initial pieces as needed
}

function placePiece(row, col, type) {
    if (!pieceTypes.includes(type)) return;
    boardState[row][col] = { type, player: currentPlayer, direction: 0 };
}

function startTimer() {
    timerDisplay.textContent = timer;
    interval = setInterval(() => {
        if (gamePaused) return;
        timer--;
        timerDisplay.textContent = timer;
        if (timer === 0) {
            clearInterval(interval);
            alert(currentPlayer === 'player1' ? 'Player 2 wins!' : 'Player 1 wins!');
        }
    }, 1000);
}

pauseButton.addEventListener('click', () => { clearInterval(interval); gamePaused = true; });
resumeButton.addEventListener('click', () => { gamePaused = false; startTimer(); });
resetButton.addEventListener('click', resetGame);
undoButton.addEventListener('click', undo);
redoButton.addEventListener('click', redo);

function resetGame() {
    clearInterval(interval);
    timer = 60;
    timerDisplay.textContent = timer;
    history = [];
    redoStack = [];
    currentPlayer = 'player1';
    initBoard();
    startTimer();
}

board.addEventListener('click', (e) => {
    const cell = e.target.closest('.cell');
    if (!cell) return;

    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    const piece = boardState[row][col];

    if (piece && piece.player === currentPlayer) {
        if (e.altKey) {
            rotatePiece(row, col);
        } else {
            handlePieceClick(row, col, piece);
        }
    } else if (!piece && bullet) {
        handleBulletMove(row, col);
    }
});

function handlePieceClick(row, col, piece) {
    if (piece.type === 'cannon') {
        shootBullet(row, col, piece.direction);
    } else {
        movePiece(row, col, piece.type);
    }
}

function rotatePiece(row, col) {
    saveState();
    const piece = boardState[row][col];
    piece.direction = (piece.direction + 1) % 4;
    switchPlayer();
    renderBoard();
}

function shootBullet(row, col, direction) {
    bullet = { row, col, direction, player: currentPlayer };
    moveBullet();
}

function moveBullet() {
    if (!bullet) return;

    const { row, col, direction } = bullet;
    let newRow = row;
    let newCol = col;

    switch (direction) {
        case 0: newCol++; break; // right
        case 1: newRow--; break; // up
        case 2: newCol--; break; // left
        case 3: newRow++; break; // down
    }

    if (isValidMove(newRow, newCol)) {
        bullet.row = newRow;
        bullet.col = newCol;
        renderBoard();
        setTimeout(moveBullet, 200); // move bullet smoothly
    } else {
        handleBulletCollision(newRow, newCol);
    }
}

function handleBulletCollision(row, col) {
    const piece = boardState[row][col];
    if (!piece) return;

    hitSound.play();

    switch (piece.type) {
        case 'titan':
            alert(`${currentPlayer} wins!`);
            resetGame();
            break;

        case 'semiricochet':
            handleSemiRicochetCollision(row, col, piece);
            break;

        case 'ricochet':
            handleRicochetCollision(piece);
            moveBullet(); // Continue bullet movement after ricochet
            break;

        case 'tank':
            handleTankCollision(piece);
            moveBullet(); // Continue bullet movement if tank allows
            break;

        case 'cannon':
            // Implement logic if cannon collision requires special handling
            break;
    }
    bullet = null;
    switchPlayer();
}

function handleSemiRicochetCollision(row, col, piece) {
    // Assuming the semi-ricochet has a direction where it can be destroyed
    const vulnerableDirection = 0; // For example, 0 means it can be destroyed from the right
    if (piece.direction === vulnerableDirection) {
        boardState[row][col] = null;
    } else {
        handleRicochetCollision(piece);
        moveBullet(); // Continue bullet movement after ricochet
    }
}

function handleRicochetCollision(piece) {
    // Change bullet direction based on ricochet piece direction
    // Assuming direction 0: right, 1: up, 2: left, 3: down
    switch (piece.direction) {
        case 0:
            bullet.direction = (bullet.direction + 2) % 4; // Reverse direction
            break;
        case 1:
            bullet.direction = (bullet.direction + 3) % 4; // Turn left
            break;
        case 2:
            bullet.direction = (bullet.direction + 2) % 4; // Reverse direction
            break;
        case 3:
            bullet.direction = (bullet.direction + 1) % 4; // Turn right
            break;
    }
}

function handleTankCollision(piece) {
    // Assuming the tank allows the bullet to pass through from one side
    const passThroughDirection = 0; // For example, 0 means bullet can pass through from the right
    if (bullet.direction === passThroughDirection) {
        // Bullet continues without being stopped
        passThroughSound.play();
    } else {
        bullet = null;
    }}

function movePiece(row, col, type) {
    const moves = [
        [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1],
        [row - 1, col - 1], [row - 1, col + 1], [row + 1, col - 1], [row + 1, col + 1]
    ];

    moves.forEach(([newRow, newCol]) => {
        if (isValidMove(newRow, newCol)) {
            saveState();
            boardState[row][col] = null;
            boardState[newRow][newCol] = { type, player: currentPlayer, direction: 0 };
            switchPlayer();
            renderBoard();
        }
    });
}

function isValidMove(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8 && boardState[row][col] === null;
}

function saveState() {
    history.push(JSON.parse(JSON.stringify(boardState)));
    localStorage.setItem('gameHistory', JSON.stringify(history));
    redoStack = [];
}

function undo() {
    if (history.length > 0) {
        redoStack.push(JSON.parse(JSON.stringify(boardState)));
        boardState = history.pop();
        localStorage.setItem('gameHistory', JSON.stringify(history));
        switchPlayer();
        renderBoard();
    }
}

function redo() {
    if (redoStack.length > 0) {
        history.push(JSON.parse(JSON.stringify(boardState)));
        boardState = redoStack.pop();
        localStorage.setItem('gameHistory', JSON.stringify(history));
        switchPlayer();
        renderBoard();
    }
}

function switchPlayer() {
    currentPlayer = currentPlayer === 'player1' ? 'player2' : 'player1';
}

function renderBoard() {
    board.innerHTML = '';
    boardState.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            const cellDiv = document.createElement('div');
            cellDiv.className = 'cell';
            cellDiv.dataset.row = rowIndex;
            cellDiv.dataset.col = colIndex;
            if (cell) {
                const piece = document.createElement('div');
                piece.className = `piece ${cell.type.toLowerCase()}`;
                piece.dataset.type = cell.type;
                piece.style.transform = `rotate(${cell.direction * 90}deg)`;
                cellDiv.appendChild(piece);
            }
            board.appendChild(cellDiv);
        });
    });
    if (bullet) {
        const bulletDiv = document.createElement('div');
        bulletDiv.className = 'bullet';
        bulletDiv.style.top = `${bullet.row * 50}px`;
        bulletDiv.style.left = `${bullet.col * 50}px`;
        board.appendChild(bulletDiv);
    }
}

// Add the following functions for HackerMode

function swapPieces(row1, col1, row2, col2) {
    saveState();
    const piece1 = boardState[row1][col1];
    const piece2 = boardState[row2][col2];

    if (piece1 && piece2 && piece1.player === currentPlayer && piece2.player === currentPlayer) {
        boardState[row1][col1] = piece2;
        boardState[row2][col2] = piece1;
        switchPlayer();
        renderBoard();
        swapSound.play();
    }
}

function handleRicochetCollision(piece) {
    // Change bullet direction based on ricochet piece direction
    // Assuming direction 0: right, 1: up, 2: left, 3: down
    switch (piece.direction) {
        case 0:
            bullet.direction = (bullet.direction + 2) % 4; // Reverse direction
            break;
        case 1:
            bullet.direction = (bullet.direction + 3) % 4; // Turnleft
            break;
        case 2:
            bullet.direction = (bullet.direction + 2) % 4; // Reverse direction
            break;
        case 3:
            bullet.direction = (bullet.direction + 1) % 4; // Turn right
            break;
    }

    // Allow Ricochets to swap with any piece except the Titans
    if (piece.type !== 'titan') {
        const moves = [
            [piece.row - 1, piece.col], [piece.row + 1, piece.col], [piece.row, piece.col - 1], [piece.row, piece.col + 1],
            [piece.row - 1, piece.col - 1], [piece.row - 1, piece.col + 1], [piece.row + 1, piece.col - 1], [piece.row + 1, piece.col + 1]
        ];

        moves.forEach(([newRow, newCol]) => {
            if (isValidMove(newRow, newCol)) {
                saveState();
                boardState[piece.row][piece.col] = null;
                boardState[newRow][newCol] = { type: piece.type, player: piece.player, direction: piece.direction };
                switchPlayer();
                renderBoard();
            }
        });
    }
}

function handleTankCollision(piece) {
    // Assuming the tank allows the bullet to pass through from one side
    const passThroughDirection = 0; // For example, 0 means bullet can pass through from the right
    if (bullet.direction === passThroughDirection) {
        // Bullet continues without being stopped
        passThroughSound.play();
    } else {
        bullet = null;
    }

    // Allow bullets to pass through Tanks from one side
    const moves = [
        [piece.row - 1, piece.col], [piece.row + 1, piece.col], [piece.row, piece.col - 1], [piece.row, piece.col + 1],
    ];

    moves.forEach(([newRow, newCol]) => {
        if (isValidMove(newRow, newCol)) {
            saveState();
            boardState[piece.row][piece.col] = null;
            boardState[newRow][newCol] = { type: piece.type, player: piece.player, direction: piece.direction };
            switchPlayer();
            renderBoard();
        }
    });
}

function replayGame() {
    // Implement game replay feature
    if (history.length > 0) {
        redoStack = [];
        currentPlayer = 'player1';
        history.forEach(state => {
            boardState = state;
            renderBoard();
            switchPlayer();
        });
        timer = 60;
        startTimer();
    }
}

function randomizeStartingPosition() {
    // Implement randomized playable starting position feature
    initBoard();
    placeInitialPieces();
    renderBoard();
}

function animateMovements() {
    // Implement animating game movements
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.addEventListener('transitionend', () => {
            cell.style.transition = '';
        });
    });
}

function createBotPlayer() {
    // Implement single-player mode with a bot
    const botPlayer = {
        type: 'tank',
        player: 'bot',
        direction: 0,
    };

    function botMove() {
        const moves = [
            [botPlayer.row - 1, botPlayer.col],
            [botPlayer.row + 1, botPlayer.col],
            [botPlayer.row, botPlayer.col - 1],
            [botPlayer.row, botPlayer.col + 1],
        ];

        const validMoves = moves.filter(([row, col]) => isValidMove(row, col));

        if (validMoves.length > 0) {
            const [newRow, newCol] = validMoves[Math.floor(Math.random() * validMoves.length)];
            boardState[botPlayer.row][botPlayer.col] = null;
            boardState[newRow][newCol] = botPlayer;
            botPlayer.row = newRow;
            botPlayer.col = newCol;
            switchPlayer();
            renderBoard();
            setTimeout(botMove, 1000);
        }
    }

    botMove();
}

function addSpell(spellName) {
    // Implement adding spells
    switch (spellName) {
        case 'swap':
            // Add a spell that allows swapping pieces
            const swapPieces = (row1, col1, row2, col2) => {
                saveState();
                const piece1 = boardState[row1][col1];
                const piece2 = boardState[row2][col2];

                if (piece1 && piece2 && piece1.player === currentPlayer && piece2.player === currentPlayer) {
                    boardState[row1][col1] = piece2;
                    boardState[row2][col2] = piece1;
                    switchPlayer();
                    renderBoard();
                }
            };
            break;

        case 'teleport':
            // Add a spell that allows teleporting a piece to a random location
            const teleportPiece = (row, col) => {
                saveState();
                const piece = boardState[row][col];

                if (piece && piece.player === currentPlayer) {
                    const newRow = Math.floor(Math.random() * 8);
                    const newCol = Math.floor(Math.random() * 8);

                    if (isValidMove(newRow, newCol)) {
                        boardState[row][col] = null;
                        boardState[newRow][newCol] = piece;
                        piece.row = newRow;
                        piece.col = newCol;
                        switchPlayer();
                        renderBoard();
                    }
                }
            };
            break;

        default:
            console.log('Invalid spell name');
    }
}

initBoard();
startTimer();