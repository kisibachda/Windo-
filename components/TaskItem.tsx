import React from 'react';
import { Task } from '../types';
import { GripVertical, Trash2, CheckCircle2, Circle, Pencil, Calendar, Flag } from 'lucide-react';
import { Reorder, useDragControls, motion } from 'framer-motion';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  isReorderable?: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle, onDelete, onEdit, isReorderable = false }) => {
  const controls = useDragControls();

  const getPriorityColor = (priority: string) => {
      switch (priority) {
          case 'high': return 'bg-red-500';
          case 'medium': return 'bg-amber-500';
          case 'low': return 'bg-blue-400';
          default: return 'bg-slate-400';
      }
  };
  
  const getPriorityBorder = (priority: string) => {
      switch (priority) {
          case 'high': return 'border-l-4 border-l-red-500';
          case 'medium': return 'border-l-4 border-l-amber-500';
          case 'low': return 'border-l-4 border-l-blue-400';
          default: return 'border-l-4 border-l-slate-400';
      }
  };

  const isToday = () => {
      const today = new Date();
      const taskDate = new Date(task.date);
      return today.toDateString() === taskDate.toDateString();
  };

  const content = (
      <div className={`relative flex items-center p-3 gap-3 ${getPriorityBorder(task.priority)}`}>
        {/* Completion Flash Animation */}
        {task.completed && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.15, 0] }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 bg-green-500 pointer-events-none z-0"
            />
        )}

        {/* Drag Handle */}
        <div
          className={`touch-none relative z-10 ${isReorderable ? 'cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400' : 'text-slate-200 dark:text-slate-700 cursor-default'}`}
          onPointerDown={(e) => {
             if (isReorderable) controls.start(e);
          }}
        >
          <GripVertical size={20} />
        </div>

        {/* Checkbox/Status */}
        <button
          onClick={() => onToggle(task.id)}
          className={`relative z-10 flex-shrink-0 transition-colors focus:outline-none rounded-full ${task.completed ? 'text-green-500 dark:text-green-400' : 'text-slate-300 dark:text-slate-600 hover:text-blue-500 dark:hover:text-blue-400'}`}
        >
          {task.completed ? (
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
                <CheckCircle2 size={24} />
            </motion.div>
          ) : (
            <Circle size={24} />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col gap-0.5 relative z-10">
            <div className="flex items-center gap-2">
                <span className={`truncate font-medium transition-colors duration-300 ${task.completed ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                    {task.title}
                </span>
                {task.priority === 'high' && !task.completed && (
                   <span className="text-[10px] uppercase font-bold text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded">High</span>
                )}
            </div>
            
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span className={`flex items-center gap-1 ${task.completed ? 'opacity-70' : ''}`}>
                    <Calendar size={12} />
                    {isToday() ? 'Today' : task.date}
                </span>
                <span className={`flex items-center gap-1 font-mono ${task.completed ? 'opacity-70' : 'text-blue-600 dark:text-blue-400'}`}>
                    {task.time}
                </span>
            </div>
        </div>

        {/* Actions */}
        <div className="relative z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
            <button
                onClick={() => onEdit(task)}
                className="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-all"
                title="Edit Task"
            >
                <Pencil size={16} />
            </button>
            <button
                onClick={() => onDelete(task.id)}
                className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-all"
                title="Delete Task"
            >
                <Trash2 size={16} />
            </button>
        </div>
      </div>
  );

  const className = "group bg-white dark:bg-slate-800 rounded-lg shadow-sm border-r border-y border-slate-200 dark:border-slate-700 overflow-hidden transition-shadow hover:shadow-md dark:hover:shadow-slate-900/50";

  if (isReorderable) {
    return (
      <Reorder.Item
        value={task}
        id={task.id}
        dragListener={false}
        dragControls={controls}
        className={className}
      >
        {content}
      </Reorder.Item>
    );
  }

  return (
    <div className={className}>
      {content}
    </div>
  );
};