import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TokenStorageService } from '../../_services/token-storage.service';
import { AuthModalService } from '../../_services/auth-modal.service';
import { SidebarService } from '../../_services/sidebar.service';
import { CommunityMockService } from '../../_services/community-mock.service';
import { SocialAuthService } from '@abacritt/angularx-social-login';
import { NotificationService, Notification } from '../../_services/notification.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { TimeAgoPipe } from '../../_pipes/time-ago.pipe';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule, TimeAgoPipe],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  isLoggedIn = false;
  username?: string;
  avatarUrl?: string;
  displayName?: string;
  isDropdownOpen = false;
  isNotifDropdownOpen = false;
  searchQuery: string = '';
  
  notifications: Notification[] = [];
  unreadCount = 0;

  constructor(
    private tokenStorageService: TokenStorageService, 
    private router: Router,
    private authModalService: AuthModalService,
    private sidebarService: SidebarService,
    private socialAuthService: SocialAuthService,
    private commMock: CommunityMockService,
    public notificationService: NotificationService,
    private http: HttpClient
  ) { }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
    this.isNotifDropdownOpen = false;
  }

  toggleNotifDropdown(event: Event): void {
    event.stopPropagation();
    this.isNotifDropdownOpen = !this.isNotifDropdownOpen;
    this.isDropdownOpen = false;
  }

  markNotificationAsRead(notif: Notification): void {
    if (!notif.read) {
      this.notificationService.markAsRead(notif.id).subscribe(() => {
        notif.read = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      });
    }
    
    // Close dropdown and navigate
    this.isNotifDropdownOpen = false;
    
    if (notif.postId) {
      const dest = `/post/${notif.postId}`;
      // Use undefined or null to explicitly clear the fragment if navigating to a post-only notif
      const navigationExtras: any = notif.commentId ? { fragment: `comment-${notif.commentId}` } : {};
      // Ensure we don't carry over old fragments if navigating to just the post
      if (!notif.commentId) navigationExtras.fragment = undefined;
      
      if (this.router.url.split('#')[0] === dest) {
        this.router.navigateByUrl('/', {skipLocationChange: true}).then(() => {
          this.router.navigate([dest], navigationExtras);
        });
      } else {
        this.router.navigate([dest], navigationExtras);
      }
    } else if (notif.type === 'FOLLOW' && notif.actor) {
      // Navigate to user profile if the notification is a follow
      const actorUsername = typeof notif.actor === 'string' ? notif.actor : notif.actor?.username;
      if (actorUsername) {
        this.router.navigate(['/profile', actorUsername]);
      }
    }
  }

  markAllNotificationsAsRead(): void {
    if (this.unreadCount > 0) {
      this.notificationService.markAllAsRead().subscribe(() => {
        this.unreadCount = 0;
        this.notifications.forEach(n => n.read = true);
      });
    }
  }

  @HostListener('document:click')
  clickout() {
    this.isDropdownOpen = false;
    this.isNotifDropdownOpen = false;
  }

  ngOnInit(): void {
    this.isLoggedIn = !!this.tokenStorageService.getToken();
    if (this.isLoggedIn) {
      const user = this.tokenStorageService.getUser();
      this.username = user.username;
      this.avatarUrl = user.avatarUrl;
      this.displayName = user.displayName;

      this.tokenStorageService.userUpdates$.subscribe(updatedUser => {
        this.username = updatedUser.username;
        this.avatarUrl = updatedUser.avatarUrl;
        this.displayName = updatedUser.displayName;
      });
      
      // Fetch latest profile to sync avatar
      this.http.get(environment.apiUrl + '/users/me').subscribe({
        next: (data: any) => {
          const localUser = this.tokenStorageService.getUser();
          localUser.displayName = data.displayName || data.username;
          localUser.avatarUrl = data.avatarUrl;
          this.tokenStorageService.saveUser(localUser);
        },
        error: err => console.error('Failed to sync navbar profile', err)
      });
      
      // Load group memberships directly from server
      this.commMock.fetchMyMemberships(this.username!);
      
      this.notificationService.notifications$.subscribe(notifs => {
        this.notifications = notifs;
      });
      this.notificationService.unreadCount$.subscribe(count => {
        this.unreadCount = count;
      });
      
      this.notificationService.fetchNotifications();
    }
  }

  toggleSidebar(): void {
    this.sidebarService.toggle();
  }

  openLoginModal(): void {
    this.authModalService.open();
  }

  logout(): void {
    this.tokenStorageService.signOut();
    this.isLoggedIn = false;
    
    // Đăng xuất khỏi hệ thống Google
    try {
      this.socialAuthService.signOut();
    } catch(e) {
      console.warn(e);
    }

    this.router.navigate(['/']).then(() => {
      window.location.reload();
    });
  }

  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/search'], { queryParams: { q: this.searchQuery.trim() } });
    }
  }
}
