import { Component, computed, inject, output, signal } from '@angular/core';
import { TaskService } from '../../services/task.service';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-add-task-modal',
  standalone: true,
  template: `
    <div class="modal-overlay" (click)="closed.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>New Task</h2>
          <button class="close-btn" (click)="closed.emit()">×</button>
        </div>

        <form class="modal-form" (submit)="onSubmit($event)">
          <div class="form-group">
            <label>Title *</label>
            <input
              type="text"
              [value]="title()"
              (input)="title.set($any($event.target).value)"
              placeholder="What needs to be done?"
              required
            />
          </div>

          <div class="form-group">
            <label>Description</label>
            <textarea
              [value]="description()"
              (input)="description.set($any($event.target).value)"
              rows="3"
              placeholder="Optional details..."
            ></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Complexity: <strong>{{ complexity() }}</strong>/10</label>
              <input
                type="range" min="1" max="10"
                [value]="complexity()"
                (input)="complexity.set(+$any($event.target).value)"
              />
            </div>
            <div class="form-group">
              <label>Urgency: <strong>{{ urgency() }}</strong>/10</label>
              <input
                type="range" min="1" max="10"
                [value]="urgency()"
                (input)="urgency.set(+$any($event.target).value)"
              />
            </div>
          </div>

          <div class="score-preview">
            <span class="preview-label">Estimated Priority Score</span>
            <span class="preview-value">{{ estimatedScore() }}</span>
            <span class="preview-formula">
              = ({{ complexity() }} &times; 0.4) + ({{ urgency() }} &times; 0.6)
            </span>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-cancel" (click)="closed.emit()">Cancel</button>
            <button type="submit" class="btn-submit" [disabled]="submitting() || !title().trim()">
              @if (submitting()) { Creating... } @else { Create Task }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed; inset: 0;
      background: rgba(0, 0, 0, 0.55);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000;
      padding: 16px;
    }
    .modal {
      background: #fff;
      border-radius: 12px;
      width: 100%; max-width: 480px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
      overflow: hidden;
    }
    .modal-header {
      background: linear-gradient(135deg, #2d5016, #4a7c3b);
      padding: 16px 20px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .modal-header h2 { color: #fff; margin: 0; font-size: 18px; }
    .close-btn {
      background: none; border: none; color: rgba(255,255,255,0.7);
      font-size: 24px; cursor: pointer; padding: 0; line-height: 1;
      &:hover { color: #fff; }
    }
    .modal-form { padding: 20px; }
    .form-group { margin-bottom: 16px; }
    .form-group label {
      display: block; font-size: 13px; font-weight: 600;
      color: #374151; margin-bottom: 6px;
    }
    .form-group input[type="text"],
    .form-group textarea {
      width: 100%; padding: 8px 12px;
      border: 1.5px solid #d1d5db; border-radius: 6px;
      font-size: 14px; box-sizing: border-box;
      transition: border-color 0.2s;
      font-family: inherit;
      &:focus { outline: none; border-color: #4a7c3b; }
    }
    .form-group input[type="range"] { width: 100%; accent-color: #4a7c3b; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .score-preview {
      background: linear-gradient(135deg, #f0f9e8, #e8f5e1);
      border: 1px solid #c3e6a0; border-radius: 8px;
      padding: 12px 16px; margin-bottom: 20px;
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      text-align: center;
    }
    .preview-label { font-size: 11px; color: #4a7c3b; text-transform: uppercase; letter-spacing: 0.6px; }
    .preview-value { font-size: 32px; font-weight: 800; color: #2d5016; }
    .preview-formula { font-size: 12px; color: #6b7280; }
    .modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
    .btn-cancel {
      padding: 8px 20px; border: 1.5px solid #d1d5db; border-radius: 6px;
      background: #fff; color: #374151; cursor: pointer; font-size: 14px;
      &:hover { border-color: #9ca3af; }
    }
    .btn-submit {
      padding: 8px 20px; border: none; border-radius: 6px;
      background: linear-gradient(135deg, #4a7c3b, #2d5016);
      color: #fff; cursor: pointer; font-size: 14px; font-weight: 600;
      transition: opacity 0.2s;
      &:disabled { opacity: 0.6; cursor: not-allowed; }
      &:not(:disabled):hover { opacity: 0.9; }
    }
  `],
})
export class AddTaskModalComponent {
  private taskService = inject(TaskService);

  taskCreated = output<Task>();
  closed      = output<void>();

  title       = signal('');
  description = signal('');
  complexity  = signal(5);
  urgency     = signal(5);
  submitting  = signal(false);

  estimatedScore = computed(() =>
    ((this.complexity() * 0.4) + (this.urgency() * 0.6)).toFixed(1)
  );

  onSubmit(event: Event): void {
    event.preventDefault();
    if (!this.title().trim() || this.submitting()) return;

    this.submitting.set(true);

    this.taskService.createTask({
      title:       this.title().trim(),
      description: this.description().trim() || undefined,
      complexity:  this.complexity(),
      urgency:     this.urgency(),
      status:      'todo',
    }).subscribe({
      next: task => {
        this.taskCreated.emit(task);
        this.submitting.set(false);
      },
      error: () => this.submitting.set(false),
    });
  }
}
