export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  id: number;
  title: string;
  description: string | null;
  complexity: number;
  urgency: number;
  priority_score: number;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  complexity: number;
  urgency: number;
  status: TaskStatus;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  complexity?: number;
  urgency?: number;
  status?: TaskStatus;
}
