// Web Audio API synthesizer for paper rustle, stamp slam and celebratory chimes

class SoundFX {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Realistic paper flip swoosh
  playPageFlip() {
    try {
      this.init();
      if (!this.ctx) return;

      const bufferSize = Math.floor(this.ctx.sampleRate * 0.12);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Pinkish noise with fast envelope
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900 + Math.random() * 400, this.ctx.currentTime);
      filter.Q.setValueAtTime(1.8, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start();
    } catch {
      // Audio not permitted or failed, silently continue
    }
  }

  // Heavy rubber stamp impact "THUD" + squelch
  playStamp() {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // 1. Low thud
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.18);

      oscGain.gain.setValueAtTime(0.7, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);

      // 2. Click/snap transient of wooden handle
      const clickBufferSize = Math.floor(this.ctx.sampleRate * 0.05);
      const clickBuffer = this.ctx.createBuffer(1, clickBufferSize, this.ctx.sampleRate);
      const clickData = clickBuffer.getChannelData(0);
      for (let i = 0; i < clickBufferSize; i++) {
        clickData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (clickBufferSize * 0.15));
      }
      const clickSource = this.ctx.createBufferSource();
      clickSource.buffer = clickBuffer;

      const clickFilter = this.ctx.createBiquadFilter();
      clickFilter.type = 'highpass';
      clickFilter.frequency.setValueAtTime(1200, now);

      const clickGain = this.ctx.createGain();
      clickGain.gain.setValueAtTime(0.45, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      clickSource.connect(clickFilter);
      clickFilter.connect(clickGain);
      clickGain.connect(this.ctx.destination);
      clickSource.start(now);

      // Haptic feedback if on mobile
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate?.([40, 30, 80]);
        } catch {
          // ignore
        }
      }
    } catch {
      // Audio not permitted or failed
    }
  }

  // Pleasant chime on reveal
  playChime() {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio

      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);

        gain.gain.setValueAtTime(0, now + idx * 0.09);
        gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.09 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.6);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.65);
      });
    } catch {
      // ignore
    }
  }
}

export const sounds = new SoundFX();
