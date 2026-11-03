let audioContext = null;
let audioUnlocked = false;

export async function unlockWhatsAppSound() {
  try {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    if (!audioContext) {
      audioContext = new AudioContextClass();
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    audioUnlocked = audioContext.state === "running";
  } catch (error) {
    console.error("Audio unlock error:", error);
  }
}

// Plays one soft note: quick attack, smooth fade out.
function playNote({ freq, start, duration, volume = 0.18, type = "sine" }) {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain);
  gain.connect(audioContext.destination);

  osc.start(start);
  osc.stop(start + duration + 0.05);
}

// Each preset is a list of notes: [frequency in Hz, delay in seconds, length in seconds]
const SOUNDS = {
  // Two rising notes, like a modern message tone (default).
  chime: [
    { freq: 659.25, at: 0, len: 0.25, type: "sine" }, // E5
    { freq: 987.77, at: 0.12, len: 0.45, type: "sine" }, // B5
  ],

  // Short bubbly "pop".
  pop: [
    { freq: 523.25, at: 0, len: 0.12, type: "triangle" }, // C5
    { freq: 784.0, at: 0.07, len: 0.18, type: "triangle" }, // G5
  ],

  // Three note happy arpeggio.
  bell: [
    { freq: 523.25, at: 0, len: 0.3, type: "sine" }, // C5
    { freq: 659.25, at: 0.1, len: 0.3, type: "sine" }, // E5
    { freq: 783.99, at: 0.2, len: 0.55, type: "sine" }, // G5
  ],

  // Single clean ding.
  ding: [{ freq: 1174.66, at: 0, len: 0.7, type: "sine" }], // D6
};

export async function playWhatsAppSound(sound = "chime") {
  try {
    if (!audioContext || !audioUnlocked) {
      console.warn("WhatsApp audio is not unlocked");
      return;
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const notes = SOUNDS[sound] || SOUNDS.chime;
    const now = audioContext.currentTime;

    notes.forEach((note) =>
      playNote({
        freq: note.freq,
        start: now + note.at,
        duration: note.len,
        type: note.type,
      })
    );
  } catch (error) {
    console.error("WhatsApp sound playback error:", error);
  }
}