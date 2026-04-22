import { DecimalPipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="task-card" [class]="priorityClass()">
      <div class="task-header">
        <h3 class="task-title">{{ task().title }}</h3>
        <button class="delete-btn" (click)="deleted.emit(task().id)" title="Delete task">×</button>
      </div>

      @if (task().description) {
        <p class="task-description">{{ task().description }}</p>
      }

      <div class="task-metrics">
        <div class="metric">
          <span class="metric-label">Complexity</span>
          <span class="metric-value">{{ task().complexity }}/10</span>
        </div>
        <div class="metric">
          <span class="metric-label">Urgency</span>
          <span class="metric-value">{{ task().urgency }}/10</span>
        </div>
      </div>

      <div class="score-badge">
        <span class="score-label">Priority Score</span>
        <span class="score-value">{{ task().priority_score | number:'1.1-2' }}</span>
      </div>
    </div>
  `,
  styleUrl: './task-card.component.scss',
})
export class TaskCardComponent {
  task    = input.required<Task>();
  deleted = output<number>();

  priorityClass(): string {
    const score = this.task().priority_score;
    if (score >= 7) return 'priority-high';
    if (score >= 4) return 'priority-medium';
    return 'priority-low';
  }
}
