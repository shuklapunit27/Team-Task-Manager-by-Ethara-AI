import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, Project, ProjectMember } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://team-task-manager-by-ethara-ai-production.up.railway.app/api/projects';

  getProjects(): Observable<ApiResponse<Project[]>> {
    return this.http.get<ApiResponse<Project[]>>(this.apiUrl);
  }

  getProjectById(id: number): Observable<ApiResponse<Project>> {
    return this.http.get<ApiResponse<Project>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Fetches the live, up-to-date member list for a given project.
   * Used by the Kanban board assignee dropdown to always reflect all
   * members across every logged-in browser session without hardcoding.
   */
  getProjectMembers(id: number): Observable<ApiResponse<ProjectMember[]>> {
    return this.http.get<ApiResponse<ProjectMember[]>>(`${this.apiUrl}/${id}/members`);
  }

  createProject(name: string, description?: string): Observable<ApiResponse<Project>> {
    return this.http.post<ApiResponse<Project>>(this.apiUrl, { name, description });
  }

  updateProject(id: number, name: string, description?: string): Observable<ApiResponse<Project>> {
    return this.http.put<ApiResponse<Project>>(`${this.apiUrl}/${id}`, { name, description });
  }

  deleteProject(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }

  addMember(projectId: number, email: string, role: 'Admin' | 'Member'): Observable<ApiResponse<Project>> {
    return this.http.post<ApiResponse<Project>>(`${this.apiUrl}/${projectId}/members`, { email, role });
  }

  removeMember(projectId: number, memberUserId: number): Observable<ApiResponse<Project>> {
    return this.http.delete<ApiResponse<Project>>(`${this.apiUrl}/${projectId}/members/${memberUserId}`);
  }
}

