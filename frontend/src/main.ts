import { bootstrapApplication } from '@angular/platform-browser';
import { Component, inject } from '@angular/core';
import { provideRouter, Routes, RouterOutlet } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
import { errorInterceptor } from './app/core/interceptors/error.interceptor';
import { authGuard } from './app/core/guards/auth.guard';
import { ToastComponent } from './app/shared/components/toast/toast.component';

// Define Standalone AppComponent inside main.ts to keep it simple and clean
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent],
  template: `
    <router-outlet></router-outlet>
    <app-toast></app-toast>
  `
})
export class AppComponent {}

// Routes definition
const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: '',
    loadComponent: () => import('./app/layouts/auth-layout/auth-layout.component').then(m => m.AuthLayoutComponent),
    children: [
      {
        path: 'login',
        loadComponent: () => import('./app/features/login/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'signup',
        loadComponent: () => import('./app/features/signup/signup.component').then(m => m.SignupComponent)
      }
    ]
  },
  {
    path: '',
    loadComponent: () => import('./app/layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./app/features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'projects',
        loadComponent: () => import('./app/features/projects/projects.component').then(m => m.ProjectsComponent)
      },
      {
        path: 'projects/:id',
        loadComponent: () => import('./app/features/project-details/project-details.component').then(m => m.ProjectDetailsComponent)
      },
      {
        path: 'projects/:id/kanban',
        loadComponent: () => import('./app/features/kanban-board/kanban-board.component').then(m => m.KanbanBoardComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor, errorInterceptor])
    ),
    provideAnimations()
  ]
}).catch(err => console.error(err));
