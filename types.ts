export type Priority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  time: string; // Format "HH:mm"
  date: string; // Format "YYYY-MM-DD"
  priority: Priority;
  completed: boolean;
  notified?: boolean;
}

export type SoundMode = 'bell' | 'tts' | 'custom';

export interface AppSettings {
  theme: 'light' | 'dark';
  autoComplete: boolean;
  soundMode: SoundMode;
  customSoundData: string | null; // Base64 string of MP3
  customSoundName: string | null;
  volume: number; // 0 to 1
  audioDuration: number; // in seconds, max 300
  audioLoop: boolean; // Play continuously until stopped
  voiceURI: string | null; // Specific voice for TTS
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  autoComplete: false,
  soundMode: 'bell',
  customSoundData: null,
  customSoundName: null,
  volume: 0.8,
  audioDuration: 30,
  audioLoop: true,
  voiceURI: null,
};