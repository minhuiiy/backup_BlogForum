import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_URL = '/api/v1/forum';

@Injectable({
  providedIn: 'root'
})
export class ForumService {
  constructor(private http: HttpClient) { }

  getAllQuestions(): Observable<any> {
    return this.http.get(`${API_URL}/questions`);
  }

  getQuestionById(id: number): Observable<any> {
    return this.http.get(`${API_URL}/questions/${id}`);
  }
}
