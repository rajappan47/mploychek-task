import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';

export interface User {
  id: number;
  username: string;
  role: 'Admin' | 'General User';
  fullName: string;
  email: string;
  designation: string;
  department: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private readonly apiUrl = 'http://localhost:3000/api/auth';

  // Signals for state management
  private currentUserSignal = signal<User | null>(null);
  
  // Public read-only signals
  public readonly currentUser = computed(() => this.currentUserSignal());
  public readonly isAuthenticated = computed(() => !!this.currentUserSignal());
  public readonly isAdmin = computed(() => this.currentUserSignal()?.role === 'Admin');

  constructor() {
    this.initializeSession();
  }

  private initializeSession(): void {
    const savedUser = localStorage.getItem('mploychek_user');
    const savedToken = localStorage.getItem('mploychek_token');
    
    if (savedUser && savedToken) {
      try {
        this.currentUserSignal.set(JSON.parse(savedUser));
      } catch (e) {
        this.clearSession();
      }
    }
  }

  public login(username: string, password: string, role: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.apiUrl + '/login', { username, password, role }).pipe(
      tap(response => {
        if (response.success && response.token) {
          localStorage.setItem('mploychek_token', response.token);
          localStorage.setItem('mploychek_user', JSON.stringify(response.user));
          this.currentUserSignal.set(response.user);
        }
      }),
      catchError(err => {
        return throwError(() => err.error?.error || 'Login failed. Please check your credentials.');
      })
    );
  }

  public logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  private clearSession(): void {
    localStorage.removeItem('mploychek_token');
    localStorage.removeItem('mploychek_user');
    this.currentUserSignal.set(null);
  }

  public refreshProfile(): Observable<{ profile: User }> {
    return this.http.get<{ profile: User }>('http://localhost:3000/api/users/profile').pipe(
      tap(res => {
        localStorage.setItem('mploychek_user', JSON.stringify(res.profile));
        this.currentUserSignal.set(res.profile);
      }),
      catchError(err => {
        this.logout();
        return throwError(() => err);
      })
    );
  }
}
