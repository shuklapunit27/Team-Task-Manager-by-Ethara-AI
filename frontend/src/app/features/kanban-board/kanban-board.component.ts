import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { 
  DragDropModule, 
  CdkDragDrop, 
  moveItemInArray, 
  transferArrayItem 
} from '@angular/cdk/drag-drop';
import { TaskService } from '../../core/services/task.service';
import { ProjectService } from '../../core/services/project.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { TaskItem, Project, ProjectMember, UserResponse } from '../../core/models';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [
    CommonModule, 
    RouterLink, 
    ReactiveFormsModule, 
    DragDropModule, 
    SkeletonLoaderComponent, 
    ConfirmDialogComponent
  ],
  template: `
    <div class="kanban-viewport">
      
      <!-- Loading skeleton state -->
      <div *ngIf="isLoading()" class="skeleton-grid">
        <app-skeleton-loader type="title" height="40px"></app-skeleton-loader>
        <div class="board-columns">
          <app-skeleton-loader type="card" height="400px" *ngFor="let i of [1,2,3]"></app-skeleton-loader>
        </div>
      </div>

      <div *ngIf="!isLoading() && project()" class="kanban-content">
        <!-- Header -->
        <div class="viewport-header">
          <div class="header-left">
            <a [routerLink]="['/projects', project()?.id]" class="back-link">
              <span class="material-icons-round">arrow_back</span>
              Back to Details
            </a>
            <h2>{{ project()?.name }} Kanban Board</h2>
            <!-- Dynamic role badge shown next to board name -->
            <span class="role-badge" [class.admin-badge]="currentUserIsAdmin()">
              <span class="material-icons-round">{{ currentUserIsAdmin() ? 'shield' : 'person' }}</span>
              {{ currentUserRole() }}
            </span>
          </div>
          <button class="btn btn-primary" (click)="openCreateModal()">
            <span class="material-icons-round">add_task</span>
            Create Task
          </button>
        </div>

        <!-- 3-Column Swimlanes with CDK Drag Drop -->
        <div class="board-columns" cdkDropListGroup>
          <!-- To Do -->
          <div class="column-wrapper glass-card">
            <div class="column-header">
              <div class="title-left">
                <span class="dot todo-dot"></span>
                <h3>To Do</h3>
              </div>
              <span class="badge status-todo">{{ todoTasks().length }}</span>
            </div>
            
            <div 
              cdkDropList 
              [cdkDropListData]="todoTasks()" 
              (cdkDropListDropped)="onDrop($event, 'ToDo')"
              class="column-list">
              
              <div *ngIf="todoTasks().length === 0" class="empty-column-state">
                <span class="material-icons-round">inbox</span>
                <p>Drag or create tasks here</p>
              </div>

              <div 
                *ngFor="let task of todoTasks()" 
                cdkDrag 
                [cdkDragData]="task"
                class="task-card glass-card">
                
                <div class="task-card-header">
                  <span [class]="'badge priority-' + task.priority.toLowerCase()">{{ task.priority }}</span>
                  <div class="task-actions">
                    <button class="action-btn" (click)="openEditModal(task)" title="Edit task">
                      <span class="material-icons-round">edit</span>
                    </button>
                    <!-- Delete ONLY visible when: task.status === 'Done' AND current user is Admin -->
                    <button 
                      *ngIf="task.status === 'Done' && currentUserIsAdmin()" 
                      class="action-btn delete" 
                      (click)="triggerDelete(task)" 
                      title="Delete completed task (Admin only)">
                      <span class="material-icons-round">delete</span>
                    </button>
                  </div>
                </div>

                <div class="task-card-body">
                  <h4>{{ task.title }}</h4>
                  <p *ngIf="task.description">{{ task.description }}</p>
                </div>

                <div class="task-card-footer">
                  <div class="due-indicator" [class.overdue]="task.isOverdue">
                    <span class="material-icons-round">calendar_today</span>
                    <span>{{ formatDate(task.dueDate) }}</span>
                  </div>

                  <div class="assignee-indicator" [title]="task.assignedToUserName ?? 'Unassigned'">
                    <span class="avatar">
                      {{ task.assignedToUserName ? task.assignedToUserName.slice(0,2).toUpperCase() : '?' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- In Progress -->
          <div class="column-wrapper glass-card">
            <div class="column-header">
              <div class="title-left">
                <span class="dot inprogress-dot"></span>
                <h3>In Progress</h3>
              </div>
              <span class="badge status-inprogress">{{ inProgressTasks().length }}</span>
            </div>

            <div 
              cdkDropList 
              [cdkDropListData]="inProgressTasks()" 
              (cdkDropListDropped)="onDrop($event, 'InProgress')"
              class="column-list">
              
              <div *ngIf="inProgressTasks().length === 0" class="empty-column-state">
                <span class="material-icons-round">donut_large</span>
                <p>Tasks actively worked on</p>
              </div>

              <div 
                *ngFor="let task of inProgressTasks()" 
                cdkDrag 
                [cdkDragData]="task"
                class="task-card glass-card">
                
                <div class="task-card-header">
                  <span [class]="'badge priority-' + task.priority.toLowerCase()">{{ task.priority }}</span>
                  <div class="task-actions">
                    <button class="action-btn" (click)="openEditModal(task)" title="Edit task">
                      <span class="material-icons-round">edit</span>
                    </button>
                    <button 
                      *ngIf="task.status === 'Done' && currentUserIsAdmin()" 
                      class="action-btn delete" 
                      (click)="triggerDelete(task)" 
                      title="Delete completed task (Admin only)">
                      <span class="material-icons-round">delete</span>
                    </button>
                  </div>
                </div>

                <div class="task-card-body">
                  <h4>{{ task.title }}</h4>
                  <p *ngIf="task.description">{{ task.description }}</p>
                </div>

                <div class="task-card-footer">
                  <div class="due-indicator" [class.overdue]="task.isOverdue">
                    <span class="material-icons-round">calendar_today</span>
                    <span>{{ formatDate(task.dueDate) }}</span>
                  </div>

                  <div class="assignee-indicator" [title]="task.assignedToUserName ?? 'Unassigned'">
                    <span class="avatar">
                      {{ task.assignedToUserName ? task.assignedToUserName.slice(0,2).toUpperCase() : '?' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Done -->
          <div class="column-wrapper glass-card">
            <div class="column-header">
              <div class="title-left">
                <span class="dot done-dot"></span>
                <h3>Done</h3>
              </div>
              <span class="badge status-done">{{ doneTasks().length }}</span>
            </div>

            <div 
              cdkDropList 
              [cdkDropListData]="doneTasks()" 
              (cdkDropListDropped)="onDrop($event, 'Done')"
              class="column-list">
              
              <div *ngIf="doneTasks().length === 0" class="empty-column-state">
                <span class="material-icons-round">check_circle</span>
                <p>Completed project outcomes</p>
              </div>

              <div 
                *ngFor="let task of doneTasks()" 
                cdkDrag 
                [cdkDragData]="task"
                class="task-card glass-card done-card">
                
                <div class="task-card-header">
                  <span [class]="'badge priority-' + task.priority.toLowerCase()">{{ task.priority }}</span>
                  <div class="task-actions">
                    <button class="action-btn" (click)="openEditModal(task)" title="Edit task">
                      <span class="material-icons-round">edit</span>
                    </button>
                    <!-- Delete button ONLY rendered when status=Done AND user is Admin -->
                    <button 
                      *ngIf="task.status === 'Done' && currentUserIsAdmin()" 
                      class="action-btn delete" 
                      (click)="triggerDelete(task)" 
                      title="Delete completed task (Admin only)">
                      <span class="material-icons-round">delete</span>
                    </button>
                  </div>
                </div>

                <div class="task-card-body">
                  <h4>{{ task.title }}</h4>
                  <p *ngIf="task.description">{{ task.description }}</p>
                </div>

                <div class="task-card-footer">
                  <div class="due-indicator">
                    <span class="material-icons-round text-success">check_circle_outline</span>
                    <span class="text-success">Completed</span>
                  </div>

                  <div class="assignee-indicator" [title]="task.assignedToUserName ?? 'Unassigned'">
                    <span class="avatar">
                      {{ task.assignedToUserName ? task.assignedToUserName.slice(0,2).toUpperCase() : '?' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Create / Edit Task Modal -->
      <div *ngIf="showModal()" class="modal-overlay" (click)="onOverlayClick($event)">
        <div class="modal-content glass-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingTask() ? 'Edit Task' : 'Create New Task' }}</h3>
            <button class="close-x" (click)="closeModal()">&times;</button>
          </div>
          <form [formGroup]="taskForm" (ngSubmit)="onSubmitTask()">
            <div class="modal-body">
              <div class="form-group">
                <label for="kb-title">Title</label>
                <input 
                  type="text" 
                  id="kb-title" 
                  placeholder="Task short definition" 
                  formControlName="title" />
                <div *ngIf="taskForm.get('title')?.invalid && taskForm.get('title')?.touched" class="error-text">
                  Title is required (max 200 chars).
                </div>
              </div>

              <div class="form-group">
                <label for="kb-description">Description</label>
                <textarea 
                  id="kb-description" 
                  rows="3" 
                  placeholder="Deliverable specifications..." 
                  formControlName="description"></textarea>
              </div>

              <div class="form-group-row">
                <div class="form-group flex-1">
                  <label for="kb-dueDate">Due Date</label>
                  <input 
                    type="date" 
                    id="kb-dueDate" 
                    formControlName="dueDate" />
                  <div *ngIf="taskForm.get('dueDate')?.invalid && taskForm.get('dueDate')?.touched" class="error-text">
                    Due date is required.
                  </div>
                </div>

                <div class="form-group flex-1">
                  <label for="kb-priority">Priority</label>
                  <select id="kb-priority" formControlName="priority">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div class="form-group-row">
                <div class="form-group flex-1" *ngIf="editingTask()">
                  <label for="kb-status">Status</label>
                  <select id="kb-status" formControlName="status">
                    <option value="ToDo">To Do</option>
                    <option value="InProgress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>

                <!--
                  Assignee dropdown populated via dedicated GET api/auth/users call.
                  Format: "User Name (User Email)" e.g. "Punit Shukla (punit@example.com)"
                -->
                <div class="form-group flex-1">
                  <label for="kb-assignee">Assignee</label>
                  <select id="kb-assignee" formControlName="assignedToUserId">
                    <option [value]="null">Unassigned</option>
                    <option *ngFor="let user of globalUsers()" [value]="user.id">
                      {{ user.name }} ({{ user.email }})
                    </option>
                  </select>
                  <div *ngIf="isMembersLoading()" class="members-loading">
                    <span class="material-icons-round spinning">sync</span> Loading assignees...
                  </div>
                </div>
              </div>

            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancel</button>
              <button type="submit" [disabled]="taskForm.invalid || isSubmitting()" class="btn btn-primary">
                <span *ngIf="isSubmitting()" class="material-icons-round spinning">sync</span>
                {{ editingTask() ? 'Save Changes' : 'Create Task' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Delete Task Confirmation -->
      <app-confirm-dialog
        [show]="showDeleteConfirm()"
        title="Delete Task"
        [message]="'Are you sure you want to permanently delete task: ' + taskToDelete()?.title + '?'"
        confirmText="Delete Task"
        cancelText="Cancel"
        (confirm)="onConfirmDelete()"
        (cancel)="onCancelDelete()">
      </app-confirm-dialog>

    </div>
  `,
  styles: [`
    .kanban-viewport {
      display: flex;
      flex-direction: column;
      gap: 24px;
      flex: 1;
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

    .header-left {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .role-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--color-text-secondary);
      background-color: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--glass-border);
      border-radius: 20px;
      padding: 3px 10px;
      width: fit-content;

      span.material-icons-round {
        font-size: 12px;
      }

      &.admin-badge {
        color: var(--color-primary);
        border-color: rgba(255, 51, 51, 0.3);
        background-color: rgba(255, 51, 51, 0.08);
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

    // Board swimlane layout
    .board-columns {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      align-items: start;
      flex: 1;
      min-height: 550px;
    }

    @media (max-width: 992px) {
      .board-columns {
        grid-template-columns: 1fr;
        min-height: auto;
      }
    }

    .column-wrapper {
      background-color: var(--bg-obsidian-dark);
      border: 1px solid var(--glass-border);
      padding: 16px;
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 480px;
    }

    .column-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--glass-border);

      .title-left {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        box-shadow: 0 0 8px currentColor;
      }

      .todo-dot { color: #94A3B8; background: #94A3B8; }
      .inprogress-dot { color: var(--color-accent); background: var(--color-accent); }
      .done-dot { color: #22C55E; background: #22C55E; }

      h3 {
        font-size: 1.05rem;
        color: #FFFFFF;
        font-weight: 700;
      }
    }

    .column-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-height: 420px;
      flex: 1;
    }

    .empty-column-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 16px;
      text-align: center;
      color: var(--color-text-muted);
      border: 1px dashed var(--glass-border);
      border-radius: 12px;
      margin-top: 16px;
      gap: 8px;

      span {
        font-size: 32px;
      }

      p {
        font-size: 0.8rem;
        font-weight: 500;
      }
    }

    // Task Card
    .task-card {
      background-color: var(--bg-obsidian-medium);
      border: 1px solid var(--glass-border);
      border-radius: 12px;
      padding: 16px;
      cursor: grab;
      display: flex;
      flex-direction: column;
      gap: 12px;
      transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;

      &:hover {
        border-color: rgba(255, 51, 51, 0.25);
        box-shadow: var(--shadow-glow);
        transform: translateY(-2px);
      }

      &:active {
        cursor: grabbing;
      }

      &.done-card {
        opacity: 0.85;
        border-color: rgba(34, 197, 94, 0.15);

        &:hover {
          border-color: rgba(34, 197, 94, 0.3);
          box-shadow: 0 0 16px rgba(34, 197, 94, 0.1);
        }
      }

      h4 {
        font-size: 0.95rem;
        color: #FFFFFF;
        font-weight: 600;
        line-height: 1.3;
      }

      p {
        font-size: 0.8rem;
        color: var(--color-text-secondary);
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    }

    .task-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .task-actions {
      display: flex;
      gap: 4px;
    }

    .action-btn {
      background: none;
      border: none;
      color: var(--color-text-muted);
      cursor: pointer;
      border-radius: 4px;
      padding: 2px;
      transition: var(--transition-smooth);

      &:hover {
        color: #FFFFFF;
        background-color: var(--bg-obsidian-light);
      }

      &.delete:hover {
        color: #EF4444;
        background-color: rgba(239,68,68,0.1);
      }

      span {
        font-size: 16px;
      }
    }

    .task-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid var(--glass-border);
      padding-top: 12px;
      margin-top: 4px;
    }

    .due-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      color: var(--color-text-secondary);

      span {
        font-size: 14px;
      }

      &.overdue {
        color: #F87171;
        animation: pulseWarning 1.5s infinite;
      }
    }

    .assignee-indicator {
      .avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%);
        border: 1px solid rgba(255,255,255,0.15);
        color: #FFFFFF;
        font-size: 0.65rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }

    // Modal
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
      max-width: 520px;
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

    .form-group-row {
      display: flex;
      gap: 16px;
    }

    .flex-1 {
      flex: 1;
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

    .members-loading {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      color: var(--color-text-muted);
      margin-top: 4px;

      span {
        font-size: 14px;
      }
    }

    .spinning {
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @keyframes pulseWarning {
      0% { text-shadow: 0 0 2px rgba(239, 68, 68, 0.1); }
      50% { text-shadow: 0 0 6px rgba(239, 68, 68, 0.4); }
      100% { text-shadow: 0 0 2px rgba(239, 68, 68, 0.1); }
    }

    .text-success {
      color: #22C55E;
    }
  `]
})
export class KanbanBoardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly taskService = inject(TaskService);
  private readonly projectService = inject(ProjectService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);

  // ── Core state signals ────────────────────────────────────────────────────
  readonly isLoading = signal<boolean>(true);
  readonly showModal = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly isMembersLoading = signal<boolean>(false);

  /** The active project entity (meta, name, etc.) */
  readonly project = signal<Project | null>(null);

  /**
   * Live member list fetched from GET api/projects/{id}/members.
   * This is separate from project().members so any browser can refresh
   * the dropdown independently and always see up-to-date cross-user data.
   */
  readonly projectMembers = signal<ProjectMember[]>([]);

  /**
   * Global list of all registered users in the database for the assignment dropdown.
   */
  readonly globalUsers = signal<UserResponse[]>([]);

  // ── Swimlane list signals ─────────────────────────────────────────────────
  readonly todoTasks = signal<TaskItem[]>([]);
  readonly inProgressTasks = signal<TaskItem[]>([]);
  readonly doneTasks = signal<TaskItem[]>([]);

  // ── Task operation signals ────────────────────────────────────────────────
  readonly editingTask = signal<TaskItem | null>(null);
  readonly showDeleteConfirm = signal<boolean>(false);
  readonly taskToDelete = signal<TaskItem | null>(null);

  readonly taskForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.maxLength(2000)]],
    dueDate: ['', [Validators.required]],
    priority: ['Medium', [Validators.required]],
    status: ['ToDo', [Validators.required]],
    assignedToUserId: [null]
  });

  ngOnInit(): void {
    const projId = this.route.snapshot.paramMap.get('id');
    if (projId) {
      this.loadBoardData(parseInt(projId, 10));
    }
  }

  // ── Data Loading ──────────────────────────────────────────────────────────

  loadBoardData(projectId: number): void {
    this.isLoading.set(true);

    // Fetch project metadata
    this.projectService.getProjectById(projectId).subscribe({
      next: (projRes) => {
        if (projRes.success) {
          this.project.set(projRes.data);

          // In parallel, load tasks + members + global users
          this.loadTasks(projectId);
          this.loadProjectMembers(projectId);
          this.loadGlobalUsers();
        } else {
          this.isLoading.set(false);
        }
      },
      error: () => this.isLoading.set(false)
    });
  }

  /**
   * Fetches ALL tasks for the project and distributes them into the
   * three swimlane signal arrays.
   */
  private loadTasks(projectId: number): void {
    this.taskService.getTasks(projectId).subscribe({
      next: (taskRes) => {
        if (taskRes.success) {
          this.sortTasks(taskRes.data);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  /**
   * Calls GET api/projects/{id}/members to populate the assignee dropdown.
   * This is a dedicated live call — NOT reliant on project().members —
   * so every browser always sees the latest member list including newly added users.
   */
  private loadProjectMembers(projectId: number): void {
    this.isMembersLoading.set(true);
    this.projectService.getProjectMembers(projectId).subscribe({
      next: (res) => {
        if (res.success) {
          this.projectMembers.set(res.data);
        }
        this.isMembersLoading.set(false);
      },
      error: () => this.isMembersLoading.set(false)
    });
  }

  /**
   * Fetches ALL registered users in the database to populate the assignee dropdown.
   */
  private loadGlobalUsers(): void {
    this.isMembersLoading.set(true);
    this.auth.getUsers().subscribe({
      next: (res) => {
        if (res.success) {
          this.globalUsers.set(res.data);
        }
        this.isMembersLoading.set(false);
      },
      error: () => this.isMembersLoading.set(false)
    });
  }

  sortTasks(tasks: TaskItem[]): void {
    this.todoTasks.set(tasks.filter(t => t.status === 'ToDo'));
    this.inProgressTasks.set(tasks.filter(t => t.status === 'InProgress'));
    this.doneTasks.set(tasks.filter(t => t.status === 'Done'));
  }

  // ── Permission Helpers ────────────────────────────────────────────────────

  /**
   * Returns true if the current authenticated user holds the 'Admin' role
   * for this specific project (i.e. they are the creator or have Admin in ProjectMembers).
   * Used to show/hide the delete button per the permission matrix.
   */
  currentUserIsAdmin(): boolean {
    const currentUserId = this.auth.currentUser()?.id;
    if (!currentUserId) return false;

    const project = this.project();
    if (!project) return false;

    // Fast-path: creator is always Admin
    if (project.createdByUserId === currentUserId) return true;

    // Check the live members list fetched from the API
    const memberEntry = this.projectMembers().find(m => m.userId === currentUserId);
    return memberEntry?.role === 'Admin';
  }

  /**
   * Contextual role label for the active project, used in the board header badge.
   * Returns 'Project Admin' or 'Team Member'.
   */
  currentUserRole(): string {
    return this.currentUserIsAdmin() ? 'Project Admin' : 'Team Member';
  }

  // ── Drag & Drop ───────────────────────────────────────────────────────────

  /**
   * CDK Drag & Drop handler.
   * ANY authenticated project member (Admin OR Member) can drag cards freely.
   * Implements optimistic UI: updates the signal arrays immediately, then
   * persists to the backend. Rolls back on server error.
   */
  onDrop(event: CdkDragDrop<TaskItem[]>, targetStatus: 'ToDo' | 'InProgress' | 'Done'): void {
    if (event.previousContainer === event.container) {
      // Reorder within same column — purely cosmetic, no API call needed
      const list = [...event.container.data];
      moveItemInArray(list, event.previousIndex, event.currentIndex);
      this.setSignalByStatus(targetStatus, list);
    } else {
      const sourceList = [...event.previousContainer.data];
      const targetList = [...event.container.data];
      const task = event.item.data as TaskItem;
      const previousStatus = task.status;

      // Optimistically transfer card in the UI
      transferArrayItem(
        sourceList,
        targetList,
        event.previousIndex,
        event.currentIndex
      );

      // Mutate task status locally so card renders correctly
      task.status = targetStatus;

      // Update both signals with new array references
      this.setSignalByStatus(previousStatus, sourceList);
      this.setSignalByStatus(targetStatus, targetList);

      // 2. Persist status change to the backend
      this.taskService.updateTaskStatus(task.id, targetStatus).subscribe({
        next: (res) => {
          if (!res.success) {
            // Revert optimistic update on logical failure
            this.loadBoardData(this.project()!.id);
            this.notification.showError('Could not update task status. Changes reverted.');
          }
        },
        error: () => {
          // Revert on HTTP error
          this.loadBoardData(this.project()!.id);
          this.notification.showError('Network error — task status reverted.');
        }
      });
    }
  }

  private setSignalByStatus(status: 'ToDo' | 'InProgress' | 'Done', list: TaskItem[]): void {
    if (status === 'ToDo') this.todoTasks.set(list);
    else if (status === 'InProgress') this.inProgressTasks.set(list);
    else if (status === 'Done') this.doneTasks.set(list);
  }

  // ── Modal Controls ────────────────────────────────────────────────────────

  openCreateModal(): void {
    this.editingTask.set(null);
    this.taskForm.reset({
      priority: 'Medium',
      status: 'ToDo',
      assignedToUserId: null
    });
    this.showModal.set(true);
  }

  openEditModal(task: TaskItem): void {
    this.editingTask.set(task);

    // Format date string for HTML date input: YYYY-MM-DD
    const date = new Date(task.dueDate);
    const dateFormatted = date.toISOString().split('T')[0];

    this.taskForm.reset({
      title: task.title,
      description: task.description,
      dueDate: dateFormatted,
      priority: task.priority,
      status: task.status,
      assignedToUserId: task.assignedToUserId ?? null
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingTask.set(null);
    this.isSubmitting.set(false);
  }

  onOverlayClick(event: MouseEvent): void {
    // Close modal when clicking the dark overlay (not the modal card itself)
    this.closeModal();
  }

  onSubmitTask(): void {
    const project = this.project();
    if (this.taskForm.invalid || !project || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const values = { ...this.taskForm.value };
    values.projectId = project.id;

    // Normalize null — HTML select returns the string "null" for [value]="null"
    if (values.assignedToUserId === 'null' || values.assignedToUserId === '' || values.assignedToUserId === null) {
      values.assignedToUserId = null;
    } else {
      values.assignedToUserId = parseInt(values.assignedToUserId, 10);
    }

    const editTask = this.editingTask();
    if (editTask) {
      // Update existing task
      this.taskService.updateTask(editTask.id, values).subscribe({
        next: (res) => {
          if (res.success) {
            this.loadBoardData(project.id);
            this.closeModal();
            this.notification.showSuccess('Task updated successfully.');
          } else {
            this.isSubmitting.set(false);
          }
        },
        error: () => this.isSubmitting.set(false)
      });
    } else {
      // Create new task
      this.taskService.createTask(values).subscribe({
        next: (res) => {
          if (res.success) {
            this.loadBoardData(project.id);
            this.closeModal();
            this.notification.showSuccess('Task created successfully.');
          } else {
            this.isSubmitting.set(false);
          }
        },
        error: () => this.isSubmitting.set(false)
      });
    }
  }

  // ── Delete Task Flow ──────────────────────────────────────────────────────

  triggerDelete(task: TaskItem): void {
    this.taskToDelete.set(task);
    this.showDeleteConfirm.set(true);
  }

  onConfirmDelete(): void {
    const task = this.taskToDelete();
    if (!task) return;

    this.taskService.deleteTask(task.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.loadBoardData(this.project()!.id);
          this.notification.showSuccess('Task deleted successfully.');
        }
        this.onCancelDelete();
      },
      error: () => this.onCancelDelete()
    });
  }

  onCancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.taskToDelete.set(null);
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
}
