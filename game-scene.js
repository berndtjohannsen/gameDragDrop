class GameScene extends Phaser.Scene {
    constructor(gameDir, gameConfig) {
        super({ key: 'GameScene' });
        this.pictures = [];
        this.nameElements = [];
        this.matchedCount = 0;
        this.restartBtn = null;
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
    }

    create() {
        // Clean up any existing resources first
        this.cleanup();
        
        // Add background
        this.add.image(this.width / 2, this.height / 2, 'background')
            .setDisplaySize(this.width, this.height);
        
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
                if (!globalBackgroundMusic) {
                    console.log('Creating new background music instance');
                    this.backgroundMusic = this.sound.add('background_sound', {
                        volume: 0.1,
                        loop: true
                    });
                    globalBackgroundMusic = this.backgroundMusic;
                    
                    // Add error handling for sound playing
                    this.backgroundMusic.on('play', () => {
                        console.log('Background music started playing');
                    });
                    
                    this.backgroundMusic.on('error', (error) => {
                        console.error('Error playing background music:', error);
                    });
                    
                    this.backgroundMusic.play();
                } else {
                    console.log('Reusing existing background music instance');
                    const musicWasPlaying = globalBackgroundMusic.isPlaying;
                    this.backgroundMusic = this.sound.add('background_sound', {
                        volume: 0.1,
                        loop: true
                    });
                    globalBackgroundMusic = this.backgroundMusic;
                    if (musicWasPlaying) {
                        this.backgroundMusic.play();
                    }
                }
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
        
        // Update picture placement area for row layout
        const picMinX = 50;
        const picMaxX = this.width - 50;
        const picMinY = 100;  // Changed from 50 to 100 to move pictures down
        const picMaxY = 250;  // Kept the same to maintain spacing
        
        // Update name placement area for row layout
        const nameMinX = 50;
        const nameMaxX = this.width - 50;
        const nameMinY = 400;  // Kept the same
        const nameMaxY = 500;  // Kept the same
        
        // Place pictures
        let placedPictures = [];
        items.forEach((item, index) => {
            // Find a non-overlapping position for the picture
            let pos = this.getNonOverlappingPosition(
                placedPictures, 
                100, // picture width
                100, // picture height
                picMinX, 
                picMaxX, 
                picMinY, 
                picMaxY
            );
            
            // Create a container for the picture
            const container = this.add.container(pos.x, pos.y);
            
            // Create shadow and frame
            const shadow = this.add.rectangle(6, 6, 100, 100, 0x000000, 0.4);
            const frame = this.add.rectangle(0, 0, 100, 100, 0xFFFFFF, 1);
            
            // Create the picture
            const pic = this.add.image(0, 0, item.image)
                .setDisplaySize(100, 100)
                .setData('id', item.id);
            
            container.add([shadow, frame, pic]);
            pic.container = container;
            this.pictures.push(pic);
            
            // Add to placed pictures array
            placedPictures.push({ 
                x: pos.x, 
                y: pos.y, 
                width: 100, 
                height: 100
            });
            
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
                    
                    // Add bounce effect
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
            // Find position for name box
            let pos = this.getNonOverlappingPosition(
                placedNames, 
                130, // name box width
                50,  // name box height
                nameMinX,
                nameMaxX,
                nameMinY, 
                nameMaxY
            );
            
            // Create name box
            const nameElement = document.createElement('div');
            nameElement.className = 'name-box';
            nameElement.textContent = item.name;
            nameElement.dataset.id = item.id;
            
            // Position name box and store original position
            const left = pos.x - 65; // half width
            const top = pos.y - 25;  // half height
            nameElement.style.left = left + 'px';
            nameElement.style.top = top + 'px';
            
            // Store original position in the dataset
            nameElement.dataset.originalX = left;
            nameElement.dataset.originalY = top;
            
            document.getElementById('game-container').appendChild(nameElement);
            this.setupDrag(nameElement);
            this.nameElements.push(nameElement);
            
            // Add to placed names array
            placedNames.push({ 
                x: pos.x, 
                y: pos.y, 
                width: 130,
                height: 50
            });
            
            // Animate entry
            nameElement.style.opacity = '0';
            nameElement.style.transform = 'rotate(-180deg)';
            
            setTimeout(() => {
                nameElement.style.opacity = '1';
                nameElement.style.transition = 'transform 0.8s ease-out';
                nameElement.style.transform = 'rotate(0deg)';
            }, 200 + (index + items.length) * 200);
        });
    }

    checkOverlap(obj1, obj2) {
        const bounds1 = obj1.getBounds();
        const bounds2 = obj2.getBounds();
        return Phaser.Geom.Rectangle.Overlaps(bounds1, bounds2);
    }

    handleMatch(droppedItem, targetItem) {
        if (droppedItem.name === targetItem.name) {
            // Correct match
            droppedItem.matched = true;
            targetItem.matched = true;
            droppedItem.gameObject.setPosition(targetItem.target.x, targetItem.target.y);
            droppedItem.gameObject.disableInteractive();
            targetItem.sound.play();
            
            this.matchedCount++;
            
            // Check for game completion
            if (this.matchedCount === this.items.length) {
                this.completionSound.play();
                this.time.delayedCall(500, () => {
                    this.showCelebration();
                });
            }
        } else {
            // Wrong match
            this.wrongSound.play();
            droppedItem.gameObject.setPosition(droppedItem.gameObject.input.dragStartX, droppedItem.gameObject.input.dragStartY);
        }
    }

    handleGameCompletion() {
        this.completionSound.play();
        
        setTimeout(() => {
            // Bounce animation for pictures and names
            this.pictures.forEach((pic, index) => {
                if (pic.container) {
                    this.tweens.add({
                        targets: pic.container,
                        y: pic.container.y - 20,
                        angle: Phaser.Math.Between(-10, 10),
                        duration: 300,
                        yoyo: true,
                        repeat: 2,
                        delay: index * 100,
                        ease: 'Bounce.Out'
                    });
                }
            });
            
            // Create confetti
            const colors = ['#FF5252', '#FFD740', '#64FFDA', '#448AFF', '#B388FF', '#F48FB1'];
            for (let i = 0; i < 150; i++) {
                setTimeout(() => {
                    const confetti = document.createElement('div');
                    confetti.className = 'confetti';
                    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                    confetti.style.left = `${Math.random() * this.width}px`;
                    document.getElementById('game-container').appendChild(confetti);
                    
                    setTimeout(() => confetti.parentNode?.removeChild(confetti), 5000);
                }, Math.random() * 1000);
            }
            
            // Create buttons container
            setTimeout(() => {
                const buttonsContainer = document.createElement('div');
                buttonsContainer.style.position = 'absolute';
                buttonsContainer.style.left = `${this.width / 2}px`;
                buttonsContainer.style.top = `${this.height * 0.7}px`;
                buttonsContainer.style.transform = 'translateX(-50%)';
                buttonsContainer.style.display = 'flex';
                buttonsContainer.style.gap = '20px';
                
                // Create Play Again button
                const restartBtn = document.createElement('div');
                restartBtn.className = 'play-again-btn';
                restartBtn.textContent = 'Spela igen';
                restartBtn.style.transform = 'rotate(-1deg)';
                restartBtn.style.position = 'relative';
                restartBtn.style.padding = '8px 16px';
                restartBtn.style.fontSize = '16px';
                restartBtn.addEventListener('click', () => restartGame(this));
                
                // Create Return button
                const returnBtn = document.createElement('div');
                returnBtn.className = 'play-again-btn';
                returnBtn.textContent = 'Tillbaka';
                returnBtn.style.transform = 'rotate(1deg)';
                returnBtn.style.background = 'linear-gradient(to bottom, #FF6B6B, #FF4444)';
                returnBtn.style.border = '3px solid #CC0000';
                returnBtn.style.boxShadow = '0 3px 0 #990000, 0 4px 6px rgba(0,0,0,0.2)';
                returnBtn.style.position = 'relative';
                returnBtn.style.padding = '8px 16px';
                returnBtn.style.fontSize = '16px';
                returnBtn.addEventListener('click', () => {
                    // Clean up the scene first
                    this.cleanup();
                    
                    // Stop all sounds
                    this.sound.stopAll();
                    
                    // Destroy the game instance
                    if (gameInstance) {
                        safeDestroyGame();
                        gameInstance = null;
                    }
                    
                    // Show splash screen
                    document.getElementById('splash-screen').style.display = 'flex';
                });
                
                buttonsContainer.appendChild(restartBtn);
                buttonsContainer.appendChild(returnBtn);
                document.getElementById('game-container').appendChild(buttonsContainer);
                this.restartBtn = buttonsContainer;
            }, 1500);
        }, 500);
    }

    cleanup() {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        // Remove all name elements
        this.nameElements.forEach(element => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
        
        // Remove all pictures
        this.pictures.forEach(pic => {
            if (pic.container && pic.container.parentNode) {
                pic.container.parentNode.removeChild(pic.container);
            }
        });
        
        // Reset arrays
        this.nameElements = [];
        this.pictures = [];
        this.matchedCount = 0;
        
        // Remove buttons container
        if (this.restartBtn?.parentNode) {
            this.restartBtn.parentNode.removeChild(this.restartBtn);
            this.restartBtn = null;
        }
        
        // Remove all confetti
        document.querySelectorAll('.confetti').forEach(c => c.parentNode?.removeChild(c));
        
        // Clean up sounds
        if (this.backgroundMusic) {
            this.backgroundMusic.stop();
            this.backgroundMusic.destroy();
        }
        if (this.completionSound) {
            this.completionSound.destroy();
        }
        if (this.wrongSound) {
            this.wrongSound.destroy();
        }
        
        // Clean up item sounds
        if (this.items) {
            this.items.forEach(item => {
                if (item.sound) {
                    item.sound.destroy();
                }
            });
        }
        
        // Remove only game-specific elements, preserving the canvas
        const gameContainer = document.getElementById('game-container');
        const elementsToRemove = gameContainer.querySelectorAll('.name-box, .confetti, .play-again-btn');
        elementsToRemove.forEach(element => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });

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

    setupDrag(element) {
        let isDragging = false;
        let startX;
        let startY;
        let elementX;
        let elementY;
        let originalX;
        let originalY;

        element.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            elementX = element.offsetLeft;
            elementY = element.offsetTop;
            originalX = elementX;
            originalY = elementY;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            element.style.left = (elementX + dx) + 'px';
            element.style.top = (elementY + dy) + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;

            // Get the dropped element's position and dimensions
            const elementRect = element.getBoundingClientRect();
            const elementCenterX = elementRect.left + elementRect.width / 2;
            const elementCenterY = elementRect.top + elementRect.height / 2;

            // Convert screen coordinates to game world coordinates
            const gameContainer = document.getElementById('game-container');
            const containerRect = gameContainer.getBoundingClientRect();
            const worldX = elementCenterX - containerRect.left;
            const worldY = elementCenterY - containerRect.top;

            // Check for matches with pictures
            let matched = false;
            this.pictures.forEach(pic => {
                if (pic.matched) return; // Skip already matched pictures

                const picContainer = pic.container;
                const picBounds = picContainer.getBounds();
                
                // Check if the name box is close enough to the picture
                const distance = Math.sqrt(
                    Math.pow(worldX - picBounds.centerX, 2) + 
                    Math.pow(worldY - picBounds.centerY, 2)
                );

                if (distance < 100) { // Match threshold
                    // Check if the name matches the picture
                    if (element.dataset.id === pic.getData('id')) {
                        // Correct match
                        matched = true;
                        pic.matched = true;
                        element.matched = true;
                        this.matchedCount++;
                        
                        // Play the matching item's sound
                        const itemSound = this.itemSounds[element.dataset.id];
                        if (itemSound) {
                            itemSound.play();
                        }
                        
                        // Position under the picture (slightly overlapping)
                        element.style.left = (picBounds.centerX - elementRect.width / 2) + 'px';
                        element.style.top = (picBounds.centerY + 30) + 'px'; // Position below the picture
                        
                        // Add green background and make text white
                        element.style.background = 'linear-gradient(to bottom, #4CAF50, #45a049)';
                        element.style.color = 'white';
                        element.style.border = '3px solid #2E7D32';
                        element.style.boxShadow = '0 3px 0 #1B5E20, 0 4px 6px rgba(0,0,0,0.2)';
                        
                        // Check for game completion
                        if (this.matchedCount === this.pictures.length) {
                            this.handleGameCompletion();
                        }
                    } else {
                        // Wrong match
                        this.wrongSound.play();
                        // Return to original position
                        element.style.left = originalX + 'px';
                        element.style.top = originalY + 'px';
                    }
                }
            });

            // If no match was found or dropped not near any picture, play wrong sound and return to original position
            if (!matched && !element.matched) {
                this.wrongSound.play();
                element.style.left = originalX + 'px';
                element.style.top = originalY + 'px';
            }
        });
    }
} 