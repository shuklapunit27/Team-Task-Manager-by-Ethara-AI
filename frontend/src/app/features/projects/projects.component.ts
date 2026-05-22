import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ProjectService } from '../../core/services/project.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { Project } from '../../core/models';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, SkeletonLoaderComponent, ConfirmDialogComponent],
  template: `
    <div class="projects-viewport">
      <div class="viewport-header">
        <div>
          <h2>Workspaces & Projects</h2>
          <p>Organize, manage and collaborate across separate projects</p>
        </div>
        <button class="btn btn-primary" (click)="openCreateModal()">
          <span class="material-icons-round">add</span>
          Create Project
        </button>
      </div>

      <!-- Skeletons -->
      <div *ngIf="isLoading()" class="skeleton-grid">
        <app-skeleton-loader type="card" height="180px" *ngFor="let i of [1,2,3]"></app-skeleton-loader>
      </div>

      <!-- Empty State -->
      <div *ngIf="!isLoading() && projects().length === 0" class="glass-card empty-state">
        <span class="material-icons-round empty-icon">folder_open</span>
        <h3>No projects found</h3>
        <p>Create a project and add members to orchestrate collaborative tasks.</p>
        <button class="btn btn-primary mt-12" (click)="openCreateModal()">
          Create Your First Project
        </button>
      </div>

      <!-- Active Projects Grid -->
      <div *ngIf="!isLoading() && projects().length > 0" class="projects-grid">
        <div *ngFor="let project of projects()" class="glass-card project-card">
          <div class="project-header">
            <span class="material-icons-round folder-icon">folder</span>
            <div class="project-actions" *ngIf="isProjectCreator(project)">
              <button class="action-btn delete" (click)="triggerDelete(project)">
                <span class="material-icons-round">delete</span>
              </button>
            </div>
          </div>

          <div class="project-body">
            <h3>{{ project.name }}</h3>
            <p>{{ project.description || 'No description provided.' }}</p>
          </div>

          <div class="project-footer">
            <div class="member-indicator">
              <span class="material-icons-round">groups</span>
              <span>{{ project.members.length }} {{ project.members.length === 1 ? 'member' : 'members' }}</span>
            </div>
            
            <div class="card-links">
              <a [routerLink]="['/projects', project.id]" class="btn btn-secondary btn-sm">Details</a>
              <a [routerLink]="['/projects', project.id, 'kanban']" class="btn btn-primary btn-sm">Kanban</a>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Create Project Modal Dialog -->
      <div *ngIf="showModal()" class="modal-overlay">
        <div class="modal-content glass-card">
          <div class="modal-header">
            <h3>Create New Project</h3>
            <button class="close-x" (click)="closeCreateModal()">&times;</button>
          </div>
          <form [formGroup]="projectForm" (ngSubmit)="onCreateProject()">
            <div class="modal-body">
              <div class="form-group">
                <label for="name">Project Name</label>
                <input 
                  type="text" 
                  id="name" 
                  placeholder="e.g. Website Redesign" 
                  formControlName="name" />
                <div *ngIf="projectForm.get('name')?.invalid && projectForm.get('name')?.touched" class="error-text">
                  Project name is required.
                </div>
              </div>
              <div class="form-group">
                <label for="description">Description (Optional)</label>
                <textarea 
                  id="description" 
                  rows="3" 
                  placeholder="Describe project deliverables..." 
                  formControlName="description"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeCreateModal()">Cancel</button>
              <button type="submit" [disabled]="projectForm.invalid" class="btn btn-primary">Create</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Delete Confirmation Modal Component -->
      <app-confirm-dialog
        [show]="showDeleteConfirm()"
        title="Delete Project"
        [message]="'Are you sure you want to permanently delete project: ' + projectToDelete()?.name + '? This action deletes all tasks inside the project and is irreversible.'"
        confirmText="Permanently Delete"
        cancelText="Cancel"
        (confirm)="onConfirmDelete()"
        (cancel)="onCancelDelete()">
      </app-confirm-dialog>

    </div>
  `,
  styles: [`
    .projects-viewport {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .viewport-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;

      h2 {
        font-size: 1.5rem;
        color: #FFFFFF;
      }
      p {
        font-size: 0.85rem;
        color: var(--color-text-secondary);
      }
    }

    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }

    .projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }

    .project-card {
      background-color: var(--bg-obsidian-dark);
      border: 1px solid var(--glass-border);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 220px;
      padding: 20px;
    }

    .project-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .folder-icon {
        font-size: 32px;
        color: var(--color-primary);
        text-shadow: var(--shadow-glow);
      }
    }

    .action-btn {
      background: none;
      border: none;
      color: var(--color-text-secondary);
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      transition: var(--transition-smooth);

      &:hover {
        background-color: var(--bg-obsidian-light);
        color: #FFFFFF;
      }

      &.delete:hover {
        color: #EF4444;
        background-color: rgba(239, 68, 68, 0.1);
      }
    }

    .project-body {
      margin-top: 12px;
      flex: 1;

      h3 {
        font-size: 1.15rem;
        font-weight: 700;
        color: #FFFFFF;
        margin-bottom: 6px;
      }

      p {
        font-size: 0.85rem;
        color: var(--color-text-secondary);
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    }

    .project-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 16px;
      border-top: 1px solid var(--glass-border);
      padding-top: 12px;
    }

    .member-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
      color: var(--color-text-secondary);

      span {
        font-size: 16px;
      }
    }

    .card-links {
      display: flex;
      gap: 8px;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 0.8rem;
    }

    // Modal Overlays
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      width: 100%;
      max-width: 480px;
      border: 1px solid rgba(255,51,51,0.2);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;

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

      &:hover {
        color: var(--color-primary);
      }
    }

    .modal-body {
      margin-bottom: 20px;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .error-text {
      font-size: 0.75rem;
      color: #EF4444;
      margin-top: 4px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 24px;
      text-align: center;
      border: 1px dashed var(--glass-border);

      .empty-icon {
        font-size: 64px;
        color: var(--color-text-muted);
        margin-bottom: 16px;
      }

      h3 {
        font-size: 1.25rem;
        font-weight: 700;
        margin-bottom: 6px;
      }

      p {
        font-size: 0.9rem;
        color: var(--color-text-secondary);
        max-width: 400px;
      }
    }

    .mt-12 {
      margin-top: 12px;
    }
  `]
})
export class ProjectsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly projectService = inject(ProjectService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);

  readonly isLoading = signal<boolean>(true);
  readonly showModal = signal<boolean>(false);
  readonly projects = signal<Project[]>([]);

  // Deletion helper states
  readonly showDeleteConfirm = signal<boolean>(false);
  readonly projectToDelete = signal<Project | null>(null);

  readonly projectForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', [Validators.maxLength(1000)]]
  });

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (res) => {
        if (res.success) {
          this.projects.set(res.data);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  isProjectCreator(project: Project): boolean {
    return project.createdByUserId === this.auth.currentUser()?.id;
  }

  openCreateModal(): void {
    this.projectForm.reset();
    this.showModal.set(true);
  }

  closeCreateModal(): void {
    this.showModal.set(false);
  }

  onCreateProject(): void {
    if (this.projectForm.invalid) return;

    const { name, description } = this.projectForm.value;
    this.projectService.createProject(name, description).subscribe({
      next: (res) => {
        if (res.success) {
          this.projects.update(list => [res.data, ...list]);
          this.closeCreateModal();
          this.notification.showSuccess(`Project '${res.data.name}' created!`);
        }
      }
    });
  }

  triggerDelete(project: Project): void {
    this.projectToDelete.set(project);
    this.showDeleteConfirm.set(true);
  }

  onConfirmDelete(): void {
    const project = this.projectToDelete();
    if (!project) return;

    this.projectService.deleteProject(project.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.projects.update(list => list.filter(p => p.id !== project.id));
          this.notification.showSuccess(`Project '${project.name}' deleted successfully.`);
        }
        this.onCancelDelete();
      },
      error: () => {
        this.onCancelDelete();
      }
    });
  }

  onCancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.projectToDelete.set(null);
  }
}
