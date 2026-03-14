import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../enviroment';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = `${environment.apiUrl}`;
  private tokenKey = 'token';
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.loadUserFromToken();
  }

  login(data: any): Observable<any> {
    return this.http.post<{ token: string; user: User }>(`${this.apiUrl}/auth/login`, data)
      .pipe(
        tap(response => {
          this.saveToken(response.token);
          this.userSubject.next(response.user);
        })
      );
  }


  // Add token for protected routes
  private authHeaders() {
    const token = this.getToken();
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  getAdmins() {
    return this.http.get(`${this.apiUrl}/admins`, this.authHeaders());
  }

  createAdmin(data: any) {
    return this.http.post(`${this.apiUrl}/admins`, data, this.authHeaders());
  }

  updateAdmin(id: string, data: any) {
    return this.http.put(`${this.apiUrl}/admins/${id}`, data, this.authHeaders());
  }

  deleteAdmin(id: string) {
    return this.http.delete(`${this.apiUrl}/admins/${id}`, this.authHeaders());
  }

  saveToken(token: string) {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  private loadUserFromToken(): void {
    const token = this.getToken();
    if (!token) return;
    try {
      const payload: any = JSON.parse(atob(token.split('.')[1]));
      const user: User = {
        id: payload.id,
        name: payload.name,
        email: payload.email,
        role: payload.role
      };
      this.userSubject.next(user);
    } catch (e) {
      console.error('Invalid token', e);
      this.logout();
    }
  }
}