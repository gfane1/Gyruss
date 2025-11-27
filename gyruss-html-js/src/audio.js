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
        },
        plasma: () => {
          const osc1 = this.audioCtx.createOscillator();
          const osc2 = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          const filter = this.audioCtx.createBiquadFilter();
          
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(800, this.audioCtx.currentTime);
          osc1.frequency.exponentialRampToValueAtTime(200, this.audioCtx.currentTime + 0.15);
          
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(1600, this.audioCtx.currentTime);
          osc2.frequency.exponentialRampToValueAtTime(400, this.audioCtx.currentTime + 0.15);
          
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(2000, this.audioCtx.currentTime);
          
          gain.gain.setValueAtTime(0.25, this.audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.15);
          
          osc1.connect(filter);
          osc2.connect(filter);
          filter.connect(gain);
          gain.connect(this.audioCtx.destination);
          osc1.start();
          osc2.start();
          osc1.stop(this.audioCtx.currentTime + 0.15);
          osc2.stop(this.audioCtx.currentTime + 0.15);
        },
        wave: () => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          const lfo = this.audioCtx.createOscillator();
          const lfoGain = this.audioCtx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, this.audioCtx.currentTime);
          
          lfo.type = 'sine';
          lfo.frequency.setValueAtTime(20, this.audioCtx.currentTime);
          lfoGain.gain.setValueAtTime(100, this.audioCtx.currentTime);
          
          gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.2);
          
          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency);
          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          lfo.start();
          osc.start();
          lfo.stop(this.audioCtx.currentTime + 0.2);
          osc.stop(this.audioCtx.currentTime + 0.2);
        },

        bigExplosion: () => {
          // Enhanced explosion for bosses
          const bufferSize = this.audioCtx.sampleRate * 1.0;
          const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
          const source = this.audioCtx.createBufferSource();
          const gain = this.audioCtx.createGain();
          const filter = this.audioCtx.createBiquadFilter();
          const distortion = this.audioCtx.createWaveShaper();
          
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(3000, this.audioCtx.currentTime);
          filter.frequency.exponentialRampToValueAtTime(20, this.audioCtx.currentTime + 0.8);
          
          // Add distortion for more impact
          const curve = new Float32Array(256);
          for (let i = 0; i < 256; i++) {
            const x = (i - 128) / 128;
            curve[i] = Math.tanh(x * 3) * 0.7;
          }
          distortion.curve = curve;
          
          gain.gain.setValueAtTime(0.6, this.audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 1.0);
          
          source.buffer = buffer;
          source.connect(distortion);
          distortion.connect(filter);
          filter.connect(gain);
          gain.connect(this.audioCtx.destination);
          source.start();
          source.stop(this.audioCtx.currentTime + 1.0);
        },
        powerUp: () => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(400, this.audioCtx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(1200, this.audioCtx.currentTime + 0.4);
          gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.4);
          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          osc.start();
          osc.stop(this.audioCtx.currentTime + 0.4);
        }
      };
    } catch {
      console.warn("Web Audio API is not supported in this browser.");
    }
  }
};