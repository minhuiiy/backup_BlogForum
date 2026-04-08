import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { TokenStorageService } from '../../_services/token-storage.service';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { FileService } from '../../_services/file.service';
import { environment } from '../../../environments/environment';
import { FormsModule } from '@angular/forms';
import { BlogService } from '../../_services/blog.service';
import { SafeHtmlPipe } from '../../_pipes/safe-html.pipe';
import { TimeAgoPipe } from '../../_pipes/time-ago.pipe';
import { CommunityMockService } from '../../_services/community-mock.service';
import { ImageModalService } from '../../_services/image-modal.service';
import { ActivatedRoute } from '@angular/router';
import { FollowService } from '../../_services/follow.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, SafeHtmlPipe, TimeAgoPipe],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class Profile implements OnInit {
  username = "User";
  activeTab = "overview";
  
  tabs = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'posts', label: 'Bài đăng' },
    { id: 'comments', label: 'Bình luận' },
    { id: 'saved', label: 'Đã lưu' },
    { id: 'history', label: 'Lịch sử' },
    { id: 'hidden', label: 'Bí ẩn' },
    { id: 'upvoted', label: 'Đã thích' },
    { id: 'downvoted', label: 'Đã không thích' },
    { id: 'settings', label: 'Cài đặt hồ sơ' }
  ];

  isEditing = false;
  isHoveringAvatar = false;
  editData = { displayName: '', avatarUrl: '' };
  isUploading = false;
  userProfile: any = null;
  followersCount = 0;
  followingCount = 0;
  isFollowing = false;

  posts: any[] = [];
  loadingFeed = false;
  likedPosts: Set<number> = new Set<number>();
  isLoggedIn = false;
  isOwnProfile = false;
  loggedInUser: any;

  // Comments tab
  userComments: any[] = [];
  loadingComments = false;

  // Saved tab
  savedPosts: any[] = [];
  loadingSaved = false;

  // History tab (lưu trong memory/localStorage)
  historyPosts: any[] = [];

  // Settings - profile edit form
  settingsData = { displayName: '', bio: '', gender: '' };
  settingsSaving = false;
  settingsSaved = false;

  // Telegram
  telegramLinked = false;
  telegramChatId = '';
  telegramInputId = '';
  telegramMessage = '';
  telegramSuccess = false;
  showTelegramPanel = false;

  constructor(
    private tokenStorage: TokenStorageService, 
    private titleService: Title,
    private http: HttpClient,
    private fileService: FileService,
    private blogService: BlogService,
    public commMock: CommunityMockService,
    private imageModalService: ImageModalService,
    private route: ActivatedRoute,
    private followService: FollowService
  ) {}

  ngOnInit() {
    this.loggedInUser = this.tokenStorage.getUser();
    this.isLoggedIn = !!this.loggedInUser;

    this.route.params.subscribe(params => {
      const paramUsername = params['username'];
      if (paramUsername) {
        this.username = paramUsername;
        this.isOwnProfile = this.isLoggedIn && (this.username === this.loggedInUser.username);
        this.loadProfileData(this.username);
      } else {
        if (this.isLoggedIn) {
          this.username = this.loggedInUser.username;
          this.isOwnProfile = true;
          this.loadProfileData('me');
        } else {
          // Unauthenticated user trying to access /profile
        }
      }
      this.titleService.setTitle(`${this.username} (u/${this.username}) - blogforum`);
      this.loadUserPosts();
    });

    if (this.isLoggedIn) {
      this.blogService.getLikedPosts().subscribe({
        next: ids => this.likedPosts = new Set(ids),
        error: err => console.error(err)
      });
      this.checkTelegramStatus();
    }
  }

  loadProfileData(target: string) {
    const endpoint = target === 'me' ? '/users/me' : `/users/profile/${target}`;
    this.http.get(environment.apiUrl + endpoint).subscribe({
      next: (data: any) => {
        this.userProfile = data;
        if (this.isOwnProfile) {
          this.editData.displayName = data.displayName || data.username;
          this.editData.avatarUrl = data.avatarUrl || 'https://www.redditstatic.com/avatars/defaults/v2/avatar_default_2.png';
        }
        
        // Also load follow stats gracefully
        this.followService.getFollowers(this.username).subscribe({
          next: (f: any[]) => this.followersCount = f.length,
          error: () => this.followersCount = 0
        });
        this.followService.getFollowing(this.username).subscribe({
          next: (f: any[]) => this.followingCount = f.length,
          error: () => this.followingCount = 0
        });

        if (this.isLoggedIn && !this.isOwnProfile) {
          this.followService.isFollowing(this.loggedInUser.username, this.username).subscribe((res: any) => {
            this.isFollowing = res.isFollowing;
          });
        }
      }
    });
  }

  toggleFollow() {
    if (!this.isLoggedIn || this.isOwnProfile) return;
    if (this.isFollowing) {
      this.followService.unfollowUser(this.username).subscribe(() => {
        this.isFollowing = false;
        this.followersCount--;
      });
    } else {
      this.followService.followUser(this.username).subscribe(() => {
        this.isFollowing = true;
        this.followersCount++;
      });
    }
  }

  loadUserPosts() {
    this.loadingFeed = true;
    this.blogService.getAllPosts().subscribe({
      next: (data: any) => {
        const rawPosts = data.content || data;
        let myPosts = rawPosts.filter((p: any) => p.author?.username === this.username);
        this.posts = myPosts.map((post: any) => this.processPostContent(post));
        this.loadingFeed = false;
      },
      error: err => {
        console.error(err);
        this.loadingFeed = false;
      }
    });
  }

  processPostContent(post: any): any {
    if (!post.content) return post;
    const parser = new DOMParser();
    const doc = parser.parseFromString(post.content, 'text/html');
    const imgs = doc.querySelectorAll('img');
    const imagesArray: string[] = [];
    imgs.forEach(img => {
      imagesArray.push(img.src);
      img.remove();
    });
    return { ...post, extractedImages: imagesArray, currentImageIndex: 0, strippedContent: doc.body.innerHTML };
  }

  isPostLiked(postId: number): boolean {
    return this.likedPosts.has(postId);
  }

  votePost(post: any): void {
    if (!this.isLoggedIn) return;
    this.blogService.votePost(post.id).subscribe({
      next: updatedPost => {
        post.likes = updatedPost.likes;
        if (this.likedPosts.has(post.id)) {
           this.likedPosts.delete(post.id);
        } else {
           this.likedPosts.add(post.id);
        }
      },
      error: err => console.error(err)
    });
  }

  deletePost(post: any, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (confirm('Bạn có chắc chắn muốn xóa bài viết này không?')) {
      this.blogService.deletePost(post.id).subscribe({
        next: () => {
          this.posts = this.posts.filter(p => p.id !== post.id);
        },
        error: err => {
          console.error(err);
          alert('Có lỗi xảy ra khi xóa bài viết.');
        }
      });
    }
  }

  openImageOverlay(imageUrl: string): void {
    this.imageModalService.open(imageUrl);
  }

  prevImage(event: Event, post: any): void {
    event.stopPropagation();
    event.preventDefault();
    if (post.extractedImages && post.currentImageIndex > 0) post.currentImageIndex--;
  }

  nextImage(event: Event, post: any): void {
    event.stopPropagation();
    event.preventDefault();
    if (post.extractedImages && post.currentImageIndex < post.extractedImages.length - 1) post.currentImageIndex++;
  }

  setTab(tabId: string) {
    this.activeTab = tabId;
    if (tabId === 'comments' && this.userComments.length === 0) this.loadUserComments();
    if (tabId === 'saved' && this.savedPosts.length === 0) this.loadSavedPosts();
    if (tabId === 'history') this.loadHistory();
    if (tabId === 'upvoted' && this.posts.length === 0) this.loadUserPosts();
    if (tabId === 'settings') this.initSettings();
  }

  loadUserComments() {
    this.loadingComments = true;
    const endpoint = this.isOwnProfile
      ? '/users/me/comments'
      : `/users/profile/${this.username}/comments`;
    this.http.get<any[]>(environment.apiUrl + endpoint).subscribe({
      next: data => { this.userComments = data; this.loadingComments = false; },
      error: () => this.loadingComments = false
    });
  }

  loadSavedPosts() {
    if (!this.isOwnProfile) return;
    this.loadingSaved = true;
    this.blogService.getSavedPosts().subscribe({
      next: ids => {
        // Load chi tiết từng bài đã save
        if (ids.length === 0) { this.savedPosts = []; this.loadingSaved = false; return; }
        this.blogService.getAllPosts().subscribe({
          next: (data: any) => {
            const all = data.content || data;
            this.savedPosts = all
              .filter((p: any) => ids.includes(p.id))
              .map((p: any) => this.processPostContent(p));
            this.loadingSaved = false;
          },
          error: () => this.loadingSaved = false
        });
      },
      error: () => this.loadingSaved = false
    });
  }

  loadHistory() {
    try {
      const raw = localStorage.getItem('post_history');
      this.historyPosts = raw ? JSON.parse(raw) : [];
    } catch { this.historyPosts = []; }
  }

  // Ghi lịch sử xem bài (gọi từ post-detail)
  static recordHistory(post: any) {
    try {
      const raw = localStorage.getItem('post_history');
      let history: any[] = raw ? JSON.parse(raw) : [];
      history = history.filter(p => p.id !== post.id);
      history.unshift({ id: post.id, title: post.title, createdAt: post.createdAt, author: post.author, viewedAt: new Date().toISOString() });
      if (history.length > 50) history = history.slice(0, 50);
      localStorage.setItem('post_history', JSON.stringify(history));
    } catch {}
  }

  clearHistory() {
    localStorage.removeItem('post_history');
    this.historyPosts = [];
  }

  initSettings() {
    this.settingsData = {
      displayName: this.userProfile?.displayName || this.username,
      bio: this.userProfile?.bio || '',
      gender: this.userProfile?.gender || ''
    };
  }

  saveSettings() {
    this.settingsSaving = true;
    this.settingsSaved = false;
    this.http.put(environment.apiUrl + '/users/me', this.settingsData).subscribe({
      next: (data: any) => {
        this.userProfile = data;
        this.settingsSaving = false;
        this.settingsSaved = true;
        const localUser = this.tokenStorage.getUser();
        if (localUser) {
          localUser.displayName = data.displayName;
          localUser.avatarUrl = data.avatarUrl;
          this.tokenStorage.saveUser(localUser);
        }
        setTimeout(() => this.settingsSaved = false, 3000);
      },
      error: () => { this.settingsSaving = false; alert('Lỗi lưu cài đặt!'); }
    });
  }

  isEditingName = false;

  startEditName() {
    this.editData.displayName = this.userProfile?.displayName || this.userProfile?.username || this.username;
    this.isEditingName = true;
    setTimeout(() => {
      const el = document.getElementById('displayNameInput');
      if(el) el.focus();
    }, 100);
  }

  saveName() {
    if (!this.isEditingName) return;
    this.isEditingName = false;
    const oldName = this.userProfile?.displayName || this.userProfile?.username || this.username;
    if (this.editData.displayName && this.editData.displayName.trim() !== oldName) {
       this.editData.displayName = this.editData.displayName.trim();
       this.saveProfile();
    }
  }

  onFileSelected(event: any) {
    if (event.target.files.length > 0) {
      const file = event.target.files[0];
      this.isUploading = true;
      this.fileService.upload(file).subscribe({
        next: (ev: HttpEvent<any>) => {
          if (ev.type === HttpEventType.Response && ev.body) {
            this.editData.avatarUrl = ev.body.fileDownloadUri;
            this.isUploading = false;
            this.saveProfile();
          }
        },
        error: () => this.isUploading = false
      });
    }
  }

  saveProfile() {
    this.http.put(environment.apiUrl + '/users/me', this.editData).subscribe({
      next: (data: any) => {
        this.userProfile = data;
        
        const localUser = this.tokenStorage.getUser();
        if (localUser) {
           localUser.displayName = data.displayName;
           localUser.avatarUrl = data.avatarUrl;
           this.tokenStorage.saveUser(localUser);
        }
      },
      error: err => {
        console.error(err);
        alert('Có lỗi xảy ra khi lưu thay đổi!');
      }
    });
  }

  // ===== TELEGRAM INTEGRATION (Deep Link Flow) =====
  telegramLinkUrl = '';
  telegramPolling: any = null;
  telegramLinking = false; // đang chờ user bấm START trên Telegram

  checkTelegramStatus() {
    this.http.get<any>(environment.apiUrl + '/users/telegram/status').subscribe({
      next: (res) => {
        this.telegramLinked = res.linked;
        this.telegramChatId = res.chatId || '';
      },
      error: () => {}
    });
  }

  startTelegramLinking() {
    this.telegramLinking = true;
    this.telegramMessage = '';
    // Gọi API tạo token + lấy deep link
    this.http.post<any>(environment.apiUrl + '/users/telegram/generate-link', {}).subscribe({
      next: (res) => {
        this.telegramLinkUrl = res.link;
        // Mở Telegram tự động
        window.open(res.link, '_blank');
        // Bắt đầu polling kiểm tra xem đã link chưa
        this.startPollingLinkStatus();
      },
      error: (err) => {
        this.telegramLinking = false;
        this.telegramMessage = '❌ Không thể tạo link. Vui lòng thử lại.';
        this.telegramSuccess = false;
      }
    });
  }

  startPollingLinkStatus() {
    // Poll mỗi 3 giây trong tối đa 10 phút
    let attempts = 0;
    const MAX_ATTEMPTS = 200; // 200 × 3s = 10 phút
    this.telegramPolling = setInterval(() => {
      attempts++;
      if (attempts > MAX_ATTEMPTS) {
        clearInterval(this.telegramPolling);
        this.telegramLinking = false;
        this.telegramMessage = '⏰ Hết thời gian chờ. Vui lòng thử lại.';
        this.telegramSuccess = false;
        return;
      }
      this.http.get<any>(environment.apiUrl + '/users/telegram/status').subscribe({
        next: (res) => {
          if (res.linked) {
            clearInterval(this.telegramPolling);
            this.telegramLinked = true;
            this.telegramChatId = res.chatId;
            this.telegramLinking = false;
            this.telegramMessage = '✅ Liên kết thành công! Bạn sẽ nhận thông báo qua Telegram.';
            this.telegramSuccess = true;
            setTimeout(() => this.telegramMessage = '', 5000);
          }
        },
        error: () => {}
      });
    }, 3000);
  }

  unlinkTelegram() {
    if (!confirm('Hủy liên kết Telegram?')) return;
    this.http.delete<any>(environment.apiUrl + '/users/telegram/unlink').subscribe({
      next: () => {
        this.telegramLinked = false;
        this.telegramChatId = '';
        this.telegramLinkUrl = '';
        this.telegramLinking = false;
        if (this.telegramPolling) clearInterval(this.telegramPolling);
        this.telegramMessage = 'Đã hủy liên kết Telegram.';
        this.telegramSuccess = false;
        setTimeout(() => this.telegramMessage = '', 3000);
      }
    });
  }

  testTelegramNotification() {
    // Gửi tin test trực tiếp
    this.http.post<any>(environment.apiUrl + '/telegram/test', {}).subscribe({
      next: () => {
        this.telegramMessage = '🔔 Đã gửi tin test tới Telegram!';
        this.telegramSuccess = true;
        setTimeout(() => this.telegramMessage = '', 3000);
      },
      error: () => {
        this.telegramMessage = '❌ Không thể gửi tin. Vui lòng thử lại.';
        this.telegramSuccess = false;
        setTimeout(() => this.telegramMessage = '', 3000);
      }
    });
  }
}
