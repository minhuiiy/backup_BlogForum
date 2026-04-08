import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const API_URL = environment.apiUrl + '/chat/';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  constructor(private http: HttpClient) { }

  sendMessage(receiverUsername: string, content: string): Observable<any> {
    return this.http.post(API_URL + 'send', { receiverUsername, content });
  }

  getChatHistory(targetUsername: string): Observable<any> {
    return this.http.get(API_URL + 'history/' + targetUsername);
  }

  markAsRead(senderUsername: string): Observable<any> {
    return this.http.post(API_URL + 'read/' + senderUsername, {});
  }

  getChatRequests(): Observable<any> {
    return this.http.get(API_URL + 'requests');
  }
}
