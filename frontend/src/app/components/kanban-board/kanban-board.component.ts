import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';
import { Task, TaskStatus } from '../../models/task.model';
import { TaskCardComponent } from '../task-card/task-card.component';
import { AddTaskModalComponent } from '../add-task-modal/add-task-modal.component';

interface Column {
  id: TaskStatus;
  title: string;
  colorClass: string;
}

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [DragDropModule, TaskCardComponent, AddTaskModalComponent],
  template: `
    <div class="board-wrapper">
      <header class="board-header">
        <div class="header-text">
          <h1>Task Kanban</h1>
          <p class="formula">
            Score = (Complexity &times; 0.4) + (Urgency &times; 0.6) &mdash; auto-calculado por el backend
          </p>
        </div>
        <div class="header-stats">
          <span class="stat">{{ totalTasks() }} tasks &bull; avg score {{ averageScore() }}</span>
          <button class="new-task-btn" (click)="showModal.set(true)">+ New Task</button>
          <button class="logout-btn" (click)="authService.logout()">Logout</button>
        </div>
      </header>

      @if (error()) {
        <div class="error-banner">
          Failed to load tasks. Make sure you are logged in and the backend is running on port 8000.
        </div>
      }

      <div class="kanban-board">
        @for (col of columns; track col.id) {
          <div class="kanban-column" [class]="col.colorClass">
            <div class="column-header">
              <h2 class="column-title">{{ col.title }}</h2>
              <span class="column-count">{{ getColumnTasks(col.id).length }}</span>
            </div>

            <div
              class="task-drop-zone"
              cdkDropList
              [id]="col.id"
              [cdkDropListData]="getColumnTasks(col.id)"
              [cdkDropListConnectedTo]="connectedIds"
              (cdkDropListDropped)="onDrop($event, col.id)"
            >
              @if (loading()) {
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
              } @else {
                @for (task of getColumnTasks(col.id); track task.id) {
                  <div cdkDrag [cdkDragData]="task" class="drag-wrapper">
                    <app-task-card
                      [task]="task"
                      (deleted)="onDelete($event)"
                    />
                    <div *cdkDragPlaceholder class="drag-placeholder"></div>
                  </div>
                } @empty {
                  <div class="empty-state">Drop tasks here</div>
                }
              }
            </div>
          </div>
        }
      </div>

      @if (showModal()) {
        <app-add-task-modal
          (taskCreated)="onTaskCreated($event)"
          (closed)="showModal.set(false)"
        />
      }
    </div>
  `,
  styleUrl: './kanban-board.component.scss',
})
export class KanbanBoardComponent implements OnInit {
  private taskService = inject(TaskService);
  authService         = inject(AuthService);

  tasks     = signal<Task[]>([]);
  loading   = signal(true);
  error     = signal(false);
  showModal = signal(false);

  readonly columns: Column[] = [
    { id: 'todo',        title: 'To Do',      colorClass: 'col-todo' },
    { id: 'in_progress', title: 'In Progress', colorClass: 'col-progress' },
    { id: 'done',        title: 'Done',        colorClass: 'col-done' },
  ];

  readonly connectedIds = this.columns.map(c => c.id);

  totalTasks   = computed(() => this.tasks().length);
  averageScore = computed(() => {
    const all = this.tasks();
    if (!all.length) return '0.0';
    const avg = all.reduce((sum, t) => sum + t.priority_score, 0) / all.length;
    return avg.toFixed(1);
  });

  ngOnInit(): void {
    this.loadTasks();
  }

  getColumnTasks(status: TaskStatus): Task[] {
    return this.tasks().filter(t => t.status === status);
  }

  loadTasks(): void {
    this.loading.set(true);
    this.error.set(false);

    this.taskService.getTasks().subscribe({
      next: tasks => {
        this.tasks.set(tasks);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  onDrop(event: CdkDragDrop<Task[]>, newStatus: TaskStatus): void {
    if (event.previousContainer === event.container) return;

    const task: Task = event.item.data;
    if (task.status === newStatus) return;

    // Optimistic update for instant UI feedback
    this.tasks.update(list =>
      list.map(t => t.id === task.id ? { ...t, status: newStatus } : t)
    );

    // Backend sync — TaskObserver recalculates priority_score automatically
    this.taskService.updateTask(task.id, { status: newStatus }).subscribe({
      next: updated => {
        this.tasks.update(list =>
          list.map(t => t.id === updated.id ? updated : t)
        );
      },
      error: () => {
        // Revert on failure
        this.tasks.update(list =>
          list.map(t => t.id === task.id ? { ...t, status: task.status } : t)
        );
      },
    });
  }

  onTaskCreated(task: Task): void {
    this.tasks.update(list => [...list, task]);
    this.showModal.set(false);
  }

  onDelete(id: number): void {
    this.taskService.deleteTask(id).subscribe(() => {
      this.tasks.update(list => list.filter(t => t.id !== id));
    });
  }
}
