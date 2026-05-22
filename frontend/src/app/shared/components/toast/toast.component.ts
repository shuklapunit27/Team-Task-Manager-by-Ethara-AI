import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="state().visible" 
         [class]="'toast-container glass-card ' + state().type"
         (click)="dismiss()">
      <div class="toast-content">
        <span class="material-icons-round icon">
          {{ state().type === 'success' ? 'check_circle' : state().type === 'error' ? 'error' : 'info' }}
        </span>
        <p class="message">{{ state().message }}</p>
      </div>
      <button class="close-btn">&times;</button>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-width: 320px;
      max-width: 450px;
      padding: 16px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      cursor: pointer;
      animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      gap: 16px;

      &.success {
        border-left: 4px solid #22C55E;
        .icon { color: #22C55E; }
      }

      &.error {
        border-left: 4px solid #EF4444;
        .icon { color: #EF4444; }
      }

      &.info {
        border-left: 4px solid #3B82F6;
        .icon { color: #3B82F6; }
      }
    }

    .toast-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .icon {
      font-size: 24px;
    }

    .message {
      font-size: 0.9rem;
      font-weight: 500;
      color: #FFFFFF;
      white-space: pre-line;
      line-height: 1.4;
    }

    .close-btn {
      background: none;
      border: none;
      color: #B3B3B3;
      font-size: 20px;
      cursor: pointer;
      line-height: 1;
      padding: 0;
      
      &:hover {
        color: #FFFFFF;
      }
    }

    @keyframes slideIn {
      from {
        transform: translateY(100px) scale(0.9);
        opacity: 0;
      }
      to {
        transform: translateY(0) scale(1);
        opacity: 1;
      }
    }
  `]
})
export class ToastComponent {
  private readonly notification = inject(NotificationService);
  
  // Reacts automatically to Signal state shifts
  readonly state = this.notification.toastState;

  dismiss(): void {
    this.notification.dismiss();
  }
}
