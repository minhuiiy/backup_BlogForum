import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const ADMIN_API = '/api/v1/admin/';

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private http: HttpClient) {}

  // === USERS ===
  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(ADMIN_API + 'users');
  }
  updateUserRoles(userId: number, roles: string[]): Observable<any> {
    return this.http.put(ADMIN_API + 'users/' + userId + '/roles', { roles });
  }
  toggleUserLock(userId: number, isLocked: boolean): Observable<any> {
    return this.http.put(ADMIN_API + 'users/' + userId + '/lock', { locked: isLocked });
  }

  // === STATS ===
  getStats(): Observable<any> {
    return this.http.get<any>(ADMIN_API + 'stats');
  }

  // === POSTS ===
  getAllPosts(page = 0, size = 20): Observable<any> {
    return this.http.get<any>(`${ADMIN_API}posts?page=${page}&size=${size}`);
  }
  deletePost(id: number): Observable<any> {
    return this.http.delete(`${ADMIN_API}posts/${id}`);
  }
  approvePost(id: number): Observable<any> {
    return this.http.put(`${ADMIN_API}posts/${id}/approve`, {});
  }
  rejectPost(id: number): Observable<any> {
    return this.http.delete(`${ADMIN_API}posts/${id}/reject`);
  }

  // === COMMUNITIES ===
  getAllCommunities(): Observable<any[]> {
    return this.http.get<any[]>(ADMIN_API + 'communities');
  }
  deleteCommunity(id: number): Observable<any> {
    return this.http.delete(`${ADMIN_API}communities/${id}`);
  }
}
