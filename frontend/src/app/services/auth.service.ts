import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../../enviroments/environment';

interface AuthResponse {
  token: string;
  user: { id: number; name: string; email: string };
}

interface AuthPayload {
  email: string;
  password: string;
  name?: string;
  password_confirmation?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http   = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly key    = environment.storageKey;

  isLoggedIn = signal(!!localStorage.getItem(this.key));

  getToken(): string | null {
    return localStorage.getItem(this.key);
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(res => this.storeToken(res.token)),
    );
  }

  register(name: string, email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, {
      name,
      email,
      password,
      password_confirmation: password,
    }).pipe(tap(res => this.storeToken(res.token)));
  }

  logout(): void {
    this.http.post(`${this.apiUrl}/logout`, {}).subscribe({ error: () => {} });
    localStorage.removeItem(this.key);
    this.isLoggedIn.set(false);
  }

  private storeToken(token: string): void {
    localStorage.setItem(this.key, token);
    this.isLoggedIn.set(true);
  }
}
