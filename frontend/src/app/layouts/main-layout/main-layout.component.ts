import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ProjectService } from '../../core/services/project.service';
import { ProjectMember } from '../../core/models';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout-container">
      <!-- 1. Responsive Sidebar Navigation -->
      <aside [class.collapsed]="sidebarCollapsed()" class="sidebar glass-card">
        <div class="sidebar-header">
          <span class="material-icons-round logo-icon">token</span>
          <h2 *ngIf="!sidebarCollapsed()">TTM PRO</h2>
          <button class="toggle-btn" (click)="toggleSidebar()">
            <span class="material-icons-round">
              {{ sidebarCollapsed() ? 'chevron_right' : 'chevron_left' }}
            </span>
          </button>
        </div>

        <nav class="sidebar-nav">
          <a routerLink="/dashboard" routerLinkActive="active-route" class="nav-item">
            <span class="material-icons-round">dashboard</span>
            <span *ngIf="!sidebarCollapsed()" class="nav-label">Dashboard</span>
          </a>
          <a routerLink="/projects" routerLinkActive="active-route" class="nav-item">
            <span class="material-icons-round">workspaces</span>
            <span *ngIf="!sidebarCollapsed()" class="nav-label">Projects</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <button class="logout-btn" (click)="logout()">
            <span class="material-icons-round">logout</span>
            <span *ngIf="!sidebarCollapsed()" class="nav-label">Sign Out</span>
          </button>
        </div>
      </aside>

      <!-- 2. Main Area -->
      <div class="main-area">
        <!-- Top Navigation Bar -->
        <header class="top-nav glass-card">
          <div class="nav-left">
            <button class="menu-hamburger" (click)="toggleSidebar()">
              <span class="material-icons-round">menu</span>
            </button>
            <h1 class="page-title">Team Task Manager</h1>
          </div>
          
          <div class="nav-right">
            <!-- User Dropdown Menu -->
            <div class="profile-dropdown" (click)="toggleDropdown()">
              <div class="user-avatar">
                {{ userInitials() }}
              </div>
              <div class="user-info">
                <span class="user-name">{{ currentUser()?.name }}</span>
                <span class="user-role">{{ contextualRole() }}</span>
              </div>
              <span class="material-icons-round arrow-icon" [class.rotated]="dropdownOpen()">
                keyboard_arrow_down
              </span>

              <div *ngIf="dropdownOpen()" class="dropdown-menu glass-card">
                <div class="dropdown-header">
                  <p class="email">{{ currentUser()?.email }}</p>
                </div>
                <div class="dropdown-divider"></div>
                <a routerLink="/projects" class="dropdown-item">
                  <span class="material-icons-round">folder</span>
                  My Projects
                </a>
                <div class="dropdown-divider"></div>
                <button class="dropdown-item logout" (click)="logout()">
                  <span class="material-icons-round">logout</span>
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>

        <!-- Route Outlet Content -->
        <main class="page-content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .layout-container {
      display: flex;
      min-height: 100vh;
      background-color: var(--bg-obsidian-deep);
    }

    // Sidebar Styles
    .sidebar {
      position: fixed;
      top: 16px;
      left: 16px;
      bottom: 16px;
      width: 260px;
      padding: 20px 12px;
      display: flex;
      flex-direction: column;
      border-radius: 20px;
      z-index: 100;
      transition: var(--transition-smooth);
      background-color: var(--bg-obsidian-dark);

      &.collapsed {
        width: 72px;
        .sidebar-header h2, .nav-label {
          display: none;
        }
        .toggle-btn {
          right: 50%;
          transform: translateX(50%);
        }
      }
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 32px;
      padding: 0 8px;
      position: relative;

      .logo-icon {
        font-size: 32px;
        color: var(--color-primary);
        text-shadow: var(--shadow-glow);
      }

      h2 {
        font-size: 1.1rem;
        font-weight: 800;
        letter-spacing: 0.1em;
        background: linear-gradient(135deg, #FFFFFF 0%, #B3B3B3 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
    }

    .toggle-btn {
      position: absolute;
      right: 0;
      background: var(--bg-obsidian-medium);
      border: 1px solid var(--glass-border);
      color: var(--color-text-secondary);
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: var(--transition-smooth);

      &:hover {
        border-color: var(--color-primary);
        color: #FFFFFF;
      }
    }

    .sidebar-nav {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px 16px;
      color: var(--color-text-secondary);
      text-decoration: none;
      border-radius: 10px;
      font-weight: 500;
      transition: var(--transition-smooth);

      &:hover {
        color: #FFFFFF;
        background-color: rgba(255, 51, 51, 0.05);
      }

      &.active-route {
        color: #FFFFFF;
        background-color: rgba(255, 51, 51, 0.1);
        border: 1px solid rgba(255, 51, 51, 0.2);
        box-shadow: inset 0 0 10px rgba(255, 51, 51, 0.05), var(--shadow-glow);
      }
    }

    .sidebar-footer {
      padding-top: 20px;
      border-top: 1px solid var(--glass-border);
    }

    .logout-btn {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px 16px;
      background: none;
      border: none;
      color: #EF4444;
      font-family: var(--font-body);
      font-weight: 500;
      font-size: 0.95rem;
      border-radius: 10px;
      cursor: pointer;
      transition: var(--transition-smooth);

      &:hover {
        background-color: rgba(239, 68, 68, 0.1);
      }
    }

    // Main Area Layout
    .main-area {
      flex: 1;
      padding: 16px 16px 16px 292px;
      display: flex;
      flex-direction: column;
      min-width: 0;
      transition: var(--transition-smooth);
    }

    .sidebar.collapsed ~ .main-area {
      padding-left: 104px;
    }

    // Top Navigation Styles
    .top-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 72px;
      padding: 0 24px;
      border-radius: 16px;
      background-color: var(--bg-obsidian-dark);
      margin-bottom: 24px;
      position: sticky;
      top: 16px;
      z-index: 99;
    }

    .nav-left {
      display: flex;
      align-items: center;
      gap: 16px;

      .menu-hamburger {
        display: none;
        background: none;
        border: none;
        color: #FFFFFF;
        cursor: pointer;
      }

      .page-title {
        font-size: 1.25rem;
        font-weight: 700;
        letter-spacing: 0.02em;
        color: #FFFFFF;
      }
    }

    // Profile Dropdown
    .profile-dropdown {
      position: relative;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 6px 12px;
      border-radius: 10px;
      cursor: pointer;
      user-select: none;
      transition: var(--transition-smooth);

      &:hover {
        background-color: var(--bg-obsidian-medium);
      }
    }

    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%);
      color: #FFFFFF;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.95rem;
      border: 1px solid rgba(255,255,255,0.2);
    }

    .user-info {
      display: flex;
      flex-direction: column;

      .user-name {
        font-size: 0.9rem;
        font-weight: 600;
        color: #FFFFFF;
      }

      .user-role {
        font-size: 0.7rem;
        color: var(--color-text-secondary);
      }
    }

    .arrow-icon {
      color: var(--color-text-secondary);
      transition: var(--transition-smooth);
      
      &.rotated {
        transform: rotate(180deg);
      }
    }

    .dropdown-menu {
      position: absolute;
      top: 52px;
      right: 0;
      width: 220px;
      padding: 8px;
      border-radius: 12px;
      background-color: var(--bg-obsidian-dark);
      z-index: 1000;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      border: 1px solid var(--glass-border);
      animation: dropOpen 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .dropdown-header {
      padding: 8px 12px;
      
      .email {
        font-size: 0.75rem;
        color: var(--color-text-secondary);
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .dropdown-divider {
      height: 1px;
      background-color: var(--glass-border);
      margin: 4px 0;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      color: var(--color-text-secondary);
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 500;
      border-radius: 8px;
      background: none;
      border: none;
      width: 100%;
      text-align: left;
      cursor: pointer;
      transition: var(--transition-smooth);

      &:hover {
        color: #FFFFFF;
        background-color: rgba(255,51,51,0.05);
      }

      &.logout {
        color: #EF4444;
        &:hover {
          background-color: rgba(239, 68, 68, 0.1);
        }
      }
    }

    // Page Content Area
    .page-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      animation: pageTransition 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @keyframes dropOpen {
      from {
        transform: translateY(-10px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    @keyframes pageTransition {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    // Responsive Media Queries
    @media (max-width: 992px) {
      .sidebar {
        transform: translateX(-300px);
        &.collapsed {
          transform: translateX(0);
          width: 260px;
          .sidebar-header h2, .nav-label {
            display: flex;
          }
          .toggle-btn {
            right: 0;
            transform: none;
          }
        }
      }

      .main-area {
        padding-left: 16px !important;
      }

      .nav-left .menu-hamburger {
        display: flex;
      }

      .user-info {
        display: none;
      }
    }
  `]
})
export class MainLayoutComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly projectService = inject(ProjectService);

  readonly sidebarCollapsed = signal<boolean>(false);
  readonly dropdownOpen = signal<boolean>(false);
  readonly currentUser = this.auth.currentUser;

  /**
   * Holds the live project member list for the currently active project route.
   * Reset to [] when navigating away from a project page.
   */
  private readonly activeProjectMembers = signal<ProjectMember[]>([]);

  /**
   * The contextual role label shown in the top-right user profile block.
   * Derived from the active project's member list:
   *   - 'Project Admin'   → user is project creator or has Admin role
   *   - 'Team Member'     → user is a regular Member of the project
   *   - 'Workspace Member'→ no active project context (dashboard, projects list, etc.)
   */
  readonly contextualRole = computed<string>(() => {
    const currentUserId = this.currentUser()?.id;
    if (!currentUserId) return '';

    const members = this.activeProjectMembers();
    if (members.length === 0) return '';

    const myEntry = members.find(m => m.userId === currentUserId);
    if (!myEntry) return '';

    return myEntry.role === 'Admin' ? 'Admin' : 'Member';
  });

  userInitials(): string {
    const name = this.currentUser()?.name ?? 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  ngOnInit(): void {
    // Listen to every completed navigation and update the contextual role accordingly
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event) => {
      const nav = event as NavigationEnd;
      this.resolveProjectRoleFromUrl(nav.urlAfterRedirects);
    });

    // Also resolve on initial load (no NavigationEnd fires for the first route)
    this.resolveProjectRoleFromUrl(this.router.url);
  }

  /**
   * Parses the URL for a project ID (matches /projects/123 or /projects/123/kanban etc.)
   * and fetches the member list to resolve the current user's contextual role.
   */
  private resolveProjectRoleFromUrl(url: string): void {
    // Match /projects/<numeric-id> anywhere in the URL path
    const match = url.match(/\/projects\/(\d+)/);
    if (match) {
      const projectId = parseInt(match[1], 10);
      this.projectService.getProjectMembers(projectId).subscribe({
        next: (res) => {
          if (res.success) {
            this.activeProjectMembers.set(res.data);
          }
        },
        error: () => {
          // Silently fail — header role gracefully falls back to 'Workspace Member'
          this.activeProjectMembers.set([]);
        }
      });
    } else {
      // Not on a project-specific page: clear the role context
      this.activeProjectMembers.set([]);
    }
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  toggleDropdown(): void {
    this.dropdownOpen.update(v => !v);
  }

  logout(): void {
    this.auth.logout();
  }
}

