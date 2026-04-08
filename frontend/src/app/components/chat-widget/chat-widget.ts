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
  activeTab: 'inbox' | 'requests' = 'inbox';
  followingList: any[] = [];
  requestList: any[] = [];
  messages: any[] = [];
  newMessage = '';
  currentUser: any;
  unreadTotalCount: number = 0;
  unreadRequestCount: number = 0;
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
    this.loadRequests();

    this.wsSub = this.wsService.chatMessages.subscribe(msg => {
      const otherUsername = msg.sender.username === this.currentUser.username ? msg.receiver.username : msg.sender.username;

      // Handle actively opened chat
      if (this.activeChatUser && this.activeChatUser.username === otherUsername) {
        const exists = this.messages.find(m => m.id === msg.id);
        if (!exists) {
           this.messages.push(msg);
           this.scrollToBottom();
           if (msg.receiver.username === this.currentUser.username) {
              this.chatService.markAsRead(msg.sender.username).subscribe();
           }
        }
      }

      // Update list preview natively
      let inboxUser = this.followingList.find(u => u.username === otherUsername);
      let reqUser = this.requestList.find(u => u.username === otherUsername);
      
      let targetUser = inboxUser || reqUser;
      let isNewRequest = false;

      // If this is a completely new conversation from a non-follower to us
      if (!targetUser) {
         targetUser = msg.sender.username === this.currentUser.username ? msg.receiver : msg.sender;
         
         // If we are sending the message, we assume we initiated so it goes to Inbox?
         // Actually, let's check follow status. We don't have synchronous check, so we re-fetch lists.
         // For now, assume if the other person is not in followingList, and they just messaged us:
         if (msg.sender.username !== this.currentUser.username) {
            this.requestList.unshift(targetUser);
            isNewRequest = true;
         } else {
            // We just messaged someone not in our following list, wait, followingList is people WE follow.
            // If WE message them, it should go to Inbox? Actually it just goes to followingList for simplicity here.
            // But realistically we should refresh.
            this.loadRequests();
            this.loadFollowing();
            return;
         }
      }
      
      if (targetUser) {
         targetUser.lastMessagePreview = msg.content;
         if (msg.receiver.username === this.currentUser.username && (!this.activeChatUser || this.activeChatUser.username !== otherUsername)) {
            targetUser.hasUnread = true;
         }
         
         // Move to top of their respective list
         if (inboxUser) {
            this.followingList = this.followingList.filter(u => u.username !== otherUsername);
            this.followingList.unshift(targetUser);
         } else if (reqUser || isNewRequest) {
            this.requestList = this.requestList.filter(u => u.username !== otherUsername);
            this.requestList.unshift(targetUser);
         }
      }

      this.updateTotalUnread();
    });
  }

  updateTotalUnread() {
     this.unreadTotalCount = this.followingList.filter(u => u.hasUnread).length;
     this.unreadRequestCount = this.requestList.filter(u => u.hasUnread).length;
  }

  ngOnDestroy() {
    if (this.wsSub) this.wsSub.unsubscribe();
  }

  toggleWidget() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
        this.loadFollowing();
        this.loadRequests();
    } else {
        this.activeChatUser = null; 
    }
  }

  loadFollowing() {
    if (!this.currentUser || !this.currentUser.username) return;
    this.followService.getFollowing(this.currentUser.username).subscribe({
      next: data => {
        this.followingList = data;
        let totalUnread = 0;
        this.followingList.forEach(user => {
           this.chatService.getChatHistory(user.username).subscribe({
              next: history => {
                if (history && history.length > 0) {
                   const lastMsg = history[history.length - 1];
                   user.lastMessagePreview = lastMsg.content;
                   user.hasUnread = history.some((m: any) => !m.read && m.receiver.username === this.currentUser.username);
                   if (user.hasUnread) totalUnread++;
                   this.unreadTotalCount = totalUnread; // Keep summing asynchronously
                }
              }
           });
        });
      },
      error: err => console.error(err)
    });
  }

  loadRequests() {
    if (!this.currentUser || !this.currentUser.username) return;
    this.chatService.getChatRequests().subscribe({
      next: data => {
        this.requestList = data;
        let totalUnread = 0;
        this.requestList.forEach(user => {
           this.chatService.getChatHistory(user.username).subscribe({
              next: history => {
                if (history && history.length > 0) {
                   const lastMsg = history[history.length - 1];
                   user.lastMessagePreview = lastMsg.content;
                   user.hasUnread = history.some((m: any) => !m.read && m.receiver.username === this.currentUser.username);
                   if (user.hasUnread) totalUnread++;
                   this.unreadRequestCount = totalUnread;
                }
              }
           });
        });
      },
      error: err => console.error(err)
    });
  }

  openChat(user: any, event?: Event) {
    if(event) event.stopPropagation();
    this.activeChatUser = user;
    
    if (user.hasUnread) {
       user.hasUnread = false;
       this.updateTotalUnread();
       this.chatService.markAsRead(user.username).subscribe();
    }

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
