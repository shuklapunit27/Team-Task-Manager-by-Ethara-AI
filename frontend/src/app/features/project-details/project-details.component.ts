import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ProjectService } from '../../core/services/project.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { Project, ProjectMember } from '../../core/models';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-project-details',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, SkeletonLoaderComponent, ConfirmDialogComponent],
  template: `
    <div class="details-viewport">
      
      <!-- Skeletons -->
      <div *ngIf="isLoading()" class="skeleton-grid">
        <app-skeleton-loader type="title" height="40px"></app-skeleton-loader>
        <div class="details-layout">
          <app-skeleton-loader type="card" height="300px"></app-skeleton-loader>
          <app-skeleton-loader type="card" height="300px"></app-skeleton-loader>
        </div>
      </div>

      <div *ngIf="!isLoading() && project()" class="details-content">
        <!-- Header -->
        <div class="viewport-header">
          <div class="header-left">
            <a routerLink="/projects" class="back-link">
              <span class="material-icons-round">arrow_back</span>
              Back to Projects
            </a>
            <h2>{{ project()?.name }} Details</h2>
          </div>
          <a [routerLink]="['/projects', project()?.id, 'kanban']" class="btn btn-primary">
            <span class="material-icons-round">view_kanban</span>
            Open Kanban Board
          </a>
        </div>

        <!-- Details Grid -->
        <div class="details-layout">
          <!-- Left: Meta Details -->
          <div class="glass-card meta-card">
            <h3>Workspace Metadata</h3>
            <div class="divider"></div>
            
            <div class="meta-item">
              <span class="label">Project Title:</span>
              <span class="value">{{ project()?.name }}</span>
            </div>
            
            <div class="meta-item">
              <span class="label">Created By:</span>
              <span class="value text-primary">{{ project()?.createdByUserName }}</span>
            </div>

            <div class="meta-item">
              <span class="label">Initialized:</span>
              <span class="value">{{ formatDate(project()!.createdAt) }}</span>
            </div>

            <div class="meta-item vertical">
              <span class="label">Description:</span>
              <span class="value desc">{{ project()?.description || 'No description provided.' }}</span>
            </div>
          </div>

          <!-- Right: Membership Administration -->
          <div class="glass-card members-card">
            <div class="members-header">
              <h3>Collaborating Team Members</h3>
              <span class="member-count badge status-inprogress">
                {{ project()?.members?.length }} Users
              </span>
            </div>
            <div class="divider"></div>

            <!-- Add Member Sub-Form -->
            <form *ngIf="currentUserIsAdmin()" [formGroup]="memberForm" (ngSubmit)="onAddMember()" class="add-member-form">
              <div class="form-group email-input">
                <input 
                  type="email" 
                  placeholder="collaborator@company.com" 
                  formControlName="email" />
              </div>
              <div class="form-group role-input">
                <select formControlName="role">
                  <option value="Member">Member</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <button type="submit" [disabled]="memberForm.invalid" class="btn btn-primary add-btn">
                <span class="material-icons-round">person_add</span>
                Add
              </button>
            </form>
            <div *ngIf="memberForm.get('email')?.invalid && memberForm.get('email')?.touched" class="error-msg">
              Please provide a valid collaborator email.
            </div>

            <!-- Members List -->
            <div class="members-list">
              <div *ngFor="let member of project()?.members" class="member-item">
                <div class="member-left">
                  <div class="member-avatar">
                    {{ member.userName.slice(0,2).toUpperCase() }}
                  </div>
                  <div class="member-info">
                    <span class="name">{{ member.userName }}</span>
                    <span class="email">{{ member.userEmail }}</span>
                  </div>
                </div>

                <div class="member-right">
                  <span [class]="'badge ' + (member.role === 'Admin' ? 'priority-high' : 'status-todo')">
                    {{ member.role }}
                  </span>
                  
                  <button 
                    *ngIf="currentUserIsAdmin() && !isProjectCreator(member.userId)" 
                    class="remove-btn" 
                    title="Remove member"
                    (click)="triggerRemove(member)">
                    <span class="material-icons-round">person_remove</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      <!-- Delete Member Confirmation -->
      <app-confirm-dialog
        [show]="showRemoveConfirm()"
        title="Remove Team Member"
        [message]="'Are you sure you want to remove ' + memberToRemove()?.userName + ' from this project? They will be unassigned from all tasks inside this project.'"
        confirmText="Remove Member"
        cancelText="Cancel"
        (confirm)="onConfirmRemove()"
        (cancel)="onCancelRemove()">
      </app-confirm-dialog>

    </div>
  `,
  styles: [`
    .details-viewport {
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
        margin-top: 4px;
      }
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.85rem;
      color: var(--color-text-secondary);
      text-decoration: none;
      transition: var(--transition-smooth);

      &:hover {
        color: var(--color-primary);
      }

      span {
        font-size: 16px;
      }
    }

    .skeleton-grid {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .details-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    @media (max-width: 992px) {
      .details-layout {
        grid-template-columns: 1fr;
      }
    }

    .meta-card, .members-card {
      background-color: var(--bg-obsidian-dark);
      border: 1px solid var(--glass-border);
      padding: 24px;
      min-height: 380px;

      h3 {
        font-size: 1.2rem;
        color: #FFFFFF;
      }
    }

    .divider {
      height: 1px;
      background-color: var(--glass-border);
      margin: 16px 0 24px 0;
    }

    // Meta Details
    .meta-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      font-size: 0.95rem;

      .label {
        color: var(--color-text-secondary);
        font-weight: 500;
      }

      .value {
        color: #FFFFFF;
        font-weight: 600;

        &.text-primary {
          color: var(--color-primary);
        }

        &.desc {
          font-weight: 400;
          color: var(--color-text-secondary);
          line-height: 1.5;
        }
      }

      &.vertical {
        flex-direction: column;
        gap: 8px;
        margin-top: 24px;
        border-top: 1px solid var(--glass-border);
        padding-top: 20px;
      }
    }

    // Members Admin Section
    .members-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .add-member-form {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;

      .form-group {
        margin: 0;
      }

      .email-input {
        flex: 1;
      }

      .role-input {
        width: 110px;
      }

      .add-btn {
        padding: 0 16px;
      }
    }

    .error-msg {
      font-size: 0.75rem;
      color: #EF4444;
      margin-top: -12px;
      margin-bottom: 16px;
    }

    .members-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 320px;
      overflow-y: auto;
    }

    .member-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background-color: var(--bg-obsidian-medium);
      border: 1px solid var(--glass-border);
      border-radius: 10px;
      transition: var(--transition-smooth);

      &:hover {
        border-color: rgba(255, 51, 51, 0.2);
      }
    }

    .member-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .member-avatar {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background-color: var(--bg-obsidian-light);
      border: 1px solid var(--glass-border);
      color: #FFFFFF;
      font-size: 0.85rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .member-info {
      display: flex;
      flex-direction: column;

      .name {
        font-size: 0.9rem;
        font-weight: 600;
        color: #FFFFFF;
      }

      .email {
        font-size: 0.75rem;
        color: var(--color-text-secondary);
      }
    }

    .member-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .remove-btn {
      background: none;
      border: none;
      color: var(--color-text-muted);
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      transition: var(--transition-smooth);

      &:hover {
        color: #EF4444;
        background-color: rgba(239, 68, 68, 0.1);
      }

      span {
        font-size: 20px;
      }
    }
  `]
})
export class ProjectDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly projectService = inject(ProjectService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);

  readonly isLoading = signal<boolean>(true);
  readonly project = signal<Project | null>(null);

  // Removal helpers
  readonly showRemoveConfirm = signal<boolean>(false);
  readonly memberToRemove = signal<ProjectMember | null>(null);

  readonly memberForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    role: ['Member', [Validators.required]]
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.loadProjectDetails(parseInt(idParam));
    }
  }

  loadProjectDetails(id: number): void {
    this.projectService.getProjectById(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.project.set(res.data);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  currentUserIsAdmin(): boolean {
    const project = this.project();
    if (!project) return false;

    const currentUserId = this.auth.currentUser()?.id;
    if (project.createdByUserId === currentUserId) return true;

    const currentMembership = project.members.find(m => m.userId === currentUserId);
    return currentMembership?.role === 'Admin';
  }

  isProjectCreator(userId: number): boolean {
    return this.project()?.createdByUserId === userId;
  }

  onAddMember(): void {
    const project = this.project();
    if (this.memberForm.invalid || !project) return;

    const { email, role } = this.memberForm.value;
    this.projectService.addMember(project.id, email, role).subscribe({
      next: (res) => {
        if (res.success) {
          this.project.set(res.data);
          this.memberForm.reset({ role: 'Member' });
          this.notification.showSuccess('Team member added successfully.');
        }
      }
    });
  }

  triggerRemove(member: ProjectMember): void {
    this.memberToRemove.set(member);
    this.showRemoveConfirm.set(true);
  }

  onConfirmRemove(): void {
    const project = this.project();
    const member = this.memberToRemove();
    if (!project || !member) return;

    this.projectService.removeMember(project.id, member.userId).subscribe({
      next: (res) => {
        if (res.success) {
          this.project.set(res.data);
          this.notification.showSuccess(`${member.userName} removed from the project.`);
        }
        this.onCancelRemove();
      },
      error: () => {
        this.onCancelRemove();
      }
    });
  }

  onCancelRemove(): void {
    this.showRemoveConfirm.set(false);
    this.memberToRemove.set(null);
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }
}
