import React from 'react';
import { Modal } from './ui/Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message 
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="flex items-start gap-4">
           <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
              <AlertTriangle size={20} />
           </div>
           <div className="mt-1">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>
           </div>
        </div>
        
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-50 dark:border-slate-700/50 mt-2">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={() => {
                    onConfirm();
                    onClose();
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:hover:bg-red-500 rounded-lg shadow-sm transition-colors"
            >
                Delete
            </button>
        </div>
      </div>
    </Modal>
  );
};