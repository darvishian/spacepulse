/**
 * Toast notification component
 * TODO: Implement toast notifications with automatic dismiss and action handlers
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  id: string;
  message: string;
  type?: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: (id: string) => void;
}

const typeStyles: Record<ToastType, string> = {
  success: 'bg-space-success/20 border-space-success text-space-success',
  error: 'bg-space-warning/20 border-space-warning text-space-warning',
  info: 'bg-space-accent/20 border-space-accent text-space-accent',
  warning: 'bg-space-warning/20 border-space-warning text-space-warning',
};

/**
 * TODO: Implement individual toast component
 */
export function Toast({
  id,
  message,
  type = 'info',
  duration = 5000,
  action,
  onDismiss,
}: ToastProps) {
  React.useEffect(() => {
    if (duration && duration > 0) {
      const timer = setTimeout(() => {
        onDismiss?.(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`glass ${typeStyles[type]} border rounded-lg p-4 flex items-center justify-between gap-4`}
    >
      <p className="text-sm font-medium">{message}</p>
      <div className="flex items-center gap-2">
        {action && (
          <button
            onClick={action.onClick}
            className="text-xs font-semibold hover:opacity-80 transition-opacity"
          >
            {action.label}
          </button>
        )}
        <button
          onClick={() => onDismiss?.(id)}
          className="hover:opacity-80 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

/**
 * TODO: Implement toast container for displaying multiple toasts
 */
export function ToastContainer({
  toasts = [],
  onDismiss,
}: {
  toasts: ToastProps[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}
