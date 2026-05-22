import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  template: `
    <div class="glass-card auth-card">
      <div class="card-header">
        <h3>Sign In</h3>
        <p>Access your collaborative task dashboard</p>
      </div>

      <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
        <div class="form-group">
          <label for="email">Email Address</label>
          <input 
            type="email" 
            id="email" 
            placeholder="name@company.com" 
            formControlName="email"
            [class.invalid]="isFieldInvalid('email')" />
          <div *ngIf="isFieldInvalid('email')" class="error-msg">
            Please enter a valid email address.
          </div>
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input 
            type="password" 
            id="password" 
            placeholder="••••••••" 
            formControlName="password"
            [class.invalid]="isFieldInvalid('password')" />
          <div *ngIf="isFieldInvalid('password')" class="error-msg">
            Password is required.
          </div>
        </div>

        <button type="submit" [disabled]="loginForm.invalid || isLoading()" class="btn btn-primary w-full">
          <span *ngIf="isLoading()" class="material-icons-round spinner">sync</span>
          {{ isLoading() ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <div class="card-footer">
        <p>Don't have an account? <a routerLink="/signup">Create one now</a></p>
      </div>
    </div>
  `,
  styles: [`
    .auth-card {
      border: 1px solid rgba(255, 51, 51, 0.25);
      box-shadow: 0 10px 40px rgba(0,0,0,0.6), var(--shadow-glow);
    }

    .card-header {
      margin-bottom: 24px;
      h3 {
        font-size: 1.5rem;
        font-weight: 700;
        margin-bottom: 4px;
      }
      p {
        font-size: 0.85rem;
        color: var(--color-text-secondary);
      }
    }

    .w-full {
      width: 100%;
      margin-top: 8px;
    }

    .error-msg {
      font-size: 0.75rem;
      color: #EF4444;
      margin-top: 4px;
      font-weight: 500;
    }

    input.invalid {
      border-color: #EF4444 !important;
      box-shadow: 0 0 10px rgba(239, 68, 68, 0.15) !important;
    }

    .card-footer {
      text-align: center;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--glass-border);
      
      p {
        font-size: 0.85rem;
        color: var(--color-text-secondary);
      }
      
      a {
        color: var(--color-primary);
        text-decoration: none;
        font-weight: 600;
        
        &:hover {
          text-decoration: underline;
          color: var(--color-primary-hover);
        }
      }
    }

    .spinner {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `]
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);

  readonly isLoading = signal<boolean>(false);

  readonly loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  isFieldInvalid(field: string): boolean {
    const control = this.loginForm.get(field);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    const { email, password } = this.loginForm.value;

    this.auth.login(email, password).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err?.status === 401) {
          this.notification.showError('Invalid email or password');
        }
      }
    });
  }
}
