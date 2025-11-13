// --- AUDIO SYSTEM ---
window.Gyruss = window.Gyruss || {};

Gyruss.Audio = {
  bgm: null,
  soundToggle: null,
  audioCtx: null,
  sfx: null,
  audioStarted: false,
  soundEnabled: true,

  init() {
    this.bgm = document.getElementById('bgmAudio');
    this.soundToggle = document.getElementById('soundToggle');
    
    if (this.soundToggle) {
      this.soundToggle.textContent = 'S';
      this.soundToggle.setAttribute('aria-pressed', String(this.soundEnabled));
      this.soundToggle.addEventListener('click', () => this.toggleSound());
    }
  },

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    if (this.soundToggle) {
      this.soundToggle.setAttribute('aria-pressed', String(this.soundEnabled));
    }
    
    if (!this.soundEnabled) {
      if (this.bgm) this.bgm.pause();
      if (this.audioCtx) this.audioCtx.suspend();
    } else {
      if (this.audioCtx) this.audioCtx.resume();
      if (this.bgm && this.audioStarted) this.bgm.play();
    }
  },

  initAudioContext() {
    if (this.audioCtx) return;
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.sfx = {
        play: (sound) => {
          if (!this.audioCtx || !this.sfx[sound] || !this.soundEnabled) return;
          this.sfx[sound]();
        },
        laser: () => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1200, this.audioCtx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(400, this.audioCtx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.1);
          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          osc.start();
          osc.stop(this.audioCtx.currentTime + 0.1);
        },
        explosion: () => {
          const bufferSize = this.audioCtx.sampleRate * 0.5;
          const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
          const source = this.audioCtx.createBufferSource();
          const gain = this.audioCtx.createGain();
          const filter = this.audioCtx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1600, this.audioCtx.currentTime);
          filter.frequency.exponentialRampToValueAtTime(50, this.audioCtx.currentTime + 0.3);
          gain.gain.setValueAtTime(0.4, this.audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.3);
          source.buffer = buffer;
          source.connect(filter);
          filter.connect(gain);
          gain.connect(this.audioCtx.destination);
          source.start();
          source.stop(this.audioCtx.currentTime + 0.5);
        },
        hit: () => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(400, this.audioCtx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(100, this.audioCtx.currentTime + 0.2);
          gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.2);
          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          osc.start();
          osc.stop(this.audioCtx.currentTime + 0.2);
        },
        warp: () => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(50, this.audioCtx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(1200, this.audioCtx.currentTime + 2.5);
          gain.gain.setValueAtTime(0.5, this.audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 2.6);
          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          osc.start();
          osc.stop(this.audioCtx.currentTime + 2.6);
        }
      };
    } catch {
      console.warn("Web Audio API is not supported in this browser.");
    }
  }
};