import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, TaskItem, TaskDashboard } from '../models';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:5000/api/tasks';

  getTasks(projectId?: number): Observable<ApiResponse<TaskItem[]>> {
    let params = new HttpParams();
    if (projectId !== undefined) {
      params = params.set('projectId', projectId.toString());
    }
    return this.http.get<ApiResponse<TaskItem[]>>(this.apiUrl, { params });
  }

  getTaskById(id: number): Observable<ApiResponse<TaskItem>> {
    return this.http.get<ApiResponse<TaskItem>>(`${this.apiUrl}/${id}`);
  }

  createTask(task: Partial<TaskItem>): Observable<ApiResponse<TaskItem>> {
    return this.http.post<ApiResponse<TaskItem>>(this.apiUrl, task);
  }

  updateTask(id: number, task: Partial<TaskItem>): Observable<ApiResponse<TaskItem>> {
    return this.http.put<ApiResponse<TaskItem>>(`${this.apiUrl}/${id}`, task);
  }

  deleteTask(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }

  updateTaskStatus(id: number, status: 'ToDo' | 'InProgress' | 'Done'): Observable<ApiResponse<TaskItem>> {
    return this.http.put<ApiResponse<TaskItem>>(`${this.apiUrl}/${id}/status`, { status });
  }

  assignTask(id: number, assignedToUserId?: number): Observable<ApiResponse<TaskItem>> {
    return this.http.put<ApiResponse<TaskItem>>(`${this.apiUrl}/${id}/assign`, { assignedToUserId });
  }

  getOverdueTasks(): Observable<ApiResponse<TaskItem[]>> {
    return this.http.get<ApiResponse<TaskItem[]>>(`${this.apiUrl}/overdue`);
  }

  getDashboardAnalytics(): Observable<ApiResponse<TaskDashboard>> {
    return this.http.get<ApiResponse<TaskDashboard>>(`${this.apiUrl}/dashboard`);
  }
}

