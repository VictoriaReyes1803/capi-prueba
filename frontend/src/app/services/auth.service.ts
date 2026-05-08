import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { environment } from '../../../enviroments/environment';

interface AuthResponse {
  user: { id: number; name: string; email: string };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http    = inject(HttpClient);
  private readonly apiUrl  = environment.apiUrl;
  private readonly baseUrl = environment.apiUrl.replace('/api', '');

  isLoggedIn = signal(false);

  /** Cookie-based auth — token is HttpOnly, JS has no access. */
  getToken(): null {
    return null;
  }

  /** Verifica si existe sesión activa consultando /api/user. */
  checkSession(): Observable<boolean> {
    return this.http
      .get<{ id: number }>(`${this.apiUrl}/user`, { withCredentials: true })
      .pipe(
        tap(() => this.isLoggedIn.set(true)),
        map(() => true),
        catchError(() => {
          this.isLoggedIn.set(false);
          return of(false);
        }),
      );
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .get(`${this.baseUrl}/sanctum/csrf-cookie`, { withCredentials: true })
      .pipe(
        switchMap(() =>
          this.http.post<AuthResponse>(
            `${this.apiUrl}/login`,
            { email, password },
            { withCredentials: true },
          ),
        ),
        tap(() => this.isLoggedIn.set(true)),
      );
  }

  register(name: string, email: string, password: string): Observable<AuthResponse> {
    return this.http
      .get(`${this.baseUrl}/sanctum/csrf-cookie`, { withCredentials: true })
      .pipe(
        switchMap(() =>
          this.http.post<AuthResponse>(
            `${this.apiUrl}/register`,
            { name, email, password, password_confirmation: password },
            { withCredentials: true },
          ),
        ),
        tap(() => this.isLoggedIn.set(true)),
      );
  }

  logout(): void {
    this.http
      .post(`${this.apiUrl}/logout`, {}, { withCredentials: true })
      .subscribe({ error: () => {} });
    this.isLoggedIn.set(false);
  }
}
