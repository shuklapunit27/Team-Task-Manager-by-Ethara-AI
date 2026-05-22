import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="show" class="modal-overlay">
      <div class="modal-content glass-card">
        <div class="modal-header">
          <h3>{{ title }}</h3>
          <button class="close-x" (click)="onCancel()">&times;</button>
        </div>
        <div class="modal-body">
          <p>{{ message }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="onCancel()">{{ cancelText }}</button>
          <button class="btn btn-primary btn-danger-action" (click)="onConfirm()">{{ confirmText }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease-out;
    }

    .modal-content {
      width: 100%;
      max-width: 480px;
      animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      border: 1px solid rgba(255, 51, 51, 0.2);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;

      h3 {
        font-size: 1.25rem;
        color: #FFFFFF;
      }
    }

    .close-x {
      background: none;
      border: none;
      color: #B3B3B3;
      font-size: 24px;
      cursor: pointer;
      line-height: 1;

      &:hover {
        color: var(--color-primary);
      }
    }

    .modal-body {
      margin-bottom: 24px;
      p {
        font-size: 0.95rem;
        color: #B3B3B3;
        line-height: 1.5;
      }
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .btn-danger-action {
      background: linear-gradient(135deg, #EF4444 0%, #B91C1C 100%) !important;
      box-shadow: 0 0 15px rgba(239, 68, 68, 0.25) !important;

      &:hover {
        box-shadow: 0 0 25px rgba(239, 68, 68, 0.45) !important;
        background: linear-gradient(135deg, #F87171 0%, #EF4444 100%) !important;
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes scaleUp {
      from {
        transform: scale(0.95);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }
  `]
})
export class ConfirmDialogComponent {
  @Input() show = false;
  @Input() title = 'Confirm Action';
  @Input() message = 'Are you sure you want to proceed?';
  @Input() confirmText = 'Confirm';
  @Input() cancelText = 'Cancel';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm(): void {
    this.confirm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
