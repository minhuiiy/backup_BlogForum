import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../_services/chat.service';
import { FollowService } from '../../_services/follow.service';
import { TokenStorageService } from '../../_services/token-storage.service';
import { WebSocketService } from '../../_services/websocket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-widget.html',
  styleUrls: ['./chat-widget.css']
})
export class ChatWidget implements OnInit, OnDestroy {
  isOpen = false;
  activeChatUser: any = null;
  followingList: any[] = [];
  messages: any[] = [];
  newMessage = '';
  currentUser: any;
  private wsSub!: Subscription;

  constructor(
    private chatService: ChatService,
    private followService: FollowService,
    private tokenStorage: TokenStorageService,
    private wsService: WebSocketService
  ) {}

  ngOnInit() {
    this.currentUser = this.tokenStorage.getUser();
    if (!this.currentUser) return;
    
    this.loadFollowing();

    this.wsSub = this.wsService.chatMessages.subscribe(msg => {
      if (this.activeChatUser && 
         (msg.sender.username === this.activeChatUser.username || 
          msg.receiver.username === this.activeChatUser.username)) {
        
        // Prevent duplicate if we sent it
        const exists = this.messages.find(m => m.id === msg.id);
        if (!exists) {
           this.messages.push(msg);
           this.scrollToBottom();
        }
      }
    });
  }

  ngOnDestroy() {
    if (this.wsSub) this.wsSub.unsubscribe();
  }

  toggleWidget() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
        this.loadFollowing();
    } else {
        this.activeChatUser = null; 
    }
  }

  loadFollowing() {
    if (!this.currentUser || !this.currentUser.username) return;
    this.followService.getFollowing(this.currentUser.username).subscribe({
      next: data => {
        // Also fetch followers so we can chat with anyone connected? 
        // For now, just followingList is people you care about.
        this.followingList = data;
      },
      error: err => console.error(err)
    });
  }

  openChat(user: any, event?: Event) {
    if(event) event.stopPropagation();
    this.activeChatUser = user;
    this.chatService.getChatHistory(user.username).subscribe({
      next: history => {
        this.messages = history;
        this.scrollToBottom();
      }
    });
  }

  closeChat(event: Event) {
    event.stopPropagation();
    this.activeChatUser = null;
  }

  sendMessage() {
    if (!this.newMessage.trim() || !this.activeChatUser) return;
    const content = this.newMessage;
    this.newMessage = ''; // optimistic clear
    this.chatService.sendMessage(this.activeChatUser.username, content).subscribe({
      next: msg => {
        // Assuming STOMP already sends it back via websocket as well, 
        // to avoid duplicate, we rely on websocket mostly.
        // But if websocket is slow, this could feel laggy. 
      }
    });
  }

  scrollToBottom() {
    setTimeout(() => {
      const container = document.getElementById('chat-messages-container');
      if (container) container.scrollTop = container.scrollHeight;
    }, 150);
  }
}
