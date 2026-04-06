import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { BlogService } from '../../_services/blog.service';
import { TokenStorageService } from '../../_services/token-storage.service';
import { ImageModalService } from '../../_services/image-modal.service';
import { CommunityMockService } from '../../_services/community-mock.service';
import { AuthModalService } from '../../_services/auth-modal.service';
import { SafeHtmlPipe } from '../../_pipes/safe-html.pipe';
import { TimeAgoPipe } from '../../_pipes/time-ago.pipe';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, RouterModule, SafeHtmlPipe, TimeAgoPipe],
  templateUrl: './search.html',
  styleUrl: './search.css'
})
export class Search implements OnInit {
  searchQuery: string = '';
  posts: any[] = [];
  users: any[] = [];
  loading: boolean = false;
  isLoggedIn: boolean = false;
  currentUser: any;
  likedPosts: Set<number> = new Set();

  constructor(
    private route: ActivatedRoute,
    private blogService: BlogService,
    private tokenStorage: TokenStorageService,
    private imageModalService: ImageModalService,
    public commMock: CommunityMockService,
    private authModalService: AuthModalService,
    private titleService: Title
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = !!this.tokenStorage.getToken();
    if (this.isLoggedIn) {
      this.currentUser = this.tokenStorage.getUser();
      this.blogService.getLikedPosts().subscribe({
        next: ids => this.likedPosts = new Set(ids),
        error: err => console.error(err)
      });
    }

    this.route.queryParams.subscribe(params => {
      this.searchQuery = params['q'] || '';
      if (this.searchQuery.trim()) {
        this.titleService.setTitle(`${this.searchQuery} - blogforum`);
        this.performSearch();
      } else {
        this.titleService.setTitle('Tìm kiếm - blogforum');
        this.posts = [];
      }
    });
  }

  performSearch(): void {
    this.loading = true;
    
    // Search Posts
    this.blogService.searchPosts(this.searchQuery).subscribe({
      next: data => {
        const rawPosts = data.content ? data.content : data;
        this.posts = rawPosts.map((post: any) => this.processPostContent(post));
        this.loading = false;
      },
      error: err => {
        console.error(err);
        this.loading = false;
      }
    });

    // Search Users
    this.blogService.searchUsers(this.searchQuery).subscribe({
      next: data => {
        this.users = data;
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
      alert("Bạn cần đăng nhập để thao tác");
      return;
    }
    const isLiked = this.isPostLiked(post.id);
    this.blogService.votePost(post.id).subscribe({
      next: () => {
        if (isLiked) {
          this.likedPosts.delete(post.id);
          post.likes--;
        } else {
          this.likedPosts.add(post.id);
          post.likes++;
        }
      },
      error: err => console.error(err)
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
}
