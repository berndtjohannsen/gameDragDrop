// Global variables
let globalBackgroundMusic;
let gameInstance = null;

// Function to safely destroy the game instance
function safeDestroyGame() {
    if (gameInstance) {
        try {
            // Stop all scenes
            if (gameInstance.scene && typeof gameInstance.scene.scenes === 'object') {
                gameInstance.scene.scenes.forEach(scene => {
                    try {
                        if (scene && typeof scene.sys === 'object' && scene.sys.settings.active) {
                            scene.scene.stop();
                        }
                    } catch (e) {
                        console.warn("Error stopping scene:", e);
                    }
                });
            }
            
            // Handle sound cleanup
            if (gameInstance.sound && gameInstance.sound.sounds) {
                const soundsCopy = [...gameInstance.sound.sounds];
                soundsCopy.forEach(sound => {
                    try {
                        if (sound.isPlaying) {
                            sound.pause();
                        }
                    } catch (e) {
                        console.warn("Error pausing sound:", e);
                    }
                });
                gameInstance.sound.sounds = [];
            }
            
            // Destroy the game instance
            gameInstance.destroy(true);
        } catch (e) {
            console.warn("Error during safe game destruction:", e);
        }
        
        gameInstance = null;
    }
}

// Function to manage background music
function playBackgroundMusic() {
    if (globalBackgroundMusic) {
        try {
            // Simply play the music if it's not already playing
            if (!globalBackgroundMusic.isPlaying) {
                globalBackgroundMusic.play();
            }
            
            // Ensure the music is looping
            globalBackgroundMusic.setLoop(true);
        } catch (error) {
            console.warn("Error playing background music:", error);
            // We'll create a new instance in the next game scene
            globalBackgroundMusic = null;
        }
    }
}

// Add orientation change handler for mobile devices
window.addEventListener('orientationchange', function() {
    // Wait for the orientation change to complete
    setTimeout(() => {
        if (gameInstance) {
            const width = window.innerWidth;
            const height = window.innerHeight;
            
            // Resize the game
            if (gameInstance.scale) {
                gameInstance.scale.resize(width, height);
            }
            
            // Update all game scenes
            if (gameInstance.scene && gameInstance.scene.scenes) {
                gameInstance.scene.scenes.forEach(scene => {
                    if (scene instanceof GameScene && scene.handleResize) {
                        scene.handleResize({ width, height });
                    }
                });
            }
        }
    }, 300); // Longer delay for orientation changes
}); 