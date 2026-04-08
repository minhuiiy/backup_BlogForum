import { Injectable, NgZone } from '@angular/core';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { TokenStorageService } from './token-storage.service';
import { Subject } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private stompClient: Client;
  public notifications = new Subject<string>();
  public chatMessages = new Subject<any>();

  constructor(private tokenStorage: TokenStorageService, private zone: NgZone) {
    this.stompClient = new Client({
      // Chỉ dùng HTTP polling, tránh lỗi wss:// trên Vercel
      webSocketFactory: () => new SockJS(environment.wsUrl, null, {
        transports: ['xhr-polling', 'xhr-streaming', 'jsonp-polling']
      }),
      reconnectDelay: 5000,
      heartbeatIncoming: 0,
      heartbeatOutgoing: 0,
    });

    this.stompClient.onConnect = (frame) => {
      const user = this.tokenStorage.getUser();
      if (user && user.username) {
        this.stompClient.subscribe(`/topic/notifications/${user.username}`, (message) => {
          this.zone.run(() => this.notifications.next(message.body));
        });
        this.stompClient.subscribe(`/topic/chat/${user.username}`, (message) => {
          this.zone.run(() => this.chatMessages.next(JSON.parse(message.body)));
        });
      }
      this.stompClient.subscribe('/topic/public', (message) => {
        this.zone.run(() => this.notifications.next(message.body));
      });
    };

    // Ẩn tất cả lỗi WebSocket/STOMP khỏi console
    this.stompClient.onStompError = () => {};
    this.stompClient.onWebSocketError = () => {};
    this.stompClient.onWebSocketClose = () => {};
  }

  public connect(): void {
    if (!this.stompClient.active) {
      this.stompClient.activate();
    }
  }

  public disconnect(): void {
    if (this.stompClient.active) {
      this.stompClient.deactivate();
    }
  }
}
