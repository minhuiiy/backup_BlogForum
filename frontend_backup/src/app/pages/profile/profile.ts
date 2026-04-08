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
    { id: 'downvoted', label: 'Đã không thích' }
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
        
        // Also load follow stats
        this.followService.getFollowers(this.username).subscribe((f: any[]) => this.followersCount = f.length);
        this.followService.getFollowing(this.username).subscribe((f: any[]) => this.followingCount = f.length);

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
  }

  isEditingName = false;

  startEditName() {
    this.isEditingName = true;
  }

  saveName() {
    if (!this.isEditingName) return;
    this.isEditingName = false;
    if (this.editData.displayName !== this.userProfile?.displayName) {
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
        localUser.displayName = data.displayName;
        localUser.avatarUrl = data.avatarUrl;
        this.tokenStorage.saveUser(localUser);
      }
    });
  }
}
