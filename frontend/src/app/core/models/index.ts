export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export interface ProjectMember {
  userId: number;
  userName: string;
  userEmail: string;
  role: 'Admin' | 'Member';
  joinedAt: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  createdByUserId: number;
  createdByUserName: string;
  createdAt: string;
  members: ProjectMember[];
}

export interface TaskItem {
  id: number;
  title: string;
  description?: string;
  dueDate: string;
  status: 'ToDo' | 'InProgress' | 'Done';
  priority: 'Low' | 'Medium' | 'High';
  projectId: number;
  projectName: string;
  assignedToUserId?: number;
  assignedToUserName?: string;
  assignedToUserEmail?: string;
  createdByUserId: number;
  createdByUserName: string;
  createdAt: string;
  updatedAt: string;
  isOverdue?: boolean;
}

export interface MetricGroup {
  label: string;
  count: number;
  percentage: number;
}

export interface TaskDashboard {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionRate: number;
  statusMetrics: MetricGroup[];
  priorityMetrics: MetricGroup[];
  recentActivity: TaskItem[];
  overdueTaskList: TaskItem[];
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: string[];
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UserResponse {
  id: number;
  name: string;
  email: string;
}

