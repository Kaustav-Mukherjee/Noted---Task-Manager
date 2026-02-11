// Simple beep sound (Base64 encoded WAV)
const beepSound = "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU..."; // Placeholder shortened for brevity in thought, I will use a real one in the actual call or valid code.

export const playAlertSound = () => {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.value = 880; // A5
        gainNode.gain.value = 0.1;

        oscillator.start();

        // Fade out
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.5);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
        console.error("Failed to play sound:", error);
    }
};
