import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateTaskDto, Task, UpdateTaskDto } from '../models/task.model';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8000/api';

  getTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.apiUrl}/tasks`);
  }

  createTask(dto: CreateTaskDto): Observable<Task> {
    return this.http.post<Task>(`${this.apiUrl}/tasks`, dto);
  }

  updateTask(id: number, dto: UpdateTaskDto): Observable<Task> {
    return this.http.put<Task>(`${this.apiUrl}/tasks/${id}`, dto);
  }

  deleteTask(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tasks/${id}`);
  }
}
