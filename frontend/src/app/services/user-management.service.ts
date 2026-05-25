import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api/admin/users';

  public getUsers(delayMs?: number): Observable<{ users: User[] }> {
    let params = new HttpParams();
    if (delayMs !== undefined && delayMs > 0) {
      params = params.set('delay', delayMs.toString());
    }
    return this.http.get<{ users: User[] }>(this.apiUrl, { params });
  }

  public createUser(userData: Omit<User, 'id'> & { password?: string }): Observable<{ success: boolean; user: User }> {
    return this.http.post<{ success: boolean; user: User }>(this.apiUrl, userData);
  }

  public updateUser(id: number, userData: Partial<User> & { password?: string }): Observable<{ success: boolean; user: User }> {
    return this.http.put<{ success: boolean; user: User }>(`${this.apiUrl}/${id}`, userData);
  }

  public deleteUser(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`);
  }
}
