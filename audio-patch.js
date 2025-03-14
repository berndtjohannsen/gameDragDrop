// Patch Phaser's WebAudioSound to prevent disconnect errors
function patchPhaserAudio() {
    if (Phaser && Phaser.Sound && Phaser.Sound.WebAudioSound && Phaser.Sound.WebAudioSound.prototype) {
        // Store the original destroy method
        const originalDestroy = Phaser.Sound.WebAudioSound.prototype.destroy;
        
        // Override the destroy method to safely handle null sources
        Phaser.Sound.WebAudioSound.prototype.destroy = function() {
            try {
                // First, check if this sound is still playing and stop it
                if (this.isPlaying) {
                    try {
                        this.stop();
                    } catch (e) {
                        console.warn("Error stopping sound:", e);
                    }
                }
                
                // Safely disconnect the source if it exists
                if (this.source) {
                    try {
                        this.source.disconnect();
                    } catch (e) {
                        console.warn("Error disconnecting audio source:", e);
                    }
                    this.source = null;
                }
                
                // Safely remove from sound manager
                if (this.manager && this.manager.sounds) {
                    this.manager.sounds = this.manager.sounds.filter(s => s !== this);
                }
                
                // Safely handle event listeners
                try {
                    if (typeof this.removeEventListener === 'function') {
                        this.removeEventListener();
                    }
                } catch (err) {
                    console.warn("Error removing event listeners:", err);
                }
                
                // Set all references to null to help garbage collection
                this.pendingRemove = true;
                
                // Don't call the original destroy method as it might cause errors
                // Just clean up the basic properties
                this.source = null;
                this.buffer = null;
                
                // Return true to indicate successful destruction
                return true;
            } catch (e) {
                console.warn("Error in patched destroy method:", e);
                // Clean up as much as possible
                this.source = null;
                this.buffer = null;
                this.pendingRemove = true;
                
                // Safely remove from sound manager
                if (this.manager && this.manager.sounds) {
                    this.manager.sounds = this.manager.sounds.filter(s => s !== this);
                }
                
                // Return true anyway to prevent further errors
                return true;
            }
        };
        
        // Also patch the SoundManager's remove method to be more robust
        if (Phaser.Sound.SoundManager && Phaser.Sound.SoundManager.prototype) {
            const originalRemove = Phaser.Sound.SoundManager.prototype.remove;
            
            Phaser.Sound.SoundManager.prototype.remove = function(sound) {
                try {
                    // First check if the sound exists
                    if (!sound) {
                        return false;
                    }
                    
                    // Try to stop the sound first
                    try {
                        if (sound.isPlaying) {
                            sound.stop();
                        }
                    } catch (e) {
                        console.warn("Error stopping sound in remove:", e);
                    }
                    
                    // Remove from the sounds array safely
                    const index = this.sounds.indexOf(sound);
                    if (index !== -1) {
                        this.sounds.splice(index, 1);
                    }
                    
                    // Call our patched destroy method
                    sound.destroy();
                    
                    return true;
                } catch (e) {
                    console.warn("Error in patched remove method:", e);
                    
                    // Try to clean up anyway
                    const index = this.sounds.indexOf(sound);
                    if (index !== -1) {
                        this.sounds.splice(index, 1);
                    }
                    
                    return false;
                }
            };
        }
        
        console.log("Phaser WebAudioSound patched to prevent disconnect errors");
    }
} 