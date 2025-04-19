// Function to parse config file and extract game information
async function getGameDirectories() {
    try {
        // Fetch and read the config file
        const response = await fetch('config.txt');
        if (!response.ok) {
            throw new Error('Failed to fetch config file');
        }
        const text = await response.text();
        
        // Parse the config file
        const games = [];
        let currentGame = null;
        
        // Split into lines and process each line
        text.split('\n').forEach(line => {
            line = line.trim();
            
            // Skip comments and empty lines
            if (line.startsWith('#') || line === '') {
                return;
            }
            
            // Check for game definition
            if (line.startsWith('Game:')) {
                if (currentGame) {
                    games.push(currentGame);
                }
                currentGame = { name: '', directory: '' };
            }
            // Extract game name
            else if (line.startsWith('Name:')) {
                if (currentGame) {
                    currentGame.name = line.split(':')[1].trim().replace(/"/g, '');
                }
            }
            // Extract directory
            else if (line.startsWith('Directory:')) {
                if (currentGame) {
                    currentGame.directory = line.split(':')[1].trim()
                        .replace('./', ''); // Remove ./ prefix if present
                }
            }
        });
        
        // Add the last game if exists
        if (currentGame) {
            games.push(currentGame);
        }
        
        return games;
    } catch (error) {
        console.error('Error reading config file:', error);
        return [];
    }
}

// Function to initialize game selection
async function initializeGameSelection() {
    const gameSelection = document.getElementById('game-selection');
    
    // Clear existing buttons
    gameSelection.innerHTML = '';
    
    // Get games from config file
    const games = await getGameDirectories();
    
    // Create buttons for each game
    games.forEach(game => {
        const button = document.createElement('button');
        button.className = 'game-select-btn';
        button.dataset.game = game.directory;
        button.textContent = game.name;
        
        // Add click event listener
        button.addEventListener('click', function() {
            // Start the game without changing fullscreen state
            const gameDir = this.dataset.game;
            const container = document.getElementById('game-container');
            
            // Start the game while maintaining the container's state
            container.style.transition = 'none';  // Prevent transition effects
            startGame(gameDir);
        });
        
        // Add button to container
        gameSelection.appendChild(button);
    });
}

// Handle fullscreen changes
function handleFullscreenChange() {
    const isFullscreen = document.fullscreenElement || 
                        document.webkitFullscreenElement || 
                        document.mozFullScreenElement || 
                        document.msFullscreenElement;
    
    if (!isFullscreen) {
        console.log('Exited fullscreen mode');
    }
} 