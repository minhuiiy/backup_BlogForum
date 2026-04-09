import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommunityMockService } from '../../_services/community-mock.service';
import { BlogService } from '../../_services/blog.service';
import { TokenStorageService } from '../../_services/token-storage.service';
import { ImageModalService } from '../../_services/image-modal.service';
import { AuthModalService } from '../../_services/auth-modal.service';
import { SafeHtmlPipe } from '../../_pipes/safe-html.pipe';
import { TimeAgoPipe } from '../../_pipes/time-ago.pipe';
import { Subscription } from 'rxjs';
import { Title } from '@angular/platform-browser';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { FileService } from '../../_services/file.service';
import { environment } from '../../../environments/environment';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [CommonModule, RouterLink, SafeHtmlPipe, TimeAgoPipe, FormsModule],
  templateUrl: './community.html',
  styleUrls: ['./community.css']
})
export class CommunityComponent implements OnInit, OnDestroy {
  communityName = '';
  communityData: any = null;
  
  // Feed integration
  filteredPosts: any[] = [];
  loadingFeed = true;
  isLoggedIn = false;
  currentUser: any = null;
  likedPosts: Set<number> = new Set<number>();
  isModerator = false;
  isCreator = false;
  communityCreator: any = null;  // 👑 Chủ cộng đồng
  
  memberCount = 1;
  onlineCount = 1;
  
  private routeSub: Subscription | undefined;
  private membersSub: Subscription | undefined;

  // Settings state
  isEditing = false;
  isUploading = false;
  editData = { displayName: '', description: '', imageUrl: '', telegramChannelId: '' };
  
  // Admin Data
  adminActiveTab = 'settings';
  pendingPosts: any[] = [];
  communityMembers: any[] = [];

  // Modal rời cộng đồng
  showLeaveModal = false;

  constructor(
    private route: ActivatedRoute,
    public commMock: CommunityMockService,
    private blogService: BlogService,
    private tokenStorage: TokenStorageService,
    private imageModalService: ImageModalService,
    private authModalService: AuthModalService,
    private titleService: Title,
    private http: HttpClient,
    private fileService: FileService
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = !!this.tokenStorage.getToken();
    if (this.isLoggedIn) {
      this.currentUser = this.tokenStorage.getUser();
      this.blogService.getLikedPosts().subscribe({
        next: ids => this.likedPosts = new Set(ids),
        error: err => console.error('Lỗi tải liked posts:', err)
      });
    }

    // Theo dõi thay đổi URL (Param) realtime
    this.routeSub = this.route.paramMap.subscribe(params => {
      const rawParam = params.get('communityName') || '';
      // Decode slug: thay gạch ngang → khoảng trắng để match tên gốc trong DB
      this.communityName = rawParam.replace(/-/g, ' ');
      if (this.communityName) {
        this.titleService.setTitle(`r/${this.communityName} - blogforum`);
        this.loadCommunityInfo();
        this.loadCommunityFeed();
        this.checkModeratorRole();
      }
    });
    
    this.membersSub = this.commMock.membersMap$.subscribe(() => {
      this.updateStats();
      this.checkModeratorRole();
    });
  }

  ngOnDestroy() {
    if (this.routeSub) this.routeSub.unsubscribe();
    if (this.membersSub) this.membersSub.unsubscribe();
  }

  updateStats() {
    this.commMock.getCategoryStats(this.communityName).subscribe({
      next: (stats) => {
        this.memberCount = stats.memberCount;
        this.onlineCount = Math.max(1, Math.floor(this.memberCount * 0.3) + Math.floor(Math.random() * 2));
      },
      error: (err) => console.error('Failed to load stats', err)
    });
  }

  checkModeratorRole() {
    if (this.isLoggedIn) {
      if (this.currentUser?.roles?.includes('ROLE_ADMIN')) {
          this.isModerator = true;
          this.isCreator = true; // Admin có quyền như creator
          return;
      }
      this.isModerator = this.commMock.getRole(this.communityName, this.currentUser?.username) === 'moderator';

      // Kiểm tra moderator từ backend
      if (this.communityData?.moderators) {
         if (this.communityData.moderators.find((u: any) => u.username === this.currentUser?.username)) {
            this.isModerator = true;
         }
      }

      // Kiểm tra creator từ backend
      this.isCreator = this.communityData?.creator?.username === this.currentUser?.username;
      // Lưu thông tin creator để hiển thị UI
      this.communityCreator = this.communityData?.creator || null;
    }
  }

  loadCommunityInfo() {
    const formatName = this.communityName;
    this.commMock.communities$.subscribe(list => {
      const found = list.find(c => c.name.toLowerCase() === formatName.toLowerCase());
      if (found) {
        this.communityData = found;
        // Lưu creator để hiển thị UI
        this.communityCreator = found.creator || null;
        this.checkModeratorRole();
      } else {
        this.communityData = { name: this.communityName, description: 'Cộng đồng mặc định', members: 1 };
        this.communityCreator = null;
      }
    });
    this.updateStats();
  }

  joinCommunity(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    if (!this.isLoggedIn) {
      this.authModalService.open();
      return;
    }
    this.commMock.joinCommunity(this.communityName, this.currentUser.username, 'member');
  }

  leaveCommunity(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    if (!this.isLoggedIn) return;
    this.showLeaveModal = true;
  }

  confirmLeaveCommunity() {
    this.showLeaveModal = false;
    this.commMock.leaveCommunity(this.communityName, this.currentUser.username);
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (this.isEditing) {
      this.adminActiveTab = 'settings';
      this.editData.displayName = this.communityData?.displayName || this.communityData?.name || '';
      this.editData.description = this.communityData?.description || '';
      this.editData.imageUrl = this.communityData?.imageUrl || '';
      this.editData.telegramChannelId = this.communityData?.telegramChannelId || '';
      
      this.loadPendingPosts();
      this.loadCommunityMembers();
    }
  }

  setAdminTab(tab: string) {
    this.adminActiveTab = tab;
  }

  loadPendingPosts() {
      if (this.communityData?.id) {
          this.http.get(`${environment.apiUrl}/posts/pending/${this.communityData.id}`).subscribe({
              next: (data: any) => {
                  this.pendingPosts = data.content || data;
              },
              error: err => console.error(err)
          });
      }
  }

  loadCommunityMembers() {
      this.http.get(`${environment.apiUrl}/categories/${encodeURIComponent(this.communityName)}/members`).subscribe({
          next: (data: any) => {
              this.communityMembers = data;
          },
          error: err => console.error(err)
      });
  }

  approvePost(post: any) {
      this.http.put(`${environment.apiUrl}/posts/${post.id}/approve`, {}).subscribe({
          next: () => {
              this.pendingPosts = this.pendingPosts.filter(p => p.id !== post.id);
              this.loadCommunityFeed(); // Load to main feed
          },
          error: err => console.error(err)
      });
  }

  rejectPost(post: any) {
      if (confirm('Bạn có chắc chắn muốn từ chối bài viết này?')) {
          this.http.delete(`${environment.apiUrl}/posts/${post.id}/reject`).subscribe({
              next: () => {
                  this.pendingPosts = this.pendingPosts.filter(p => p.id !== post.id);
              },
              error: err => console.error(err)
          });
      }
  }

  promoteMember(memberUsername: string) {
      if (confirm(`Thăng cấp cho ${memberUsername}?`)) {
          this.http.post(`${environment.apiUrl}/categories/${encodeURIComponent(this.communityName)}/promote?memberUsername=${memberUsername}`, {}).subscribe({
              next: () => this.loadCommunityMembers(),
              error: err => console.error(err)
          });
      }
  }

  demoteMember(memberUsername: string) {
      if (confirm(`Hủy quyền kiểm duyệt của ${memberUsername}?`)) {
          this.http.post(`${environment.apiUrl}/categories/${encodeURIComponent(this.communityName)}/demote?memberUsername=${memberUsername}`, {}).subscribe({
              next: () => this.loadCommunityMembers(),
              error: err => console.error(err)
          });
      }
  }

  deleteCommunity() {
      if (!this.isCreator) {
          alert('Chỉ người tạo cộng đồng mới có quyền xóa!');
          return;
      }
      const communityName = this.communityData?.name || this.communityName;
      if (confirm('LƯŨ Ý: XÓA CỘNG ĐỒNG SỌ XÓA TOÀN BỘ BÀI VIẾT BÊN TRONG. Bạn có chắc chắn không?')) {
          this.http.delete(`${environment.apiUrl}/categories/by-name/${encodeURIComponent(communityName)}`).subscribe({
              next: () => {
                  window.location.href = '/explore';
              },
              error: (err: any) => {
                  const msg = err.error || 'Xóa thất bại. Bạn không có quyền hoặc có lỗi xảy ra.';
                  alert(msg);
                  console.error(err);
              }
          });
      }
  }



  onFileSelected(event: any) {
    if (event.target.files.length > 0) {
      const file = event.target.files[0];
      this.isUploading = true;
      this.fileService.upload(file).subscribe({
        next: (ev: HttpEvent<any>) => {
          if (ev.type === HttpEventType.Response && ev.body) {
            this.editData.imageUrl = ev.body.fileDownloadUri;
            this.isUploading = false;
          }
        },
        error: () => this.isUploading = false
      });
    }
  }

  saveSettings() {
    this.http.put(`${environment.apiUrl}/categories/${this.communityData.name}/settings`, this.editData)
      .subscribe({
        next: (updated: any) => {
          this.communityData = updated;
          this.isEditing = false;
        },
        error: err => console.error(err)
      });
  }

  joinCommunityFromPost(communityName: string, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    if (!this.isLoggedIn) {
      this.authModalService.open();
      return;
    }
    this.commMock.joinCommunity(communityName, this.currentUser.username, 'member');
  }

  loadCommunityFeed() {
    this.loadingFeed = true;
    
    // Đổ bộ toàn Server, bóc tách những bài viết thuộc Category/Community này!
    // Cách này giúp Toàn cầu hóa dữ liệu, khác Browser người dùng vẫn thấy Bài viết
    this.blogService.getAllPosts().subscribe({
      next: (data: any) => {
        const rawPosts = data.content || data;
        let pList = rawPosts;
        
        // Filter by Backend Category mapped exactly, CHỈ hiện bài APPROVED
        pList = rawPosts.filter((p: any) =>
          p.category &&
          p.category.name &&
          p.category.name.toLowerCase() === this.communityName.toLowerCase() &&
          p.status === 'APPROVED'  // ✅ Ẩn bài PENDING/REJECTED khỏi feed
        );
        
        this.filteredPosts = pList.map((post: any) => this.processPostContent(post));
        this.loadingFeed = false;
      },
      error: err => {
        console.error('Lỗi lấy feed cộng đồng:', err);
        this.loadingFeed = false;
      }
    });
  }

  // --- Reused functions from Generic Feed ---

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
    post.extractedImages = imagesArray;
    post.currentImageIndex = 0;
    post.strippedContent = doc.body.innerHTML;
    return post;
  }

  prevImage(event: Event, post: any): void {
    event.stopPropagation();
    event.preventDefault();
    if (post.extractedImages && post.currentImageIndex > 0) {
      post.currentImageIndex--;
    }
  }

  nextImage(event: Event, post: any): void {
    event.stopPropagation();
    event.preventDefault();
    if (post.extractedImages && post.currentImageIndex < post.extractedImages.length - 1) {
      post.currentImageIndex++;
    }
  }

  openImageOverlay(imageUrl: string): void {
    this.imageModalService.open(imageUrl);
  }

  isPostLiked(postId: number): boolean {
    return this.likedPosts.has(postId);
  }

  votePost(post: any): void {
    if (!this.currentUser) return;
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
}
