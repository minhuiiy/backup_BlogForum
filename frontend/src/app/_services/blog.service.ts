import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_URL = '/api/v1/posts';

@Injectable({
  providedIn: 'root'
})
export class BlogService {
  constructor(private http: HttpClient) { }

  getAllPosts(): Observable<any> {
    return this.http.get(API_URL);
  }

  searchPosts(query: string): Observable<any> {
    return this.http.get(`${API_URL}/search?query=${query}`);
  }

  searchUsers(query: string): Observable<any> {
    return this.http.get(`/api/v1/users/search?q=${query}`);
  }

  getPostById(id: number): Observable<any> {
    return this.http.get(`${API_URL}/${id}`);
  }

  createPost(postData: any): Observable<any> {
    return this.http.post(API_URL, postData);
  }

  deletePost(id: number): Observable<any> {
    return this.http.delete(`${API_URL}/${id}`);
  }

  votePost(id: number): Observable<any> {
    return this.http.post(`${API_URL}/${id}/vote`, {});
  }

  getLikedPosts(): Observable<number[]> {
    return this.http.get<number[]>(`${API_URL}/liked`);
  }

  updatePost(postData: any): Observable<any> {
    return this.http.put(`${API_URL}/${postData.id}`, postData);
  }

  // ===== SAVE / BOOKMARK =====
  savePost(id: number): Observable<any> {
    return this.http.post(`${API_URL}/${id}/save`, {});
  }

  unsavePost(id: number): Observable<any> {
    return this.http.delete(`${API_URL}/${id}/save`);
  }

  getSavedPosts(): Observable<number[]> {
    return this.http.get<number[]>(`${API_URL}/saved`);
  }
}
