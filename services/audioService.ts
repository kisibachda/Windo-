import { AppSettings } from '../types';

class AudioService {
  private audioContext: AudioContext | null = null;
  private customAudioBuffer: AudioBuffer | null = null;
  
  // Track active playback to allow stopping
  private currentSource: AudioBufferSourceNode | OscillatorNode | null = null;
  private stopTimeout: number | null = null;
  private loopInterval: number | null = null;
  
  // Callback when audio naturally finishes or is stopped
  private onPlaybackEnd: (() => void) | null = null;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  // Play a single bell sound. Returns duration in ms.
  private playBellSound(volume: number): number {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(261.63, ctx.currentTime + 0.5); // C4

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.6);
    
    this.currentSource = osc;
    return 600; // ms
  }

  public playSuccessSound(volume: number) {
    const ctx = this.getContext();
    const now = ctx.currentTime;
    
    // Play a pleasant ascending major triad (C Major: C5, E5, G5)
    // Frequencies: C5(523.25), E5(659.25), G5(783.99)
    const notes = [523.25, 659.25, 783.99];
    
    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = freq;
        
        // Stagger the notes slightly for an arpeggio effect
        const startTime = now + (i * 0.05);
        
        // Envelope
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(volume * 0.2, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + 0.5);
    });
  }

  private speakText(text: string, volume: number, voiceURI: string | null, onEnd?: () => void) {
    if ('speechSynthesis' in window) {
      // Cancel existing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = volume;
      utterance.rate = 1;
      
      // Attempt to set voice if provided
      if (voiceURI) {
        const voices = window.speechSynthesis.getVoices();
        const selectedVoice = voices.find(v => v.voiceURI === voiceURI);
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
      }

      if (onEnd) {
        utterance.onend = onEnd;
      }
      
      window.speechSynthesis.speak(utterance);
    }
  }

  private async playCustom(base64Data: string, volume: number, loop: boolean) {
    try {
      const ctx = this.getContext();
      
      if (!this.customAudioBuffer) {
        const response = await fetch(base64Data);
        const arrayBuffer = await response.arrayBuffer();
        this.customAudioBuffer = await ctx.decodeAudioData(arrayBuffer);
      }

      if (this.customAudioBuffer) {
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        
        source.buffer = this.customAudioBuffer;
        source.loop = loop;
        gain.gain.value = volume;
        
        source.connect(gain);
        gain.connect(ctx.destination);
        source.start();
        
        this.currentSource = source;
      }
    } catch (e) {
      console.error("Failed to play custom audio", e);
      // Fallback
      this.playBellSound(volume);
    }
  }

  public clearCustomCache() {
    this.customAudioBuffer = null;
  }

  public stop() {
    // 1. Stop Web Audio API sources
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // Ignore error if already stopped
      }
      this.currentSource = null;
    }

    // 2. Stop TTS
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // 3. Clear timers
    if (this.stopTimeout) {
      window.clearTimeout(this.stopTimeout);
      this.stopTimeout = null;
    }
    if (this.loopInterval) {
      window.clearInterval(this.loopInterval);
      this.loopInterval = null;
    }

    // 4. Trigger callback
    if (this.onPlaybackEnd) {
      this.onPlaybackEnd();
      this.onPlaybackEnd = null;
    }
  }

  public async playNotification(settings: AppSettings, taskTitle: string, onEnd?: () => void) {
    // Stop any existing sound first
    this.stop();
    this.onPlaybackEnd = onEnd || null;

    // Resume context
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }

    const { soundMode, volume, audioDuration, audioLoop, customSoundData, voiceURI } = settings;

    // Set Max Duration Timeout
    if (audioDuration > 0) {
      this.stopTimeout = window.setTimeout(() => {
        this.stop();
      }, audioDuration * 1000);
    }

    if (soundMode === 'tts') {
      const text = `Task due: ${taskTitle}`;
      
      if (audioLoop) {
        const speakLoop = () => {
          this.speakText(text, volume, voiceURI, () => {
             // Calculate a small pause or just run again immediately
             this.loopInterval = window.setTimeout(speakLoop, 1000);
          });
        };
        speakLoop();
      } else {
        this.speakText(text, volume, voiceURI, () => {
           // Natural end
           if (this.onPlaybackEnd) this.onPlaybackEnd();
        });
      }

    } else if (soundMode === 'custom' && customSoundData) {
      await this.playCustom(customSoundData, volume, audioLoop);
      // Custom audio source handles its own looping via bufferSource.loop = true
      // It will be stopped by the stopTimeout

    } else {
      // Bell
      if (audioLoop) {
        // Repeat bell every 1 second
        this.playBellSound(volume);
        this.loopInterval = window.setInterval(() => {
          this.playBellSound(volume);
        }, 1000);
      } else {
        this.playBellSound(volume);
      }
    }
  }
}

export const audioService = new AudioService();