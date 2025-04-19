// Remove the duplicate declarations and just use the ones from utils.js
// const audioLoader = new Audio();
// audioLoader.src = 'sounds/background_music.mp3';
// audioLoader.preload = 'auto';

// let gameInstance = null; // Remove this line since it's declared in utils.js
let currentGameDir = null;

// Function to restart the game without showing splash screen
function restartGame(scene) {
    // Remove celebration elements
    const confettis = document.querySelectorAll('.confetti');
    confettis.forEach(c => c.parentNode?.removeChild(c));
    
    // Remove the restart button
    const restartBtn = document.querySelector('.play-again-btn');
    if (restartBtn?.parentNode) {
        restartBtn.parentNode.removeChild(restartBtn);
    }
    
    // Clean up the current scene
    scene.cleanup();
    
    // Wait for cleanup to complete before stopping the scene
    setTimeout(async () => {
        // Get the config again
        const gameConfig = await getGameConfig(currentGameDir);
        
        // Remove the scene from the game
        gameInstance.scene.remove('GameScene');
        
        // Create a new scene with the same game directory and config
        const newScene = new GameScene(currentGameDir, gameConfig);
        gameInstance.scene.add('GameScene', newScene, true);
    }, 50);
}

// Function to parse config file and get game configuration
async function getGameConfig(gameDir) {
    try {
        const response = await fetch('config.txt');
        const text = await response.text();
        
        const lines = text.split('\n');
        let currentGame = null;

        console.log('Looking for game directory:', gameDir);

        for (let line of lines) {
            line = line.trim();
            if (line === '' || line.startsWith('#')) continue;

            if (line.startsWith('Game:')) {
                // If we were processing a matching game, return it
                if (currentGame && currentGame.directory === gameDir) {
                    console.log('Returning game config:', currentGame);
                    return currentGame;
                }
                currentGame = {};
                console.log('Found new game section');
                continue;
            }

            if (!currentGame) continue;

            if (line.startsWith('Directory:')) {
                const dir = line.split(':')[1].trim().replace('./', '').replace(/"/g, '');
                console.log('Comparing directories:', dir, gameDir);
                currentGame.directory = dir;
            } else if (currentGame.directory === gameDir) { // Only process if we're in the right game
                if (line.startsWith('Name:')) {
                    currentGame.name = line.split(':')[1].trim().replace(/"/g, '');
                } else if (line.startsWith('Background-image:')) {
                    currentGame.backgroundImage = line.split(':')[1].trim();
                } else if (line.startsWith('Background-sound:') || line.startsWith('Backgroud-sound:')) { // Handle typo
                    currentGame.backgroundSound = line.split(':')[1].trim();
                } else if (line.startsWith('Completion-sound:')) {
                    currentGame.completionSound = line.split(':')[1].trim();
                } else if (line.startsWith('Fail-sound:')) {
                    currentGame.failSound = line.split(':')[1].trim();
                } else if (line.startsWith('Item')) {
                    if (!currentGame.items) currentGame.items = [];
                    const parts = line.split(':')[1].split(',');
                    const name = parts[0].trim().replace(/"/g, '');
                    const image = parts[1].trim();
                    const sound = parts[2].trim();
                    currentGame.items.push({ name, image, sound });
                }
            }
        }

        // Check the last game
        if (currentGame && currentGame.directory === gameDir) {
            console.log('Returning last game config:', currentGame);
            return currentGame;
        }

        console.log('No matching game found');
        return null;
    } catch (error) {
        console.error('Error loading config:', error);
        return null;
    }
}

// Function to start the game after user interaction
async function startGame(gameDir) {
    console.log('Starting game with directory:', gameDir);
    
    // Get game configuration first
    const gameConfig = await getGameConfig(gameDir);
    if (!gameConfig) {
        console.error('Failed to load game configuration for:', gameDir);
        return;
    }

    console.log('Loaded game config:', gameConfig);

    // Store the game directory
    currentGameDir = gameDir;
    
    // Clean up any existing game instance
    if (gameInstance) {
        safeDestroyGame();
        gameInstance = null;
    }
    
    // Hide the splash screen
    const splashScreen = document.getElementById('splash-screen');
    splashScreen.style.display = 'none';
    
    // Show the game container
    const gameContainer = document.getElementById('game-container');
    gameContainer.style.display = 'block';
    
    // Create new game instance with config
    const config = {
        type: Phaser.AUTO,
        scale: {
            mode: Phaser.Scale.FIT,
            parent: 'game-container',
            width: 800,
            height: 600,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            fullscreenTarget: document.documentElement
        },
        parent: 'game-container',
        scene: new GameScene(gameDir, gameConfig),
        physics: {
            default: 'arcade'
        }
    };
    
    // Create the game
    gameInstance = new Phaser.Game(config);
}

// Add WebFont loader
WebFontConfig = {
    google: {
        families: ['Comic Neue:700']
    }
};

(function() {
    var wf = document.createElement('script');
    wf.src = 'https://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js';
    wf.type = 'text/javascript';
    wf.async = 'true';
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(wf, s);
})();

function initGame(gameDir) {
    // Clean up any existing game instance
    if (gameInstance) {
        safeDestroyGame();
    }

    // Hide splash screen
    document.getElementById('splash-screen').style.display = 'none';

    // Create new game instance
    const config = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        parent: 'game-container',
        scene: [],
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            fullscreenTarget: document.documentElement
        }
    };

    gameInstance = new Phaser.Game(config);

    // Load and parse game configuration
    fetch('games.txt')
        .then(response => response.text())
        .then(configText => {
            const scene = new GameScene(gameDir, parseConfig(configText, gameDir));
            gameInstance.scene.add('GameScene', scene, true);
        })
        .catch(error => {
            console.error('Error loading game configuration:', error);
        });
} 