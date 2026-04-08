import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BlogService } from '../../_services/blog.service';
import { ForumService } from '../../_services/forum.service';
import { SafeHtmlPipe } from '../../_pipes/safe-html.pipe';
import { TokenStorageService } from '../../_services/token-storage.service';
import { AuthModalService } from '../../_services/auth-modal.service';
import { ImageModalService } from '../../_services/image-modal.service';
import { CommunityMockService } from '../../_services/community-mock.service';
import { TimeAgoPipe } from '../../_pipes/time-ago.pipe';
import { Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, SafeHtmlPipe, TimeAgoPipe],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  posts: any[] = [];
  questions: any[] = [];
  techNews: any[] = [];
  loadingNews = true;
  suggestedUsers: any[] = [];
  hotCommunities: any[] = [];

  likedPosts: Set<number> = new Set();
  savedPosts: Set<number> = new Set();
  isLoggedIn = false;
  currentUser: any;

  constructor(
    private blogService: BlogService,
    private forumService: ForumService,
    private http: HttpClient,
    private tokenStorage: TokenStorageService,
    private authModalService: AuthModalService,
    private imageModalService: ImageModalService,
    public commMock: CommunityMockService,
    private titleService: Title
  ) { }

  ngOnInit(): void {
    this.titleService.setTitle('BlogForum - Hỏi gì cũng có');
    this.isLoggedIn = !!this.tokenStorage.getToken();
    if (this.isLoggedIn) {
      this.currentUser = this.tokenStorage.getUser();
      this.blogService.getLikedPosts().subscribe({
        next: ids => { this.likedPosts = new Set(ids); },
        error: err => console.error(err)
      });
      this.blogService.getSavedPosts().subscribe({
        next: ids => { this.savedPosts = new Set(ids); },
        error: err => console.error(err)
      });
    }

    this.blogService.getAllPosts().subscribe({
      next: data => {
        const rawPosts = data.content || data;
        this.posts = rawPosts.map((post: any) => this.processPostContent(post));
      },
      error: err => console.error(err)
    });

    this.forumService.getAllQuestions().subscribe({
      next: data => {
        this.questions = data.content || data;
      },
      error: err => console.error(err)
    });

    // Fetch Tech News from Hacker News API
    this.http.get<number[]>('https://hacker-news.firebaseio.com/v0/topstories.json').subscribe({
      next: ids => {
        const top5 = ids.slice(0, 5);
        top5.forEach(id => {
          this.http.get<any>(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).subscribe(story => {
            this.techNews.push(story);
            if (this.techNews.length === 5) {
              this.loadingNews = false;
            }
          });
        });
      },
      error: () => this.loadingNews = false
    });

    // Fetch Suggested Users
    this.blogService.searchUsers('').subscribe({
      next: users => {
        // Lọc bớt chính mình nếu đăng nhập và lấy 5 người
        let filtered = users;
        if (this.isLoggedIn && this.currentUser) {
          filtered = users.filter((u: any) => u.username !== this.currentUser.username);
        }
        this.suggestedUsers = filtered.slice(0, 5);
      },
      error: err => console.error(err)
    });

    // Fetch Hot Communities
    this.http.get<any[]>(environment.apiUrl + '/categories').subscribe({
      next: categories => {
        let filtered = categories;
        if (this.isLoggedIn && this.currentUser) {
          filtered = categories.filter(c => {
             if (!c.members) return true;
             return !c.members.some((m: any) => m.username === this.currentUser.username);
          });
        }
        this.hotCommunities = filtered.slice(0, 5);
      },
      error: err => console.error(err)
    });
  }

  joinCommunity(communityName: string, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    if (!this.isLoggedIn) {
      this.authModalService.open();
      return;
    }
    this.commMock.joinCommunity(communityName, this.currentUser.username, 'member');
  }

  isPostLiked(postId: number): boolean {
    return this.likedPosts.has(postId);
  }

  votePost(post: any): void {
    if (!this.isLoggedIn) {
      this.authModalService.open();
      return;
    }

    // Optimistic UI update
    if (this.likedPosts.has(post.id)) {
      this.likedPosts.delete(post.id);
    } else {
      this.likedPosts.add(post.id);
    }

    this.blogService.votePost(post.id).subscribe({
      next: data => {
        post.likes = data.likes;
      },
      error: err => {
        console.error(err);
        // Revert on error
        if (this.likedPosts.has(post.id)) {
          this.likedPosts.delete(post.id);
        } else {
          this.likedPosts.add(post.id);
        }
      }
    });
  }

  processPostContent(post: any): any {
    if (!post.content) {
      return { ...post, strippedContent: '', extractedImages: [], currentImageIndex: 0 };
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(post.content, 'text/html');
    const images = Array.from(doc.querySelectorAll('img'));

    if (images.length > 0) {
      const extractedImages = images.map(img => img.src);
      images.forEach(img => img.remove());
      return {
        ...post,
        strippedContent: doc.body.innerHTML,
        extractedImages,
        currentImageIndex: 0
      };
    }

    return { ...post, strippedContent: post.content, extractedImages: [], currentImageIndex: 0 };
  }

  nextImage(event: Event, post: any): void {
    event.stopPropagation();
    event.preventDefault();
    if (post.extractedImages && post.currentImageIndex < post.extractedImages.length - 1) {
      post.currentImageIndex++;
    }
  }

  prevImage(event: Event, post: any): void {
    event.stopPropagation();
    event.preventDefault();
    if (post.extractedImages && post.currentImageIndex > 0) {
      post.currentImageIndex--;
    }
  }

  openImageOverlay(imageUrl: string): void {
    this.imageModalService.open(imageUrl);
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

  // ===== SHARE =====
  sharePost(post: any, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      navigator.share({ title: post.title, url });
    } else {
      navigator.clipboard.writeText(url).then(() => {
        alert('Đã sao chép link bài viết!');
      });
    }
  }

  // ===== SAVE / BOOKMARK =====
  isPostSaved(postId: number): boolean {
    return this.savedPosts.has(postId);
  }

  toggleSave(post: any, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (!this.isLoggedIn) {
      this.authModalService.open();
      return;
    }
    const isSaved = this.savedPosts.has(post.id);
    if (isSaved) {
      this.savedPosts.delete(post.id);
      this.blogService.unsavePost(post.id).subscribe({ error: () => this.savedPosts.add(post.id) });
    } else {
      this.savedPosts.add(post.id);
      this.blogService.savePost(post.id).subscribe({ error: () => this.savedPosts.delete(post.id) });
    }
  }
}
