'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/theme/ui/dialog';
import { Button } from '@/theme/ui/button';
import type { Alert, ConfirmDialog } from './types/alert.types';

interface AlertsContextValue {
  showAlert: (alert: Omit<Alert, 'id'>) => void;
  showConfirm: (dialog: Omit<ConfirmDialog, 'id'>) => Promise<boolean>;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
}

const AlertsContext = createContext<AlertsContextValue | undefined>(undefined);

export const useAlerts = () => {
  const context = useContext(AlertsContext);
  if (!context) {
    throw new Error('useAlerts must be used within AlertsProvider');
  }
  return context;
};

export function AlertsProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);
  const [confirmResolve, setConfirmResolve] = useState<((value: boolean) => void) | null>(null);

  const showAlert = useCallback((alert: Omit<Alert, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newAlert: Alert = {
      ...alert,
      id,
      duration: alert.duration ?? 5000, // Default 5 seconds
    };

    setAlerts((prev) => [...prev, newAlert]);

    // Auto-dismiss if duration is set
    if (newAlert.duration && newAlert.duration > 0) {
      setTimeout(() => {
        dismissAlert(id);
      }, newAlert.duration);
    }
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  }, []);

  const showConfirm = useCallback((dialog: Omit<ConfirmDialog, 'id'>): Promise<boolean> => {
    return new Promise((resolve) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newDialog: ConfirmDialog = {
        ...dialog,
        id,
        confirmLabel: dialog.confirmLabel ?? 'Confirm',
        cancelLabel: dialog.cancelLabel ?? 'Cancel',
      };

      setConfirmDialog(newDialog);
      setConfirmResolve(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirmDialog?.onConfirm) {
      confirmDialog.onConfirm();
    }
    if (confirmResolve) {
      confirmResolve(true);
    }
    setConfirmDialog(null);
    setConfirmResolve(null);
  }, [confirmDialog, confirmResolve]);

  const handleCancel = useCallback(() => {
    if (confirmDialog?.onCancel) {
      confirmDialog.onCancel();
    }
    if (confirmResolve) {
      confirmResolve(false);
    }
    setConfirmDialog(null);
    setConfirmResolve(null);
  }, [confirmDialog, confirmResolve]);

  const showSuccess = useCallback((title: string, message?: string) => {
    showAlert({ type: 'success', title, message });
  }, [showAlert]);

  const showError = useCallback((title: string, message?: string) => {
    showAlert({ type: 'error', title, message, duration: 7000 }); // Errors show longer
  }, [showAlert]);

  const showWarning = useCallback((title: string, message?: string) => {
    showAlert({ type: 'warning', title, message });
  }, [showAlert]);

  const showInfo = useCallback((title: string, message?: string) => {
    showAlert({ type: 'info', title, message });
  }, [showAlert]);

  const value: AlertsContextValue = {
    showAlert,
    showConfirm,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <AlertsContext.Provider value={value}>
      {children}
      
      {/* Confirm Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog?.title}</DialogTitle>
            {confirmDialog?.message && (
              <DialogDescription>{confirmDialog.message}</DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              {confirmDialog?.cancelLabel ?? 'Cancel'}
            </Button>
            <Button
              onClick={handleConfirm}
              variant={confirmDialog?.variant === 'destructive' ? 'destructive' : 'default'}
            >
              {confirmDialog?.confirmLabel ?? 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast Alerts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
        {alerts.map((alert) => {
          const bgColor = {
            success: 'bg-green-600',
            error: 'bg-red-600',
            warning: 'bg-yellow-600',
            info: 'bg-blue-600',
          }[alert.type];

          const textColor = 'text-white';

          return (
            <div
              key={alert.id}
              className={`${bgColor} ${textColor} px-4 py-3 rounded-lg shadow-lg flex items-start justify-between gap-4 min-w-[300px] animate-in slide-in-from-top-5 fade-in-0`}
            >
              <div className="flex-1">
                <p className="font-semibold">{alert.title}</p>
                {alert.message && (
                  <p className="text-sm opacity-90 mt-1">{alert.message}</p>
                )}
              </div>
              <button
                onClick={() => dismissAlert(alert.id)}
                className="text-white/80 hover:text-white transition-colors"
                aria-label={`Dismiss ${alert.title} notification`}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          );
        })}
      </div>
    </AlertsContext.Provider>
  );
}

