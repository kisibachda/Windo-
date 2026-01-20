import React, { useRef, useState, useEffect } from 'react';
import { AppSettings, SoundMode, FirebaseConfig } from '../types';
import { Modal } from './ui/Modal';
import { Volume2, Music, Mic, FileAudio, Upload, Clock, Repeat, AlertCircle, VolumeX, Play, Sun, Moon, Palette, CheckCircle2, Cloud, LogIn, LogOut, Save } from 'lucide-react';
import { audioService } from '../services/audioService';
import { syncService } from '../services/syncService';
import { User } from 'firebase/auth';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

type Tab = 'general' | 'cloud';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  // Cloud State
  const [jsonConfig, setJsonConfig] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
    };
    
    loadVoices();
    
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
        // Pre-fill JSON config if exists
        if (settings.firebaseConfig) {
            setJsonConfig(JSON.stringify(settings.firebaseConfig, null, 2));
        }
        
        // Listen to Auth State if initialized
        if (syncService.isInitialized()) {
             const unsub = syncService.onAuthChange((user) => {
                 setCurrentUser(user);
             });
             return () => unsub && unsub();
        }
    }
  }, [isOpen, settings.firebaseConfig]);

  // Stop preview if modal is closed
  useEffect(() => {
    if (!isOpen && isPreviewing) {
        audioService.stop();
        setIsPreviewing(false);
    }
  }, [isOpen, isPreviewing]);

  const handleClose = () => {
    if (isPreviewing) {
        audioService.stop();
        setIsPreviewing(false);
    }
    onClose();
  };

  const togglePreview = () => {
    if (isPreviewing) {
        audioService.stop();
        setIsPreviewing(false);
    } else {
        setIsPreviewing(true);
        audioService.playNotification(settings, "Test Notification", () => {
            setIsPreviewing(false);
        });
    }
  };

  // Setting Handlers
  const handleThemeChange = (theme: 'light' | 'dark') => onSave({ ...settings, theme });
  const handleAutoCompleteChange = (e: React.ChangeEvent<HTMLInputElement>) => onSave({ ...settings, autoComplete: e.target.checked });
  const handleModeChange = (mode: SoundMode) => onSave({ ...settings, soundMode: mode });
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => onSave({ ...settings, volume: parseFloat(e.target.value) });
  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => onSave({ ...settings, audioDuration: parseInt(e.target.value, 10) });
  const handleLoopChange = (e: React.ChangeEvent<HTMLInputElement>) => onSave({ ...settings, audioLoop: e.target.checked });
  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => onSave({ ...settings, voiceURI: e.target.value || null });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (file) {
      if (file.size > 3 * 1024 * 1024) { 
        alert("File is too large. Please select an MP3 under 3MB.");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        audioService.clearCustomCache();
        onSave({ ...settings, customSoundData: base64String, customSoundName: file.name });
      };
      reader.readAsDataURL(file);
    }
  };

  // Cloud Handlers
  const saveCloudConfig = () => {
      try {
          const config: FirebaseConfig = JSON.parse(jsonConfig);
          if (!config.apiKey || !config.projectId) throw new Error("Invalid Config");
          
          onSave({ ...settings, firebaseConfig: config });
          // Re-init logic handled in App effect
          alert("Configuration saved. The app will attempt to connect.");
      } catch (e) {
          alert("Invalid JSON configuration. Please check your format.");
      }
  };

  const handleLogin = async () => {
      try {
          await syncService.login();
      } catch (e) {
          alert("Login failed: " + e);
      }
  };

  const handleLogout = async () => {
      await syncService.logout();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Settings">
        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
            <button
                onClick={() => setActiveTab('general')}
                className={`flex-1 pb-3 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === 'general' 
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
            >
                General
            </button>
            <button
                onClick={() => setActiveTab('cloud')}
                className={`flex-1 pb-3 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === 'cloud' 
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
            >
                Cloud Sync
            </button>
        </div>

      <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        
        {activeTab === 'general' ? (
        <>
            {/* Appearance */}
            <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Palette size={16} /> Appearance
            </label>
            <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-lg">
                <button
                onClick={() => handleThemeChange('light')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                    settings.theme === 'light'
                    ? 'bg-white shadow-sm text-blue-600'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                >
                <Sun size={16} /> Light
                </button>
                <button
                onClick={() => handleThemeChange('dark')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                    settings.theme === 'dark'
                    ? 'bg-slate-600 shadow-sm text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                >
                <Moon size={16} /> Dark
                </button>
            </div>
            </div>
            
            <div className="border-t border-slate-100 dark:border-slate-700" />

            {/* Behavior */}
            <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <CheckCircle2 size={16} /> Behavior
                </label>
                <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                    <input 
                        type="checkbox"
                        checked={settings.autoComplete}
                        onChange={handleAutoCompleteChange}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Auto-complete Tasks</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Mark tasks as completed when notification triggers</span>
                    </div>
                </label>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-700" />

            {/* Sound Mode Selection */}
            <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Notification Sound</label>
            <div className="grid grid-cols-3 gap-3">
                <button
                onClick={() => handleModeChange('bell')}
                className={`flex flex-col items-center p-3 rounded-lg border transition-all ${
                    settings.soundMode === 'bell' 
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300' 
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
                >
                <Music size={24} className="mb-2" />
                <span className="text-xs font-medium">Bell</span>
                </button>
                <button
                onClick={() => handleModeChange('tts')}
                className={`flex flex-col items-center p-3 rounded-lg border transition-all ${
                    settings.soundMode === 'tts' 
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300' 
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
                >
                <Mic size={24} className="mb-2" />
                <span className="text-xs font-medium">Speak</span>
                </button>
                <button
                onClick={() => handleModeChange('custom')}
                className={`flex flex-col items-center p-3 rounded-lg border transition-all ${
                    settings.soundMode === 'custom' 
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300' 
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
                >
                <FileAudio size={24} className="mb-2" />
                <span className="text-xs font-medium">Custom</span>
                </button>
            </div>
            </div>

            {/* Voice Selector for TTS */}
            {settings.soundMode === 'tts' && voices.length > 0 && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Voice</label>
                    <select
                        value={settings.voiceURI || ''}
                        onChange={handleVoiceChange}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                        <option value="">Default Voice</option>
                        {voices.map(voice => (
                            <option key={voice.voiceURI} value={voice.voiceURI}>
                                {voice.name} ({voice.lang})
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Custom File Upload */}
            {settings.soundMode === 'custom' && (
            <div className="animate-in slide-in-from-top-2 duration-300">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Custom Audio File (MP3)</label>
                <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className={`flex-1 truncate text-sm ${settings.customSoundName ? 'text-slate-700 dark:text-slate-200 font-medium' : 'text-slate-400 italic'}`}>
                    {settings.customSoundName || "No file selected"}
                    </div>
                    <input 
                    type="file" 
                    accept=".mp3,audio/mpeg,audio/mp3" 
                    ref={fileInputRef} 
                    onChange={handleFileChange}
                    className="hidden" 
                    />
                    <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                    >
                    <Upload size={14} /> Browse...
                    </button>
                </div>
                <div className="flex items-start gap-1.5 mt-2">
                    <AlertCircle size={12} className="text-slate-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-slate-400">Max 3MB. MP3 format recommended. File is saved to your browser.</p>
                </div>
            </div>
            )}

            {/* Volume Control */}
            <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Volume2 size={16} /> Volume
            </label>
            <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05"
                value={settings.volume} 
                onChange={handleVolumeChange}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Duration Control */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Clock size={16} /> Max Duration
                    </label>
                    <div className="flex items-center gap-2">
                        <input 
                            type="range" 
                            min="5" 
                            max="300" 
                            step="5"
                            value={settings.audioDuration} 
                            onChange={handleDurationChange}
                            className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <span className="text-xs text-slate-500 dark:text-slate-400 w-12 text-right">{settings.audioDuration}s</span>
                    </div>
                </div>
                
                {/* Loop Control */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Repeat size={16} /> Loop Sound
                    </label>
                    <label className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                        <input 
                            type="checkbox"
                            checked={settings.audioLoop}
                            onChange={handleLoopChange}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-600 dark:text-slate-300">Play Continuously</span>
                    </label>
                </div>
            </div>
        </>
        ) : (
        /* Cloud Tab */
        <div className="space-y-6 animate-in slide-in-from-right-2 duration-300">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800/50">
                <div className="flex gap-3">
                    <Cloud className="text-blue-600 dark:text-blue-400 shrink-0" size={24} />
                    <div>
                        <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">Firebase Synchronization</h3>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            Connect to your own Firebase project to sync tasks across devices.
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Firebase Config JSON
                </label>
                <textarea 
                    value={jsonConfig}
                    onChange={(e) => setJsonConfig(e.target.value)}
                    placeholder='{ "apiKey": "...", "authDomain": "...", "projectId": "..." }'
                    className="w-full h-32 p-3 text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex justify-end">
                    <button 
                        onClick={saveCloudConfig}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md transition-colors text-slate-700 dark:text-slate-200"
                    >
                        <Save size={14} /> Update Config
                    </button>
                </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-700" />

            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Account Status</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {currentUser ? `Signed in as ${currentUser.email}` : 'Not signed in'}
                    </p>
                </div>
                
                {syncService.isInitialized() ? (
                    currentUser ? (
                        <button 
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-sm font-medium transition-colors"
                        >
                            <LogOut size={16} /> Sign Out
                        </button>
                    ) : (
                        <button 
                            onClick={handleLogin}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <LogIn size={16} /> Sign In with Google
                        </button>
                    )
                ) : (
                    <span className="text-xs text-amber-500 font-medium">Config Required</span>
                )}
            </div>
        </div>
        )}

      </div>

      {activeTab === 'general' && (
        <div className="pt-4 mt-6 border-t border-slate-100 dark:border-slate-700 flex justify-end">
            <button 
                onClick={togglePreview}
                className={`text-sm font-medium px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
                isPreviewing 
                    ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50' 
                    : 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                }`}
            >
                {isPreviewing ? (
                <>
                    <VolumeX size={16} /> Stop Preview
                </>
                ) : (
                <>
                    <Play size={16} /> Preview Sound
                </>
                )}
            </button>
        </div>
      )}
    </Modal>
  );
};