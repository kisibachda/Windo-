import React, { useState, useEffect } from 'react';
import { Task, Priority } from '../types';
import { Modal } from './ui/Modal';
import { Flag } from 'lucide-react';
import { DatePicker } from './ui/DatePicker';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSave: (updatedTask: Task) => void;
}

export const EditModal: React.FC<EditModalProps> = ({ isOpen, onClose, task, onSave }) => {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setTime(task.time);
      setDate(task.date || new Date().toISOString().split('T')[0]);
      setPriority(task.priority || 'medium');
    }
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (task && title.trim() && time && date) {
      onSave({ ...task, title, time, date, priority });
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Task">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Task Name</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            autoFocus
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
              <DatePicker 
                value={date} 
                onChange={setDate} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all color-scheme-dark"
              />
            </div>
        </div>

        <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Priority</label>
            <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <Flag size={16} className={`${
                         priority === 'high' ? 'text-red-500' : 
                         priority === 'medium' ? 'text-amber-500' : 'text-blue-500'
                     }`} />
                 </div>
                 <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="w-full pl-9 pr-3 py-2 appearance-none bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                 >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                 </select>
            </div>
        </div>

        <div className="flex justify-end pt-2 gap-2">
            <button 
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
            >
                Cancel
            </button>
            <button 
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 rounded-md shadow-sm transition-colors"
            >
                Save Changes
            </button>
        </div>
      </form>
    </Modal>
  );
};