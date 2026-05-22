import { Injectable, signal } from '@angular/core';

export interface ToastData {
  message: string;
  type: 'success' | 'error' | 'info';
  visible: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  // Driven by Angular Signals
  readonly toastState = signal<ToastData>({
    message: '',
    type: 'success',
    visible: false
  });

  showSuccess(message: string): void {
    this.show(message, 'success');
  }

  showError(message: string): void {
    this.show(message, 'error');
  }

  showInfo(message: string): void {
    this.show(message, 'info');
  }

  private show(message: string, type: 'success' | 'error' | 'info'): void {
    this.toastState.set({
      message,
      type,
      visible: true
    });

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      this.toastState.update(state => ({ ...state, visible: false }));
    }, 4000);
  }

  dismiss(): void {
    this.toastState.update(state => ({ ...state, visible: false }));
  }
}
