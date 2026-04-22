import { Component, inject } from '@angular/core';
import { AuthService } from './services/auth.service';
import { KanbanBoardComponent } from './components/kanban-board/kanban-board.component';
import { LoginComponent } from './components/login/login.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [KanbanBoardComponent, LoginComponent],
  template: `
    @if (auth.isLoggedIn()) {
      <app-kanban-board />
    } @else {
      <app-login (loggedIn)="auth.isLoggedIn.set(true)" />
    }
  `,
})
export class AppComponent {
  auth = inject(AuthService);
}
