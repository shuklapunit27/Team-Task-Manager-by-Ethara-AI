import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TaskService } from '../../core/services/task.service';
import { TaskDashboard, TaskItem } from '../../core/models';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonLoaderComponent],
  template: `
    <div class="dashboard-viewport">
      
      <!-- Loading Skeleton Layout -->
      <div *ngIf="isLoading()" class="skeleton-grid">
        <div class="kpi-row">
          <app-skeleton-loader type="card" height="120px" *ngFor="let i of [1,2,3,4]"></app-skeleton-loader>
        </div>
        <div class="charts-row">
          <app-skeleton-loader type="card" height="320px"></app-skeleton-loader>
          <app-skeleton-loader type="card" height="320px"></app-skeleton-loader>
        </div>
        <div class="lists-row">
          <app-skeleton-loader type="card" height="380px"></app-skeleton-loader>
        </div>
      </div>

      <!-- Real Analytical Dashboard -->
      <div *ngIf="!isLoading()" class="dashboard-content">
        <!-- 1. KPI Counter Row -->
        <div class="kpi-row">
          <div class="glass-card kpi-card">
            <div class="kpi-header">
              <span class="kpi-title">Total Tasks</span>
              <span class="material-icons-round kpi-icon">task</span>
            </div>
            <div class="kpi-value">{{ dashboard()?.totalTasks }}</div>
            <div class="kpi-footer">Across active workspaces</div>
          </div>

          <div class="glass-card kpi-card success-kpi">
            <div class="kpi-header">
              <span class="kpi-title">Completed Tasks</span>
              <span class="material-icons-round kpi-icon">check_circle</span>
            </div>
            <div class="kpi-value">{{ dashboard()?.completedTasks }}</div>
            <div class="kpi-footer progress-bar-footer">
              <div class="mini-progress-track">
                <div class="mini-progress-fill" [style.width]="dashboard()?.completionRate + '%'"></div>
              </div>
              <span class="percentage">{{ dashboard()?.completionRate }}% Done</span>
            </div>
          </div>

          <div class="glass-card kpi-card danger-kpi">
            <div class="kpi-header">
              <span class="kpi-title">Overdue Tasks</span>
              <span class="material-icons-round kpi-icon">warning</span>
            </div>
            <div class="kpi-value glow-val">{{ dashboard()?.overdueTasks }}</div>
            <div class="kpi-footer">Requires immediate attention</div>
          </div>

          <div class="glass-card kpi-card accent-kpi">
            <div class="kpi-header">
              <span class="kpi-title">Task Completion Rate</span>
              <span class="material-icons-round kpi-icon">speed</span>
            </div>
            <div class="kpi-value">{{ dashboard()?.completionRate }}%</div>
            <div class="kpi-footer">High productivity index</div>
          </div>
        </div>

        <!-- 2. High-End Analytical Metrics & Charts -->
        <div class="charts-row">
          <!-- Status Distribution Card -->
          <div class="glass-card chart-card">
            <div class="card-title">
              <span class="material-icons-round">donut_large</span>
              <h3>Task Status Breakdown</h3>
            </div>
            <div class="metric-list">
              <div *ngFor="let metric of dashboard()?.statusMetrics" class="metric-item">
                <div class="metric-info">
                  <span class="metric-label">{{ metric.label === 'ToDo' ? 'To Do' : metric.label === 'InProgress' ? 'In Progress' : 'Completed' }}</span>
                  <span class="metric-count">{{ metric.count }} ({{ metric.percentage }}%)</span>
                </div>
                <div class="progress-track">
                  <div [class]="'progress-fill status-' + metric.label.toLowerCase()" 
                       [style.width]="metric.percentage + '%'"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Priority Distribution Card -->
          <div class="glass-card chart-card">
            <div class="card-title">
              <span class="material-icons-round">bar_chart</span>
              <h3>Task Priority Breakdown</h3>
            </div>
            <div class="metric-list">
              <div *ngFor="let metric of dashboard()?.priorityMetrics" class="metric-item">
                <div class="metric-info">
                  <span class="metric-label">{{ metric.label }} Priority</span>
                  <span class="metric-count">{{ metric.count }} ({{ metric.percentage }}%)</span>
                </div>
                <div class="progress-track">
                  <div [class]="'progress-fill priority-' + metric.label.toLowerCase()" 
                       [style.width]="metric.percentage + '%'"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Overdue Indicators & Recent Activity Section -->
        <div class="lists-row">
          <!-- Overdue Panel -->
          <div class="glass-card list-card danger-outline">
            <div class="card-title text-danger">
              <span class="material-icons-round">alarm_on</span>
              <h3>Critical Overdue Tasks</h3>
            </div>
            
            <div *ngIf="dashboard()?.overdueTaskList?.length === 0" class="empty-state">
              <span class="material-icons-round empty-icon">done_all</span>
              <p>Excellent! No overdue tasks.</p>
            </div>

            <div *ngIf="dashboard()?.overdueTaskList?.length !== 0" class="task-activity-list">
              <div *ngFor="let task of dashboard()?.overdueTaskList" class="activity-item">
                <div class="activity-left">
                  <span class="material-icons-round alert-icon">error_outline</span>
                  <div class="activity-text">
                    <a [routerLink]="['/projects', task.projectId, 'kanban']" class="task-title-link">{{ task.title }}</a>
                    <span class="project-tag">{{ task.projectName }}</span>
                  </div>
                </div>
                <div class="activity-right">
                  <span class="due-date text-danger">Due {{ formatDate(task.dueDate) }}</span>
                  <span class="badge priority-high">High Priority</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Activity Panel -->
          <div class="glass-card list-card">
            <div class="card-title">
              <span class="material-icons-round">history</span>
              <h3>Recent Workspace Updates</h3>
            </div>

            <div *ngIf="dashboard()?.recentActivity?.length === 0" class="empty-state">
              <span class="material-icons-round empty-icon">analytics</span>
              <p>No recent activity. Create tasks to begin orchestration.</p>
            </div>

            <div *ngIf="dashboard()?.recentActivity?.length !== 0" class="task-activity-list">
              <div *ngFor="let task of dashboard()?.recentActivity" class="activity-item">
                <div class="activity-left">
                  <span class="material-icons-round activity-icon">assignment</span>
                  <div class="activity-text">
                    <a [routerLink]="['/projects', task.projectId, 'kanban']" class="task-title-link">{{ task.title }}</a>
                    <span class="update-info">Updated on {{ formatDate(task.updatedAt) }}</span>
                  </div>
                </div>
                <div class="activity-right">
                  <span [class]="'badge status-' + task.status.toLowerCase()">{{ task.status === 'ToDo' ? 'To Do' : task.status === 'InProgress' ? 'In Progress' : 'Done' }}</span>
                  <span class="assignee-avatar" [title]="task.assignedToUserName ?? 'Unassigned'">
                    {{ task.assignedToUserName ? task.assignedToUserName.slice(0,2).toUpperCase() : '?' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .dashboard-viewport {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    // Grid Structures
    .skeleton-grid, .dashboard-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .kpi-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
    }

    .charts-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
      gap: 20px;
    }

    .lists-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
      gap: 20px;
    }

    // KPI Cards
    .kpi-card {
      background-color: var(--bg-obsidian-dark);
      border: 1px solid var(--glass-border);
      padding: 24px;
      
      &:hover {
        border-color: rgba(255, 51, 51, 0.3);
      }

      .kpi-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: var(--color-text-secondary);
        font-size: 0.85rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .kpi-icon {
        font-size: 20px;
        color: var(--color-text-secondary);
      }

      .kpi-value {
        font-size: 2.25rem;
        font-family: var(--font-heading);
        font-weight: 800;
        margin: 12px 0 6px 0;
        color: #FFFFFF;
      }

      .kpi-footer {
        font-size: 0.75rem;
        color: var(--color-text-muted);
      }
    }

    .success-kpi {
      .kpi-icon { color: #22C55E; }
      .progress-bar-footer {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 8px;
      }
      .mini-progress-track {
        flex: 1;
        height: 4px;
        background-color: var(--bg-obsidian-light);
        border-radius: 2px;
        overflow: hidden;
      }
      .mini-progress-fill {
        height: 100%;
        background-color: #22C55E;
      }
      .percentage {
        font-size: 0.75rem;
        color: #22C55E;
        font-weight: 600;
      }
    }

    .danger-kpi {
      border: 1px solid rgba(239, 68, 68, 0.2);
      .kpi-icon { color: #EF4444; }
      .glow-val {
        color: #EF4444;
        text-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
      }
    }

    .accent-kpi {
      .kpi-icon { color: var(--color-accent); }
      .kpi-value { color: var(--color-accent); }
    }

    // Chart & Metric Cards
    .chart-card {
      background-color: var(--bg-obsidian-dark);
      padding: 24px;
    }

    .card-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
      border-bottom: 1px solid var(--glass-border);
      padding-bottom: 12px;

      span {
        color: var(--color-primary);
      }

      h3 {
        font-size: 1.1rem;
        font-weight: 700;
        color: #FFFFFF;
      }

      &.text-danger {
        span { color: #EF4444; }
        border-bottom-color: rgba(239, 68, 68, 0.2);
      }
    }

    .metric-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .metric-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .metric-info {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      font-weight: 500;
      
      .metric-label { color: #FFFFFF; }
      .metric-count { color: var(--color-text-secondary); }
    }

    .progress-track {
      height: 6px;
      background-color: var(--bg-obsidian-medium);
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 1s ease-in-out;

      &.status-todo { background-color: #64748B; }
      &.status-inprogress { background-color: var(--color-accent); }
      &.status-done { background-color: #22C55E; }
      
      &.priority-low { background-color: #3B82F6; }
      &.priority-medium { background-color: #EAB308; }
      &.priority-high { background-color: #EF4444; }
    }

    // List Cards
    .list-card {
      background-color: var(--bg-obsidian-dark);
      padding: 24px;
    }

    .danger-outline {
      border: 1px solid rgba(239, 68, 68, 0.15);
      &:hover {
        border-color: rgba(239, 68, 68, 0.35);
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.6), 0 0 15px rgba(239, 68, 68, 0.15);
      }
    }

    .task-activity-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 280px;
      overflow-y: auto;
    }

    .activity-item {
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
        transform: translateX(4px);
      }
    }

    .activity-left {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;

      .alert-icon {
        color: #EF4444;
      }

      .activity-icon {
        color: var(--color-primary);
      }
    }

    .activity-text {
      display: flex;
      flex-direction: column;
      min-width: 0;

      .task-title-link {
        font-size: 0.9rem;
        font-weight: 600;
        color: #FFFFFF;
        text-decoration: none;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;

        &:hover {
          color: var(--color-primary-hover);
          text-decoration: underline;
        }
      }

      .project-tag {
        font-size: 0.75rem;
        color: var(--color-accent);
        font-weight: 500;
      }

      .update-info {
        font-size: 0.75rem;
        color: var(--color-text-muted);
      }
    }

    .activity-right {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;

      .due-date {
        font-size: 0.8rem;
        font-weight: 500;
        
        &.text-danger { color: #FCA5A5; }
      }
    }

    .assignee-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--bg-obsidian-light);
      border: 1px solid var(--glass-border);
      color: #FFFFFF;
      font-size: 0.7rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: var(--color-text-secondary);
      text-align: center;
      gap: 12px;

      .empty-icon {
        font-size: 40px;
        color: var(--color-text-muted);
      }

      p {
        font-size: 0.9rem;
        font-weight: 500;
      }
    }

    @media (max-width: 992px) {
      .charts-row, .lists-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly taskService = inject(TaskService);

  readonly isLoading = signal<boolean>(true);
  readonly dashboard = signal<TaskDashboard | null>(null);

  ngOnInit(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.taskService.getDashboardAnalytics().subscribe({
      next: (res) => {
        if (res.success) {
          this.dashboard.set(res.data);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
}
