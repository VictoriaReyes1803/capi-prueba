import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="auth-wrapper">
      <div class="auth-card">
        <div class="auth-logo">
          <div class="logo-icon">K</div>
          <h1>Task Kanban</h1>
          <p class="subtitle">Manage tasks with automated priority scoring</p>
        </div>

        <div class="tab-bar">
          <button
            class="tab"
            [class.active]="mode() === 'login'"
            (click)="mode.set('login')"
          >Sign In</button>
          <button
            class="tab"
            [class.active]="mode() === 'register'"
            (click)="mode.set('register')"
          >Register</button>
        </div>

        @if (error()) {
          <div class="alert error">{{ error() }}</div>
        }

        <form class="auth-form" (ngSubmit)="onSubmit()">
          @if (mode() === 'register') {
            <div class="form-group">
              <label>Full Name</label>
              <input
                type="text"
                [(ngModel)]="name"
                name="name"
                placeholder="Your name"
                required
              />
            </div>
          }

          <div class="form-group">
            <label>Email</label>
            <input
              type="email"
              [(ngModel)]="email"
              name="email"
              placeholder="you@example.com"
              required
            />
          </div>

          <div class="form-group">
            <label>Password</label>
            <input
              type="password"
              [(ngModel)]="password"
              name="password"
              placeholder="min. 8 characters"
              required
              minlength="8"
            />
          </div>

          <button type="submit" class="btn-submit" [disabled]="loading()">
            @if (loading()) { Loading... }
            @else if (mode() === 'login') { Sign In }
            @else { Create Account }
          </button>
        </form>

        <p class="hint">
          Score = (Complexity &times; 0.4) + (Urgency &times; 0.6)
          &mdash; auto-calculated by the backend observer
        </p>
      </div>
    </div>
  `,
  styles: [`
    .auth-wrapper {
      min-height: 100vh;
      background: linear-gradient(160deg, #1a3009 0%, #2d5016 40%, #3d6b22 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .auth-card {
      background: #fff;
      border-radius: 16px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.4);
      overflow: hidden;
    }

    .auth-logo {
      background: linear-gradient(135deg, #2d5016, #4a7c3b);
      padding: 32px 24px 24px;
      text-align: center;
    }

    .logo-icon {
      width: 56px;
      height: 56px;
      background: rgba(255,255,255,0.2);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: 900;
      color: #fff;
      margin: 0 auto 12px;
    }

    .auth-logo h1 {
      color: #fff;
      margin: 0 0 4px;
      font-size: 22px;
      font-weight: 800;
    }

    .subtitle {
      color: rgba(255,255,255,0.65);
      margin: 0;
      font-size: 12px;
    }

    .tab-bar {
      display: flex;
      border-bottom: 1px solid #e5e7eb;
    }

    .tab {
      flex: 1;
      padding: 14px;
      border: none;
      background: none;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      color: #9ca3af;
      transition: color 0.2s, box-shadow 0.2s;

      &.active {
        color: #2d5016;
        box-shadow: inset 0 -2px 0 #2d5016;
      }
    }

    .alert.error {
      margin: 16px 24px 0;
      padding: 10px 14px;
      background: #fee2e2;
      color: #991b1b;
      border-radius: 6px;
      font-size: 13px;
      border-left: 3px solid #ef4444;
    }

    .auth-form {
      padding: 24px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 6px;
    }

    .form-group input {
      width: 100%;
      padding: 10px 12px;
      border: 1.5px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      box-sizing: border-box;
      font-family: inherit;
      transition: border-color 0.2s;

      &:focus {
        outline: none;
        border-color: #4a7c3b;
        box-shadow: 0 0 0 3px rgba(74,124,59,0.1);
      }
    }

    .btn-submit {
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: 8px;
      background: linear-gradient(135deg, #4a7c3b, #2d5016);
      color: #fff;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      transition: opacity 0.2s;
      margin-top: 4px;

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      &:not(:disabled):hover {
        opacity: 0.9;
      }
    }

    .hint {
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
      padding: 0 24px 20px;
      margin: 0;
    }
  `],
})
export class LoginComponent {
  loggedIn = output<void>();

  private auth = inject(AuthService);

  mode     = signal<'login' | 'register'>('login');
  loading  = signal(false);
  error    = signal('');

  name     = '';
  email    = '';
  password = '';

  onSubmit(): void {
    this.error.set('');
    if (!this.email || !this.password) return;
    this.loading.set(true);

    const req$ = this.mode() === 'login'
      ? this.auth.login(this.email, this.password)
      : this.auth.register(this.name, this.email, this.password);

    req$.subscribe({
      next: () => {
        this.loading.set(false);
        this.loggedIn.emit();
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.messages?.email?.[0]
          ?? err?.error?.message
          ?? 'Authentication failed. Please try again.';
        this.error.set(msg);
      },
    });
  }
}
