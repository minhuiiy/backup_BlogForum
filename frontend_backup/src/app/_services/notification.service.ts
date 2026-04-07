import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { WebSocketService } from './websocket.service';
import { environment } from '../../environments/environment';

const API_URL = environment.apiUrl + '/notifications';

export interface Notification {
  id: number;
  content: string;
  type: string;
  actor: any;
  post: any;
  comment: any;
  postId?: number;
  commentId?: number;
  read: boolean;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private _notifications = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this._notifications.asObservable();
  
  private _unreadCount = new BehaviorSubject<number>(0);
  public unreadCount$ = this._unreadCount.asObservable();

  constructor(
    private http: HttpClient,
    private webSocketService: WebSocketService
  ) {
    // Listen to real-time notifications
    this.webSocketService.notifications.subscribe((msg: string) => {
      try {
        const notif = JSON.parse(msg);
        this.fetchNotifications(); // Optionally just fetch again to keep data rich, or prepend
      } catch(e) {
        // If simply simple string
        this.fetchNotifications();
      }
    });
  }

  fetchNotifications(): void {
    this.http.get<Notification[]>(API_URL).pipe(
      catchError(err => {
        console.error('Failed to fetch notifications:', err);
        return of([]);
      })
    ).subscribe(data => {
      this._notifications.next(data);
    });
    this.fetchUnreadCount();
  }

  fetchUnreadCount(): void {
    this.http.get<number>(`${API_URL}/unread-count`).pipe(
      catchError(err => {
        return of(0);
      })
    ).subscribe(count => {
      this._unreadCount.next(count);
    });
  }

  markAsRead(id: number): Observable<any> {
    return this.http.put(`${API_URL}/${id}/read`, {});
  }

  markAllAsRead(): Observable<any> {
    return this.http.put(`${API_URL}/read-all`, {});
  }
}
