import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { ApiService } from './api.service';

interface AuthResponse {
  access_token: string;
  token_type: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private apiService: ApiService, private router: Router) { }

  private hasToken(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  login(credentials: any): Observable<AuthResponse> {
    // The login endpoint expects FormData
    return this.apiService.post('auth/login', credentials, true).pipe(
      tap(response => {
        localStorage.setItem('accessToken', response.access_token);
        this.isAuthenticatedSubject.next(true);
        this.router.navigate(['/home']);
      })
    );
  }

  register(userData: any): Observable<any> {
    return this.apiService.post('auth/register', userData).pipe(
      tap(() => {
        this.router.navigate(['/login']);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }
}
