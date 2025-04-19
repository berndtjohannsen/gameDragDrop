class GameScene extends Phaser.Scene {
    constructor(gameDir, gameConfig) {
        super({ key: 'GameScene' });
        this.pictures = [];
        this.nameBoxes = [];
        this.matchedCount = 0;
        this.restartBtn = null;
        this.returnBtn = null;
        this.width = 800;
        this.height = 600;
        this.gameDir = gameDir;
        this.gameConfig = gameConfig;
        this.isTransitioning = false;
        console.log('Scene constructed with directory:', gameDir);
        console.log('Game configuration:', gameConfig);
    }

    init() {
        console.log('Scene initialized with directory:', this.gameDir);
        if (!this.gameDir) {
            console.error('No game directory provided!');
        }
    }

    parseConfig(configText, targetDir) {
        const lines = configText.split('\n');
        let currentGame = null;
        let inTargetGame = false;

        for (let line of lines) {
            line = line.trim();
            if (line === '' || line.startsWith('#')) continue;

            if (line.startsWith('Game:')) {
                currentGame = {};
                continue;
            }

            if (!currentGame) continue;

            if (line.startsWith('Directory:')) {
                const dir = line.split(':')[1].trim().replace('./', '');
                if (dir === targetDir) {
                    inTargetGame = true;
                    currentGame.directory = dir;
                } else {
                    inTargetGame = false;
                }
            } else if (inTargetGame) {
                if (line.startsWith('Name:')) {
                    currentGame.name = line.split(':')[1].trim().replace(/"/g, '');
                } else if (line.startsWith('Background-image:')) {
                    currentGame.backgroundImage = line.split(':')[1].trim();
                } else if (line.startsWith('Background-sound:')) {
                    currentGame.backgroundSound = line.split(':')[1].trim();
                } else if (line.startsWith('Completion-sound:')) {
                    currentGame.completionSound = line.split(':')[1].trim();
                } else if (line.startsWith('Fail-sound:')) {
                    currentGame.failSound = line.split(':')[1].trim();
                } else if (line.startsWith('Item')) {
                    if (!currentGame.items) currentGame.items = [];
                    const [_, name, image, sound] = line.split(':')[1].split(',').map(s => s.trim().replace(/"/g, ''));
                    currentGame.items.push({ name, image, sound });
                }
            }
        }

        return inTargetGame ? currentGame : null;
    }

    reset() {
        // Clean up current state
        this.cleanup();
        
        // Reset game state
        this.matchedCount = 0;
        
        // Reload assets and recreate game elements
        this.preload();
        this.create();
    }

    preload() {
        if (!this.gameDir) {
            console.error('Cannot load assets: game directory is undefined');
            return;
        }
        console.log('Loading assets from directory:', this.gameDir);
        
        // Load background image
        this.load.image('background', `${this.gameDir}/pictures/${this.gameConfig.backgroundImage}`);
        
        // Load background sound
        if (this.gameConfig.backgroundSound) {
            const soundPath = `${this.gameDir}/sounds/${this.gameConfig.backgroundSound}`;
            console.log('Loading background sound from:', soundPath);
            this.load.audio('background_sound', soundPath);
            
            // Add error handling for sound loading
            this.load.on('filecomplete', (key) => {
                if (key === 'background_sound') {
                    console.log('Background sound loaded successfully');
                }
            });
            
            this.load.on('loaderror', (file) => {
                if (file.key === 'background_sound') {
                    console.error('Failed to load background sound:', file);
                }
            });
        }
        
        // Load completion and fail sounds
        this.load.audio('wrong', `${this.gameDir}/sounds/${this.gameConfig.failSound}`);
        this.load.audio('completion_sound', `${this.gameDir}/sounds/${this.gameConfig.completionSound}`);
        
        // Load item images and sounds
        this.gameConfig.items.forEach(item => {
            this.load.image(item.name.toLowerCase(), `${this.gameDir}/pictures/${item.image}`);
            this.load.audio(`${item.name.toLowerCase()}_sound`, `${this.gameDir}/sounds/${item.sound}`);
        });

        this.load.image('particle', 'assets/particle.png');
    }

    create() {
        // Clean up any existing resources first
        this.cleanup();
        
        // Add background
        this.add.image(this.width / 2, this.height / 2, 'background')
            .setDisplaySize(this.width, this.height);
        
        // Add fullscreen button as a Phaser object
        const fullscreenBtn = this.add.container(this.width - 40, 40);
        
        // Create button background
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x000000, 0.5);
        btnBg.fillRoundedRect(-20, -20, 40, 40, 10);
        btnBg.lineStyle(2, 0xFFFFFF);
        btnBg.strokeRoundedRect(-20, -20, 40, 40, 10);
        
        // Create button text
        const btnText = this.add.text(0, 0, '⤢', {  // Default to non-fullscreen icon
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#FFFFFF'
        }).setOrigin(0.5);
        
        // Add elements to container
        fullscreenBtn.add([btnBg, btnText]);
        
        // Make interactive
        fullscreenBtn.setSize(40, 40);
        fullscreenBtn.setInteractive({ useHandCursor: true });
        
        // Function to update button appearance
        const updateButtonAppearance = (isFullscreen) => {
            btnText.setText(isFullscreen ? '⛶' : '⤢');
            btnBg.clear();
            btnBg.fillStyle(btnBg.isHovered ? 0x000000 : 0x000000, btnBg.isHovered ? 0.7 : 0.5);
            btnBg.fillRoundedRect(-20, -20, 40, 40, 10);
            btnBg.lineStyle(2, 0xFFFFFF);
            btnBg.strokeRoundedRect(-20, -20, 40, 40, 10);
        };
        
        // Check initial fullscreen state and update button
        const isFullscreen = document.fullscreenElement || 
                           document.webkitFullscreenElement || 
                           document.msFullscreenElement;
        updateButtonAppearance(isFullscreen);
        
        // Add hover effect
        fullscreenBtn.on('pointerover', () => {
            btnBg.isHovered = true;
            updateButtonAppearance(document.fullscreenElement || 
                                 document.webkitFullscreenElement || 
                                 document.msFullscreenElement);
        });
        
        fullscreenBtn.on('pointerout', () => {
            btnBg.isHovered = false;
            updateButtonAppearance(document.fullscreenElement || 
                                 document.webkitFullscreenElement || 
                                 document.msFullscreenElement);
        });
        
        // Add click handler
        fullscreenBtn.on('pointerdown', async () => {
            try {
                const isFullscreen = document.fullscreenElement || 
                                   document.webkitFullscreenElement || 
                                   document.msFullscreenElement;
                
                if (!isFullscreen) {
                    // Enter fullscreen on the document element
                    if (document.documentElement.requestFullscreen) {
                        await document.documentElement.requestFullscreen();
                    } else if (document.documentElement.webkitRequestFullscreen) {
                        await document.documentElement.webkitRequestFullscreen();
                    } else if (document.documentElement.msRequestFullscreen) {
                        await document.documentElement.msRequestFullscreen();
                    }
                } else {
                    // Exit fullscreen
                    if (document.exitFullscreen) {
                        await document.exitFullscreen();
                    } else if (document.webkitExitFullscreen) {
                        await document.webkitExitFullscreen();
                    } else if (document.msExitFullscreen) {
                        await document.msExitFullscreen();
                    }
                }
                
                // Update button appearance after fullscreen change
                updateButtonAppearance(!isFullscreen);
            } catch (error) {
                console.warn('Failed to toggle fullscreen:', error);
            }
        });
        
        // Add fullscreen change event listeners
        const fullscreenChangeHandler = () => {
            const isFullscreen = document.fullscreenElement || 
                               document.webkitFullscreenElement || 
                               document.msFullscreenElement;
            updateButtonAppearance(isFullscreen);
        };
        
        document.addEventListener('fullscreenchange', fullscreenChangeHandler);
        document.addEventListener('webkitfullscreenchange', fullscreenChangeHandler);
        document.addEventListener('mozfullscreenchange', fullscreenChangeHandler);
        document.addEventListener('MSFullscreenChange', fullscreenChangeHandler);
        
        // Store references for cleanup
        this.fullscreenBtn = fullscreenBtn;
        this.fullscreenChangeHandler = fullscreenChangeHandler;
        
        // Add sounds
        this.wrongSound = this.sound.add('wrong');
        this.completionSound = this.sound.add('completion_sound');
        
        // Add item sounds
        this.itemSounds = {};
        this.gameConfig.items.forEach(item => {
            this.itemSounds[item.name.toLowerCase()] = this.sound.add(`${item.name.toLowerCase()}_sound`);
        });
        
        // Handle background music
        if (this.gameConfig.backgroundSound) {
            console.log('Setting up background music:', this.gameConfig.backgroundSound);
            try {
                this.backgroundMusic = this.sound.add('background_sound', {
                    volume: 0.1,
                    loop: true
                });
                
                globalBackgroundMusic = this.backgroundMusic;
                
                this.backgroundMusic.on('play', () => {
                    console.log('Background music started playing');
                });
                
                this.backgroundMusic.on('error', (error) => {
                    console.error('Error playing background music:', error);
                });
                
                this.backgroundMusic.play();
            } catch (e) {
                console.error("Error handling background music:", e);
            }
        } else {
            console.log('No background sound configured for this game');
        }
        
        // Create items array from config
        const items = this.gameConfig.items.map(item => ({
            id: item.name.toLowerCase(),
            name: item.name,
            image: item.name.toLowerCase()
        }));
        
        // Shuffle the items array for random placement
        this.shuffleArray(items);
        
        // Calculate scale based on game dimensions
        const scaleX = this.cameras.main.width / this.width;
        const scaleY = this.cameras.main.height / this.height;
        
        // Update picture placement area for row layout
        const picMinX = 50;
        const picMaxX = this.width - 50;
        const picMinY = 100;
        const picMaxY = 250;
        
        // Update name placement area for row layout
        const nameMinX = 50;
        const nameMaxX = this.width - 50;
        const nameMinY = 350;
        const nameMaxY = 400;
        
        // Place pictures
        let placedPictures = [];
        items.forEach((item, index) => {
            let pos = this.getNonOverlappingPosition(
                placedPictures, 
                100, // picture width
                100, // picture height
                picMinX, 
                picMaxX, 
                picMinY, 
                picMaxY
            );
            
            const container = this.add.container(pos.x, pos.y);
            const shadow = this.add.rectangle(6, 6, 100, 100, 0x000000, 0.4);
            const frame = this.add.rectangle(0, 0, 100, 100, 0xFFFFFF, 1);
            const pic = this.add.image(0, 0, item.image)
                .setDisplaySize(100, 100)
                .setData('id', item.id);
            
            container.add([shadow, frame, pic]);
            pic.container = container;
            this.pictures.push(pic);
            placedPictures.push({ x: pos.x, y: pos.y, width: 100, height: 100 });
            
            // Animate picture entry
            container.x = -200;
            container.angle = 180;
            
            this.tweens.add({
                targets: container,
                x: pos.x,
                angle: 0,
                duration: 800,
                delay: 200 + index * 200,
                ease: 'Elastic.easeOut.config(1, 0.5)',
                onComplete: () => {
                    container.x = pos.x;
                    container.y = pos.y;
                    container.angle = 0;
                    
                    this.tweens.add({
                        targets: container,
                        y: pos.y - 10,
                        yoyo: true,
                        duration: 150,
                        ease: 'Sine.easeInOut',
                        repeat: 2
                    });
                }
            });
        });
        
        // Shuffle again for name placement
        this.shuffleArray(items);
        
        // Place name boxes
        let placedNames = [];
        items.forEach((item, index) => {
            let pos = this.getNonOverlappingPosition(
                placedNames, 
                110, // name box width
                40,  // name box height
                nameMinX,
                nameMaxX,
                nameMinY, 
                nameMaxY
            );
            
            // Create a container for the name box
            const container = this.add.container(pos.x, pos.y);
            
            // Create the text first to measure its width
            const text = this.add.text(0, 0, item.name, {
                fontFamily: '"Comic Sans MS", "Marker Felt", "Arial Rounded MT Bold", sans-serif',
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#FFFFFF',
                padding: { x: 6, y: 4 }
            }).setOrigin(0.5);

            // Calculate box width based on text width plus padding
            const boxWidth = text.width + 24; // Reduced padding (12px on each side)
            const boxHeight = 40;  // Keep height fixed

            // Create shadow to match the picture frames
            const shadowGraphics = this.add.graphics();
            shadowGraphics.fillStyle(0x000000, 0.4);
            shadowGraphics.fillRoundedRect(-boxWidth/2 + 6, -20 + 6, boxWidth, boxHeight, 20);
            
            // Create a graphics object for the background (bright blue)
            const backgroundGraphics = this.add.graphics();
            // Add white border first
            backgroundGraphics.lineStyle(2, 0xFFFFFF);
            backgroundGraphics.fillStyle(0x4A90E2, 1);
            backgroundGraphics.fillRoundedRect(-boxWidth/2, -20, boxWidth, boxHeight, 20);
            backgroundGraphics.strokeRoundedRect(-boxWidth/2, -20, boxWidth, boxHeight, 20);
            
            // Add all elements to container in the correct order
            container.add([shadowGraphics, backgroundGraphics, text]);
            
            // Set up container properties
            container.setSize(boxWidth, boxHeight);
            container.setData('id', item.id);
            container.setData('originalX', pos.x);
            container.setData('originalY', pos.y);
            container.setInteractive({ draggable: true });

            // Store the box dimensions for later use (like when matching)
            container.setData('boxWidth', boxWidth);
            container.setData('boxHeight', boxHeight);
            
            // Add hover effect
            container.on('pointerover', () => {
                if (!container.getData('matched')) {
                    this.tweens.add({
                        targets: container,
                        scaleX: 1.05,
                        scaleY: 1.05,
                        duration: 100,
                        ease: 'Back.easeOut'
                    });
                }
            });
            
            container.on('pointerout', () => {
                if (!container.getData('matched')) {
                    this.tweens.add({
                        targets: container,
                        scaleX: 1,
                        scaleY: 1,
                        duration: 100,
                        ease: 'Back.easeIn'
                    });
                }
            });
            
            // Store the container
            this.nameBoxes.push(container);
            
            // Set up drag events
            this.setupPhaserDrag(container);
            
            placedNames.push({ 
                x: pos.x, 
                y: pos.y, 
                width: 110,
                height: 40
            });
            
            // Animate entry
            container.setAlpha(0);
            container.angle = -180;
            
            this.tweens.add({
                targets: container,
                alpha: 1,
                angle: 0,
                duration: 800,
                delay: 200 + (index + items.length) * 200,
                ease: 'Back.easeOut'
            });
        });
    }

    setupPhaserDrag(container) {
        container.on('dragstart', () => {
            if (container.getData('matched')) return;
            container.setDepth(1000);
            
            // Add "picking up" effect
            this.tweens.add({
                targets: container,
                scaleX: 1.1,
                scaleY: 1.1,
                y: container.y - 10,
                duration: 200,
                ease: 'Back.easeOut'
            });
        });

        container.on('drag', (pointer, dragX, dragY) => {
            if (container.getData('matched')) return;
            container.x = dragX;
            container.y = dragY;
        });

        container.on('dragend', () => {
            if (container.getData('matched')) return;
            container.setDepth(0);
            
            // Reset scale and position if not matched
            this.tweens.add({
                targets: container,
                scaleX: 1,
                scaleY: 1,
                duration: 200,
                ease: 'Back.easeOut'
            });

            // Find the closest matching picture
            let closestPic = null;
            let closestDistance = Infinity;

            this.pictures.forEach(pic => {
                if (pic.matched) return;

                const picContainer = pic.container;
                const distance = Phaser.Math.Distance.Between(
                    container.x,
                    container.y,
                    picContainer.x,
                    picContainer.y
                );

                if (distance < 150 && distance < closestDistance) {
                    if (container.getData('id') === pic.getData('id')) {
                        closestDistance = distance;
                        closestPic = pic;
                    }
                }
            });

            if (closestPic) {
                // Correct match
                closestPic.matched = true;
                container.setData('matched', true);
                this.matchedCount++;

                // Play sound
                const itemSound = this.itemSounds[container.getData('id')];
                if (itemSound) {
                    itemSound.play();
                }

                // Update visual style with a fun celebration effect
                const background = container.list[1]; // The background graphics

                // Celebration animation
                this.tweens.add({
                    targets: container,
                    scaleX: [1.2, 1],
                    scaleY: [1.2, 1],
                    duration: 400,
                    ease: 'Back.easeOut',
                    onComplete: () => {
                        // Update the matched state visuals with green color
                        const boxWidth = container.getData('boxWidth');
                        background.clear();
                        background.lineStyle(2, 0xFFFFFF);
                        background.fillStyle(0x4CAF50, 1);
                        background.fillRoundedRect(-boxWidth/2, -20, boxWidth, 40, 20);
                        background.strokeRoundedRect(-boxWidth/2, -20, boxWidth, 40, 20);
                    }
                });

                // Lock position with a bouncy animation
                this.tweens.add({
                    targets: container,
                    x: closestPic.container.x,
                    y: closestPic.container.y + 75,
                    duration: 500,
                    ease: 'Back.easeOut'
                });

                if (this.matchedCount === this.pictures.length) {
                    this.handleGameCompletion();
                }
            } else {
                // No match - return to original position with bounce effect
                this.wrongSound.play();
                this.tweens.add({
                    targets: container,
                    x: container.getData('originalX'),
                    y: container.getData('originalY'),
                    duration: 500,
                    ease: 'Bounce.easeOut'
                });
            }
        });
    }

    handleGameCompletion() {
        // Play completion sound
        if (this.completionSound) {
            this.completionSound.play();
        }

        // Create confetti
        this.createConfetti();

        // Create Play Again button container - positioned to the left and lower
        const playAgainContainer = this.add.container(this.cameras.main.centerX - 80, this.cameras.main.centerY + 150);
        
        // Create shadow for Play Again button
        const playShadow = this.add.graphics();
        playShadow.fillStyle(0x000000, 0.4);
        playShadow.fillRoundedRect(-70 + 6, -20 + 6, 140, 40, 20);
        
        // Create background for Play Again button - purple/pink color
        const playBackground = this.add.graphics();
        playBackground.lineStyle(2, 0xFFFFFF);
        playBackground.fillStyle(0xFF69B4, 1); // Purple/pink color
        playBackground.fillRoundedRect(-70, -20, 140, 40, 20);
        playBackground.strokeRoundedRect(-70, -20, 140, 40, 20);
        
        // Create Play Again text
        const playText = this.add.text(0, 0, 'Spela igen', {
            fontFamily: '"Comic Sans MS", "Marker Felt", "Arial Rounded MT Bold", sans-serif',
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#FFFFFF'
        }).setOrigin(0.5);
        
        // Add elements to Play Again container
        playAgainContainer.add([playShadow, playBackground, playText]);
        playAgainContainer.setSize(140, 40);
        playAgainContainer.setInteractive({ useHandCursor: true });
        
        // Create Return button container - positioned to the right and lower
        const returnContainer = this.add.container(this.cameras.main.centerX + 80, this.cameras.main.centerY + 150);
        
        // Create shadow for Return button
        const returnShadow = this.add.graphics();
        returnShadow.fillStyle(0x000000, 0.4);
        returnShadow.fillRoundedRect(-60 + 6, -20 + 6, 120, 40, 20);
        
        // Create background for Return button - bright red color
        const returnBackground = this.add.graphics();
        returnBackground.lineStyle(2, 0xFFFFFF);
        returnBackground.fillStyle(0xFF4040, 1); // Bright red color
        returnBackground.fillRoundedRect(-60, -20, 120, 40, 20);
        returnBackground.strokeRoundedRect(-60, -20, 120, 40, 20);
        
        // Create Return text
        const returnText = this.add.text(0, 0, 'Tillbaka', {
            fontFamily: '"Comic Sans MS", "Marker Felt", "Arial Rounded MT Bold", sans-serif',
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#FFFFFF'
        }).setOrigin(0.5);
        
        // Add elements to Return container
        returnContainer.add([returnShadow, returnBackground, returnText]);
        returnContainer.setSize(120, 40);
        returnContainer.setInteractive({ useHandCursor: true });
        
        // Add hover effects for Play Again
        playAgainContainer.on('pointerover', () => {
            this.tweens.add({
                targets: playAgainContainer,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 100,
                ease: 'Back.easeOut'
            });
        });
        
        playAgainContainer.on('pointerout', () => {
            this.tweens.add({
                targets: playAgainContainer,
                scaleX: 1,
                scaleY: 1,
                duration: 100,
                ease: 'Back.easeIn'
            });
        });
        
        // Add hover effects for Return
        returnContainer.on('pointerover', () => {
            this.tweens.add({
                targets: returnContainer,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 100,
                ease: 'Back.easeOut'
            });
        });
        
        returnContainer.on('pointerout', () => {
            this.tweens.add({
                targets: returnContainer,
                scaleX: 1,
                scaleY: 1,
                duration: 100,
                ease: 'Back.easeIn'
            });
        });
        
        // Add click handlers
        playAgainContainer.on('pointerdown', () => {
            this.cleanup();
            this.scene.restart();
        });
        
        returnContainer.on('pointerdown', () => {
            this.cleanup();
            
            // Show splash screen and game selection
            const splashScreen = document.getElementById('splash-screen');
            splashScreen.style.display = 'flex';
            
            // Remove the canvas
            const canvas = document.querySelector('canvas');
            if (canvas) {
                canvas.remove();
            }
            
            // Reinitialize game selection
            initializeGameSelection();
        });
        
        // Store references for cleanup
        this.restartBtn = playAgainContainer;
        this.returnBtn = returnContainer;
    }

    cleanup() {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        // Stop and destroy global background music if it exists
        if (globalBackgroundMusic) {
            try {
                if (globalBackgroundMusic.isPlaying) {
                    globalBackgroundMusic.stop();
                }
                if (globalBackgroundMusic.source) {
                    try {
                        globalBackgroundMusic.source.disconnect();
                    } catch (e) {
                        console.warn("Error disconnecting background music source:", e);
                    }
                }
                globalBackgroundMusic = null;
            } catch (e) {
                console.warn("Error cleaning up global background music:", e);
            }
        }

        // Destroy all game objects
        this.nameBoxes.forEach(container => {
            container.destroy();
        });
        
        this.pictures.forEach(pic => {
            if (pic.container) {
                pic.container.destroy();
            }
        });
        
        // Reset arrays
        this.nameBoxes = [];
        this.pictures = [];
        this.matchedCount = 0;
        
        // Destroy Phaser buttons
        if (this.restartBtn) {
            this.restartBtn.destroy();
            this.restartBtn = null;
        }
        if (this.returnBtn) {
            this.returnBtn.destroy();
            this.returnBtn = null;
        }
        
        // Clean up sounds safely
        if (this.backgroundMusic) {
            try {
                if (this.backgroundMusic.isPlaying) {
                    this.backgroundMusic.stop();
                }
                if (this.backgroundMusic.source) {
                    try {
                        this.backgroundMusic.source.disconnect();
                    } catch (e) {
                        console.warn("Error disconnecting background music source:", e);
                    }
                }
            } catch (e) {
                console.warn("Error cleaning up background music:", e);
            }
        }

        if (this.completionSound) {
            try {
                if (this.completionSound.isPlaying) {
                    this.completionSound.stop();
                }
                if (this.completionSound.source) {
                    try {
                        this.completionSound.source.disconnect();
                    } catch (e) {
                        console.warn("Error disconnecting completion sound source:", e);
                    }
                }
            } catch (e) {
                console.warn("Error cleaning up completion sound:", e);
            }
        }

        if (this.wrongSound) {
            try {
                if (this.wrongSound.isPlaying) {
                    this.wrongSound.stop();
                }
                if (this.wrongSound.source) {
                    try {
                        this.wrongSound.source.disconnect();
                    } catch (e) {
                        console.warn("Error disconnecting wrong sound source:", e);
                    }
                }
            } catch (e) {
                console.warn("Error cleaning up wrong sound:", e);
            }
        }
        
        // Clean up item sounds
        if (this.itemSounds) {
            Object.values(this.itemSounds).forEach(sound => {
                try {
                    if (sound.isPlaying) {
                        sound.stop();
                    }
                    if (sound.source) {
                        try {
                            sound.source.disconnect();
                        } catch (e) {
                            console.warn("Error disconnecting item sound source:", e);
                        }
                    }
                } catch (e) {
                    console.warn("Error cleaning up item sound:", e);
                }
            });
        }

        // Remove fullscreen button
        if (this.fullscreenBtn) {
            this.fullscreenBtn.destroy();
            this.fullscreenBtn = null;
        }

        // Remove fullscreen event listeners
        if (this.fullscreenChangeHandler) {
            document.removeEventListener('fullscreenchange', this.fullscreenChangeHandler);
            document.removeEventListener('webkitfullscreenchange', this.fullscreenChangeHandler);
            document.removeEventListener('mozfullscreenchange', this.fullscreenChangeHandler);
            document.removeEventListener('MSFullscreenChange', this.fullscreenChangeHandler);
            this.fullscreenChangeHandler = null;
        }

        this.isTransitioning = false;
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    getNonOverlappingPosition(existing, width, height, minX, maxX, minY, maxY) {
        // Calculate base positions for a row-based layout
        const totalWidth = maxX - minX;
        const spacing = totalWidth / 5; // Divide space into 5 parts for 4 items
        
        // Get current item index
        const index = existing.length;
        
        // Calculate base X position (evenly spaced)
        const baseX = minX + spacing + (spacing * index);
        
        // Add slight height variation based on index
        const heightVariation = (index % 2 === 0) ? 0 : 40;
        const baseY = minY + (maxY - minY) / 2 + heightVariation;
        
        return {
            x: baseX,
            y: baseY
        };
    }

    createConfetti() {
        // Create a particle emitter for confetti
        const particles = this.add.particles('particle');
        
        const emitter = particles.createEmitter({
            x: { min: 0, max: this.cameras.main.width },
            y: -10,
            lifespan: 4000,
            speedY: { min: 200, max: 400 },
            speedX: { min: -100, max: 100 },
            angle: { min: 0, max: 360 },
            rotate: { min: 0, max: 360 },
            scale: { start: 1, end: 0.2 }, // Larger particles
            quantity: 4, // More particles per emission
            frequency: 40, // Slightly faster emission
            tint: [ // More vibrant colors
                0xFF1744, // Bright red
                0xFFEA00, // Bright yellow
                0x00E676, // Bright green
                0x2979FF, // Bright blue
                0xAA00FF, // Bright purple
                0xFF80AB, // Bright pink
                0xFFFF00, // Pure yellow
                0x76FF03  // Lime
            ],
            alpha: { start: 1, end: 0 },
            blendMode: 'ADD'
        });
        
        // Stop emitting after 3 seconds
        this.time.delayedCall(3000, () => {
            emitter.stop();
            // Destroy the particle system after all particles have died (4 seconds)
            this.time.delayedCall(4000, () => {
                particles.destroy();
            });
        });
    }
} 