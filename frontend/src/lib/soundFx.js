/**
 * Web Audio API Sound FX Engine
 * =============================
 * Provides synthesized futuristic sound effects without needing external audio file downloads.
 */

class SoundFxEngine {
  constructor() {
    this.ctx = null
  }

  getAudioContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
    return this.ctx
  }

  // Soft tactile haptic click
  playHapticClick() {
    try {
      const ctx = this.getAudioContext()
      if (!ctx) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(600, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.04)
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.04)
    } catch (e) {}
  }

  // Pleasant double chime for Cart Add
  playCartSound() {
    try {
      const ctx = this.getAudioContext()
      if (!ctx) return
      const now = ctx.currentTime

      // First note (E5)
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(659.25, now)
      gain1.gain.setValueAtTime(0.2, now)
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start(now)
      osc1.stop(now + 0.15)

      // Second note (B5)
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(987.77, now + 0.08)
      gain2.gain.setValueAtTime(0.25, now + 0.08)
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.25)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(now + 0.08)
      osc2.stop(now + 0.25)
    } catch (e) {}
  }

  // Metallic Cha-Ching for Order Checkout
  playCashRegisterSound() {
    try {
      const ctx = this.getAudioContext()
      if (!ctx) return
      const now = ctx.currentTime

      const freqs = [1200, 1500, 1800, 2400]
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(f, now + idx * 0.03)
        gain.gain.setValueAtTime(0.15, now + idx * 0.03)
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.03 + 0.2)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now + idx * 0.03)
        osc.stop(now + idx * 0.03 + 0.2)
      })
    } catch (e) {}
  }

  // Fanfare victory sound for Reward Scratch Reveal
  playWinSound() {
    try {
      const ctx = this.getAudioContext()
      if (!ctx) return
      const now = ctx.currentTime
      const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, now + idx * 0.08)
        gain.gain.setValueAtTime(0.2, now + idx * 0.08)
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.3)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now + idx * 0.08)
        osc.stop(now + idx * 0.08 + 0.3)
      })
    } catch (e) {}
  }

  // Scratch friction sound
  playScratchSound() {
    try {
      const ctx = this.getAudioContext()
      if (!ctx) return
      const bufferSize = ctx.sampleRate * 0.03
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1
      }
      const noise = ctx.createBufferSource()
      noise.buffer = buffer
      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.value = 1000
      filter.Q.value = 3
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03)

      noise.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)
      noise.start()
    } catch (e) {}
  }
}

export const soundFx = new SoundFxEngine()
