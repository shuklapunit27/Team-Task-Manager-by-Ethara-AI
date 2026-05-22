import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of } from 'rxjs';
import { ApiResponse, AuthResponse, User, UserResponse } from '../models';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);
  
  private readonly apiUrl = 'http://localhost:5000/api/auth';
  private readonly tokenKey = 'ttm_auth_token';

  // Signals for robust state management
  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly isHydrating = signal<boolean>(true);

  constructor() {
    this.hydrateSession();
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  register(name: string, email: string, password: string): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/register`, { name, email, password }).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.setSession(res.data.token, res.data.user);
          this.notification.showSuccess('Account registered successfully!');
        }
      })
    );
  }

  login(email: string, password: string): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.setSession(res.data.token, res.data.user);
          this.notification.showSuccess(`Welcome back, ${res.data.user.name}!`);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
    this.notification.showInfo('Logged out successfully.');
  }

  private setSession(token: string, user: User): void {
    localStorage.setItem(this.tokenKey, token);
    this.currentUser.set(user);
  }

  // Restores user context from JWT token storage on application restart/refresh
  private hydrateSession(): void {
    const token = this.getToken();
    if (!token) {
      this.isHydrating.set(false);
      return;
    }

    // Call /me endpoint to hydrate user details and verify token integrity
    this.http.get<ApiResponse<User>>(`${this.apiUrl}/me`).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.currentUser.set(res.data);
        } else {
          this.logout();
        }
        this.isHydrating.set(false);
      }),
      catchError(err => {
        this.logout();
        this.isHydrating.set(false);
        return of(null);
      })
    ).subscribe();
  }

  getUsers(): Observable<ApiResponse<UserResponse[]>> {
    return this.http.get<ApiResponse<UserResponse[]>>(`${this.apiUrl}/users`);
  }
}
