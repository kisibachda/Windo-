import React, { useState, useEffect, useRef } from 'react';
import { Task, AppSettings, DEFAULT_SETTINGS, Priority, SortOption } from './types';
import { Settings, Plus, FileInput, Bell, BellOff, VolumeX, Flag, Download, MonitorDown, Cloud, ArrowUpDown } from 'lucide-react';
import { Reorder } from 'framer-motion';
import { TaskItem } from './components/TaskItem';
import { SettingsModal } from './components/SettingsModal';
import { EditModal } from './components/EditModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { DatePicker } from './components/ui/DatePicker';
import { audioService } from './services/audioService';
import { syncService } from './services/syncService';
import { User } from 'firebase/auth';

const App: React.FC = () => {
  // Helpers
  const getTodayDate = () => {
    const now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  };

  // State
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('windo-tasks');
    const parsed = saved ? JSON.parse(saved) : [];
    // Migration: ensure new fields exist for old tasks
    return parsed.map((t: any) => ({
        ...t,
        date: t.date || getTodayDate(),
        priority: t.priority || 'medium',
        createdAt: t.createdAt || Date.now()
    }));
  });
  
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
        const saved = localStorage.getItem('windo-settings');
        return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch (e) {
        console.error("Failed to load settings:", e);
        return DEFAULT_SETTINGS;
    }
  });

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [newTaskDate, setNewTaskDate] = useState(getTodayDate());
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('medium');
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ongoing' | 'completed'>('ongoing');
  const [isAlarmRinging, setIsAlarmRinging] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [sortBy, setSortBy] = useState<SortOption>('manual');
  
  // Cloud State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Initialize Sync Service
  useEffect(() => {
    if (settings.firebaseConfig && !syncService.isInitialized()) {
        syncService.initialize(settings.firebaseConfig);
    }
    
    // Listen to Auth
    const unsub = syncService.onAuthChange((user) => {
        setCurrentUser(user);
    });

    return () => unsub && unsub();
  }, [settings.firebaseConfig]);

  // Sync Logic: Subscribe to Cloud Tasks
  useEffect(() => {
    if (currentUser) {
        syncService.subscribeToTasks(currentUser, (cloudTasks) => {
            // Simple conflict strategy: Cloud wins. 
            // In a real app we might merge by ID or timestamp.
            setTasks(cloudTasks);
        });
    }
  }, [currentUser]);

  // Sync Logic: Save Local Changes to Cloud
  // Debounce saving to avoid too many writes
  useEffect(() => {
    const timeout = setTimeout(() => {
        if (currentUser && syncService.isInitialized()) {
            syncService.saveTasks(currentUser, tasks);
        }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [tasks, currentUser]);

  // Apply Theme
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Persistence (Local)
  useEffect(() => {
    localStorage.setItem('windo-tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    try {
        localStorage.setItem('windo-settings', JSON.stringify(settings));
    } catch (e) {
        console.error("Failed to save settings:", e);
    }
  }, [settings]);

  // PWA Install Prompt Listener
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Timer Logic
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      // Format: YYYY-MM-DD
      const currentDate = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
      // Format: HH:mm
      const currentTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

      setTasks(currentTasks => {
        let hasChanges = false;
        const updatedTasks = currentTasks.map(task => {
          // Check Date AND Time
          if (!task.completed && !task.notified && task.date === currentDate && task.time === currentTime) {
            // Trigger Notification
            setIsAlarmRinging(true);
            audioService.playNotification(settings, task.title, () => {
                setIsAlarmRinging(false);
            });
            
            if (Notification.permission === 'granted') {
              new Notification(`Task Due: ${task.title}`);
            }
            hasChanges = true;
            return { 
                ...task, 
                notified: true,
                completed: settings.autoComplete ? true : task.completed
            };
          }
          return task;
        });
        
        return hasChanges ? updatedTasks : currentTasks;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [settings]);

  // Request Notification Permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Handlers
  const submitNewTask = () => {
    if (!newTaskTitle.trim() || !newTaskTime || !newTaskDate) return;

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: newTaskTitle,
      time: newTaskTime,
      date: newTaskDate,
      priority: newTaskPriority,
      completed: false,
      createdAt: Date.now(),
    };

    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
    setNewTaskTime('');
    setNewTaskDate(getTodayDate());
    setNewTaskPriority('medium');
    
    // If user adds a task while sorting is active, it might jump. 
    // We keep the sort active.
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    submitNewTask();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      submitNewTask();
    }
  };

  const stopAlarm = () => {
    audioService.stop();
    setIsAlarmRinging(false);
  };

  const toggleTask = (id: string) => {
    if (isAlarmRinging) {
        stopAlarm();
    }
    setTasks(tasks.map(t => {
        if (t.id === id) {
            const newCompleted = !t.completed;
            if (newCompleted) {
                audioService.playSuccessSound(settings.volume);
            }
            return { ...t, completed: newCompleted };
        }
        return t;
    }));
  };

  const initiateDeleteTask = (id: string) => {
    if (isAlarmRinging) {
        stopAlarm();
    }
    setTaskToDelete(id);
  };

  const confirmDeleteTask = () => {
    if (taskToDelete) {
        setTasks(tasks.filter(t => t.id !== taskToDelete));
        setTaskToDelete(null);
    }
  };

  const handleReorder = (newOrder: Task[]) => {
    // Only works in manual mode for ongoing tasks
    const completedTasks = tasks.filter(t => t.completed);
    setTasks([...newOrder, ...completedTasks]);
  };

  const handleInstallClick = () => {
    if (installPrompt) {
        installPrompt.prompt();
        installPrompt.userChoice.then((choiceResult: any) => {
            if (choiceResult.outcome === 'accepted') {
                setInstallPrompt(null);
            }
        });
    }
  };

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Title,Time,Date,Priority\n"
      + "Buy Groceries,14:00,2023-12-25,medium\n"
      + "Team Meeting,09:30,2023-12-26,high\n"
      + "Walk Dog,18:00,,low"; // Example with missing date (defaults to today)
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "windo_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        const newTasks: Task[] = [];
        const today = getTodayDate();
        
        // Skip header if it exists
        const startIndex = lines[0]?.toLowerCase().includes('title') ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
           const line = lines[i].trim();
           if (!line) continue;

           // Parse line: Title, Time, Date (opt), Priority (opt)
           const parts = line.split(',').map(s => s.trim());
           const title = parts[0];
           const time = parts[1];
           const dateInput = parts[2];
           const priorityInput = parts[3]?.toLowerCase();

           // Basic Validation
           if (title && time && /^\d{1,2}:\d{2}$/.test(time)) {
             // Normalize time to HH:mm
             const [h, m] = time.split(':');
             const formattedTime = `${h.padStart(2, '0')}:${m}`;

             // Validate Date
             let formattedDate = today;
             if (dateInput && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
                formattedDate = dateInput;
             }

             // Validate Priority
             let validPriority: Priority = 'medium';
             if (priorityInput === 'high' || priorityInput === 'low') {
                validPriority = priorityInput as Priority;
             }

             newTasks.push({
               id: crypto.randomUUID(),
               title,
               time: formattedTime,
               date: formattedDate,
               priority: validPriority,
               completed: false,
               createdAt: Date.now() + i // Slight offset to preserve import order in creation sort
             });
           }
        }

        if (newTasks.length > 0) {
          setTasks(prev => [...prev, ...newTasks]);
          alert(`Imported ${newTasks.length} tasks successfully.`);
        } else {
          alert('No valid tasks found. Format: Title, Time (HH:mm), [Date (YYYY-MM-DD)], [Priority]');
        }
      };
      reader.readAsText(file);
    }
    if (csvInputRef.current) csvInputRef.current.value = '';
  };

  // Sort Logic
  const getSortedTasks = (taskList: Task[]) => {
    switch (sortBy) {
        case 'priority':
             // High(3) > Medium(2) > Low(1)
             const pWeight = { high: 3, medium: 2, low: 1 };
             return [...taskList].sort((a, b) => {
                 const diff = pWeight[b.priority] - pWeight[a.priority];
                 if (diff !== 0) return diff;
                 // Secondary: Date
                 return new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime();
             });
        case 'date':
             // Earliest first
             return [...taskList].sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
        case 'creation':
             // Newest first
             return [...taskList].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        case 'manual':
        default:
             return taskList;
    }
  };

  const filteredTasks = tasks.filter(t => activeTab === 'ongoing' ? !t.completed : t.completed);
  const visibleTasks = getSortedTasks(filteredTasks);

  return (
    <div className="min-h-screen p-4 sm:p-8 flex justify-center transition-colors duration-300">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        
        {/* Header */}
        <header className="flex items-center justify-between bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg transition-colors ${isAlarmRinging ? 'bg-red-500 animate-pulse shadow-red-200 dark:shadow-red-900/50' : 'bg-blue-600 shadow-blue-200 dark:shadow-blue-900/50'}`}>
                {isAlarmRinging ? <BellOff size={20} /> : <Bell size={20} />}
            </div>
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight transition-colors">WinDo</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium transition-colors">
                    {currentUser ? `Synced: ${currentUser.email}` : 'Task Notification Manager'}
                </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAlarmRinging && (
                <button
                    onClick={stopAlarm}
                    className="flex items-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-lg font-medium mr-2 animate-bounce transition-colors"
                >
                    <VolumeX size={18} /> Stop Alarm
                </button>
            )}

            {installPrompt && (
                <button 
                  onClick={handleInstallClick}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-all"
                  title="Install App"
                >
                  <MonitorDown size={20} />
                </button>
            )}

            {currentUser && (
               <div className="text-blue-500 dark:text-blue-400 p-2" title="Cloud Sync Active">
                  <Cloud size={20} />
               </div>
            )}
            
            <button 
              onClick={downloadTemplate}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
              title="Download CSV Template"
            >
              <Download size={20} />
            </button>

            <input 
              type="file" 
              accept=".csv" 
              ref={csvInputRef} 
              className="hidden" 
              onChange={handleImportCSV} 
            />
            <button 
              onClick={() => csvInputRef.current?.click()}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
              title="Import CSV"
            >
              <FileInput size={20} />
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
              title="Settings"
            >
              <Settings size={20} />
            </button>
          </div>
        </header>

        {/* Input Area */}
        <form onSubmit={addTask} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-3 transition-colors">
          <input
            type="text"
            placeholder="What needs to be done?"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={handleInputKeyDown}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-500/30 transition-all placeholder:text-slate-400 text-slate-800 dark:text-slate-100"
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex gap-2">
                 <DatePicker 
                    value={newTaskDate} 
                    onChange={setNewTaskDate} 
                    onKeyDown={handleInputKeyDown}
                    className="flex-1"
                 />
                 <div className="relative w-32">
                    <input
                        type="time"
                        value={newTaskTime}
                        onChange={(e) => setNewTaskTime(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-500/30 transition-all text-slate-600 dark:text-slate-300 font-mono color-scheme-dark"
                    />
                 </div>
            </div>
            
            <div className="flex gap-2">
                <div className="relative w-36 sm:w-32">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Flag size={16} className={`${
                            newTaskPriority === 'high' ? 'text-red-500' : 
                            newTaskPriority === 'medium' ? 'text-amber-500' : 'text-blue-500'
                        }`} />
                    </div>
                    <select
                        value={newTaskPriority}
                        onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                        className="w-full pl-9 pr-8 py-2.5 appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-500/30 transition-all text-slate-600 dark:text-slate-300 font-medium cursor-pointer"
                    >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                </div>
                
                <button 
                    type="submit"
                    disabled={!newTaskTitle || !newTaskTime || !newTaskDate}
                    title="Add Task (Ctrl+Enter)"
                    className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-md shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2"
                >
                    <Plus size={18} /> <span className="sm:hidden">Add</span>
                </button>
            </div>
          </div>
        </form>

        {/* Tabs & List */}
        <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-700 px-2 transition-colors">
                <div className="flex gap-1">
                    <button 
                        onClick={() => setActiveTab('ongoing')}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all border-b-2 ${
                            activeTab === 'ongoing' 
                            ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-800' 
                            : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                    >
                        Ongoing ({tasks.filter(t => !t.completed).length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('completed')}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all border-b-2 ${
                            activeTab === 'completed' 
                            ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-800' 
                            : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                    >
                        Completed ({tasks.filter(t => t.completed).length})
                    </button>
                </div>

                {/* Sort Control */}
                <div className="flex items-center gap-2 pb-1.5">
                     <ArrowUpDown size={14} className="text-slate-400" />
                     <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="text-sm bg-transparent border-none text-slate-600 dark:text-slate-400 focus:ring-0 cursor-pointer font-medium"
                     >
                        <option value="manual">Manual</option>
                        <option value="priority">Priority</option>
                        <option value="date">Due Date</option>
                        <option value="creation">Created</option>
                     </select>
                </div>
            </div>
            
            {visibleTasks.length === 0 ? (
                <div className="text-center py-12 opacity-50 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 transition-colors">
                    <p className="text-slate-500 dark:text-slate-400">
                        {activeTab === 'ongoing' ? "No tasks scheduled." : "No completed tasks yet."}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Updated to use gap logic for smoother reorder */}
                    {activeTab === 'ongoing' && sortBy === 'manual' ? (
                        <Reorder.Group axis="y" values={visibleTasks} onReorder={handleReorder} className="flex flex-col gap-3">
                            {visibleTasks.map(task => (
                                <TaskItem 
                                    key={task.id} 
                                    task={task} 
                                    onToggle={toggleTask} 
                                    onDelete={initiateDeleteTask}
                                    onEdit={setEditingTask}
                                    isReorderable={true}
                                />
                            ))}
                        </Reorder.Group>
                    ) : (
                         <div className="flex flex-col gap-3">
                            {visibleTasks.map(task => (
                                <TaskItem 
                                    key={task.id} 
                                    task={task} 
                                    onToggle={toggleTask} 
                                    onDelete={initiateDeleteTask}
                                    onEdit={setEditingTask}
                                    isReorderable={false}
                                />
                            ))}
                         </div>
                    )}
                </div>
            )}
        </div>

      </div>

      {/* Modals */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings}
        onSave={setSettings}
      />

      <EditModal 
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        task={editingTask}
        onSave={(updatedTask) => {
            setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
            setEditingTask(null);
        }}
      />

      <ConfirmationModal 
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={confirmDeleteTask}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
      />
    </div>
  );
};

export default App;