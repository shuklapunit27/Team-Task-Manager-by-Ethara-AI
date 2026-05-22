import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  template: `
    <div class="glass-card auth-card">
      <div class="card-header">
        <h3>Create Account</h3>
        <p>Get started with elite collaborative task management</p>
      </div>

      <form [formGroup]="signupForm" (ngSubmit)="onSubmit()">
        <div class="form-group">
          <label for="name">Full Name</label>
          <input 
            type="text" 
            id="name" 
            placeholder="John Doe" 
            formControlName="name"
            [class.invalid]="isFieldInvalid('name')" />
          <div *ngIf="isFieldInvalid('name')" class="error-msg">
            Name is required (max 100 characters).
          </div>
        </div>

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
            Password must be at least 6 characters.
          </div>
        </div>

        <button type="submit" [disabled]="signupForm.invalid || isLoading()" class="btn btn-primary w-full">
          <span *ngIf="isLoading()" class="material-icons-round spinner">sync</span>
          {{ isLoading() ? 'Registering...' : 'Create Account' }}
        </button>
      </form>

      <div class="card-footer">
        <p>Already have an account? <a routerLink="/login">Sign In</a></p>
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
export class SignupComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly isLoading = signal<boolean>(false);

  readonly signupForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  isFieldInvalid(field: string): boolean {
    const control = this.signupForm.get(field);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  onSubmit(): void {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    const { name, email, password } = this.signupForm.value;

    this.auth.register(name, email, password).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }
}
