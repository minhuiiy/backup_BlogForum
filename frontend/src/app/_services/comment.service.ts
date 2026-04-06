import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_URL = '/api/v1/posts/';

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  constructor(private http: HttpClient) { }

  getCommentsByPost(postId: number): Observable<any> {
    return this.http.get(`${API_URL}${postId}/comments`);
  }

  addComment(postId: number, content: string, parentId?: number): Observable<any> {
    return this.http.post(`${API_URL}${postId}/comments`, { content, parentId });
  }

  deleteComment(commentId: number): Observable<any> {
    return this.http.delete(`/api/v1/comments/${commentId}`);
  }
}
