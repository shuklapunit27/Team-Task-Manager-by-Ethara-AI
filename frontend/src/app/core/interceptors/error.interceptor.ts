import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

/**
 * Global HTTP Error Interceptor.
 * Intercepts HTTP responses to handle errors globally.
 * Specifically handles 401 Unauthorized status codes to automatically clear session states for regular requests,
 * but allows authentication requests (login/register) to propagate clean 401 responses to the component layer.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const notification = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unexpected error occurred.';

      if (error.error && typeof error.error === 'object') {
        // Handle standardized ApiResponse structure from backend
        errorMessage = error.error.message || errorMessage;
        if (error.error.errors && Array.isArray(error.error.errors)) {
          errorMessage = error.error.errors.join('\n');
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Check if the request is destined for core authentication endpoints using case-insensitive checks
      const url = req.url.toLowerCase();
      const isAuthEndpoint = url.includes('api/auth/login') || url.includes('api/auth/register');

      if (error.status === 401) {
        if (!isAuthEndpoint) {
          // Auto logout on unauthorized response or token expiry for non-auth endpoints
          authService.logout();
          notification.showError('Session expired. Please log in again.');
        }
        // If it is an auth endpoint, we let the error pass through cleanly to the UI layer
      } else {
        // Display custom toast error message for all other non-401 errors
        notification.showError(errorMessage);
      }

      // Propagate the HTTP error response downstream to the component layer
      return throwError(() => error);
    })
  );
};
