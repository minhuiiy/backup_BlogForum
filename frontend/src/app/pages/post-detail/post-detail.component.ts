import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { BlogService } from '../../_services/blog.service';
import { CommentService } from '../../_services/comment.service';
import { TokenStorageService } from '../../_services/token-storage.service';
import { CommunityMockService } from '../../_services/community-mock.service';
import { AuthModalService } from '../../_services/auth-modal.service';
import { ImageModalService } from '../../_services/image-modal.service';
import { WebSocketService } from '../../_services/websocket.service';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { SafeHtmlPipe } from '../../_pipes/safe-html.pipe';
import { TimeAgoPipe } from '../../_pipes/time-ago.pipe';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SafeHtmlPipe, TimeAgoPipe],
  templateUrl: './post-detail.component.html',
  styleUrls: ['./post-detail.component.css']
})
export class PostDetailComponent implements OnInit, OnDestroy {
  post: any = null;
  comments: any[] = [];
  postId!: number;
  newCommentContent = '';
  replyingToId: number | null = null;
  replyContent = '';
  isLoggedIn = false;
  likedPosts: Set<number> = new Set();
  likedCommentIds: Set<number> = new Set();
  expandedReplies: Set<number> = new Set();
  showMainGifPicker = false;
  activeReplyGifPicker: number | null = null;
  selectedMainGif: string | null = null;
  selectedReplyGifs: { [key: number]: string } = {};

  availableGifs: string[] = [
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzY2NGNwOWNua3g2ZzYycWI4d3JxaWpjd240dXp4N2d3cmppY2RnYiZlcD12MV9naWZzX3RyZW5kaW5nJmN0PWc/l2JhCYVlbiCCxCrJe/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzY2NGNwOWNua3g2ZzYycWI4d3JxaWpjd240dXp4N2d3cmppY2RnYiZlcD12MV9naWZzX3RyZW5kaW5nJmN0PWc/MahDrOWLffiMKpiVV0/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzY2NGNwOWNua3g2ZzYycWI4d3JxaWpjd240dXp4N2d3cmppY2RnYiZlcD12MV9naWZzX3RyZW5kaW5nJmN0PWc/l0MYzLLxlJDfYtzy0/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzY2NGNwOWNua3g2ZzYycWI4d3JxaWpjd240dXp4N2d3cmppY2RnYiZlcD12MV9naWZzX3RyZW5kaW5nJmN0PWc/l0MYzLLxlJDfYtzy0/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzY2NGNwOWNua3g2ZzYycWI4d3JxaWpjd240dXp4N2d3cmppY2RnYiZlcD12MV9naWZzX3RyZW5kaW5nJmN0PWc/l0MYzLLxlJDfYtzy0/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzY2NGNwOWNua3g2ZzYycWI4d3JxaWpjd240dXp4N2d3cmppY2RnYiZlcD12MV9naWZzX3RyZW5kaW5nJmN0PWc/l0MYzLLxlJDfYtzy0/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzY2NGNwOWNua3g2ZzYycWI4d3JxaWpjd240dXp4N2d3cmppY2RnYiZlcD12MV9naWZzX3RyZW5kaW5nJmN0PWc/l0MYzLLxlJDfYtzy0/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzY2NGNwOWNua3g2ZzYycWI4d3JxaWpjd240dXp4N2d3cmppY2RnYiZlcD12MV9naWZzX3RyZW5kaW5nJmN0PWc/l0MYzLLxlJDfYtzy0/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzY2NGNwOWNua3g2ZzYycWI4d3JxaWpjd240dXp4N2d3cmppY2RnYiZlcD12MV9naWZzX3RyZW5kaW5nJmN0PWc/l0MYzLLxlJDfYtzy0/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzY2NGNwOWNua3g2ZzYycWI4d3JxaWpjd240dXp4N2d3cmppY2RnYiZlcD12MV9naWZzX3RyZW5kaW5nJmN0PWc/l0MYzLLxlJDfYtzy0/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzY2NGNwOWNua3g2ZzYycWI4d3JxaWpjd240dXp4N2d3cmppY2RnYiZlcD12MV9naWZzX3RyZW5kaW5nJmN0PWc/l0MYzLLxlJDfYtzy0/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzY2NGNwOWNua3g2ZzYycWI4d3JxaWpjd240dXp4N2d3cmppY2RnYiZlcD12MV9naWZzX3RyZW5kaW5nJmN0PWc/l0MYzLLxlJDfYtzy0/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzY2NGNwOWNua3g2ZzYycWI4d3JxaWpjd240dXp4N2d3cmppY2RnYiZlcD12MV9naWZzX3RyZW5kaW5nJmN0PWc/l0MYzLLxlJDfYtzy0/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzY2NGNwOWNua3g2ZzYycWI4d3JxaWpjd240dXp4N2d3cmppY2RnYiZlcD12MV9naWZzX3RyZW5kaW5nJmN0PWc/l0MYzLLxlJDfYtzy0/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzY2NGNwOWNua3g2ZzYycWI4d3JxaWpjd240dXp4N2d3cmppY2RnYiZlcD12MV9naWZzX3RyZW5kaW5nJmN0PWc/l0MYzLLxlJDfYtzy0/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzY2NGNwOWNua3g2ZzYycWI4d3JxaWpjd240dXp4N2d3cmppY2RnYiZlcD12MV9naWZzX3RyZW5kaW5nJmN0PWc/l0MYzLLxlJDfYtzy0/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzY2NGNwOWNua3g2ZzYycWI4d3JxaWpjd240dXp4N2d3cmppY2RnYiZlcD12MV9naWZzX3RyZW5kaW5nJmN0PWc/l0MYzLLxlJDfYtzy0/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzY2NGNwOWNua3g2ZzYycWI4d3JxaWpjd240dXp4N2d3cmppY2RnYiZlcD12MV9naWZzX3RyZW5kaW5nJmN0PWc/l0MYzLLxlJDfYtzy0/giphy.gif'
  ];

  highlightedCommentId: number | null = null;
  sortOption: string = 'newest';
  currentUser: any;
  wsSubscription!: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private blogService: BlogService,
    private commentService: CommentService,
    private tokenStorage: TokenStorageService,
    public commMock: CommunityMockService,
    private authModalService: AuthModalService,
    private imageModalService: ImageModalService,
    private webSocketService: WebSocketService,
    private location: Location,
    private http: HttpClient,
    private titleService: Title
  ) { }

  goBack(): void {
    this.location.back();
  }

  ngOnInit(): void {
    this.isLoggedIn = !!this.tokenStorage.getToken();
    if (this.isLoggedIn) {
      this.currentUser = this.tokenStorage.getUser();
      this.blogService.getLikedPosts().subscribe({
        next: ids => {
          this.likedPosts = new Set(ids);
        },
        error: err => console.error(err)
      });
    }

    this.route.params.subscribe(params => {
      this.postId = +params['id'];
      this.loadPost();
      this.loadComments();
    });

    this.route.fragment.subscribe(fragment => {
      if (fragment && fragment.startsWith('comment-')) {
        const cId = parseInt(fragment.split('-')[1], 10);
        if (!isNaN(cId)) {
          this.highlightedCommentId = cId;
          this.scrollToComment(fragment);
        }
      } else {
        // If there's no fragment (e.g. clicking a Post Like notification), scroll to top of the post
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    this.wsSubscription = this.webSocketService.notifications.subscribe(msg => {
      if (msg.includes('bình luận') || msg.includes('post')) {
        this.loadComments();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
    }
  }

  scrollToComment(fragment: string): void {
    const targetId = parseInt(fragment.split('-')[1], 10);
    if (!isNaN(targetId)) {
        this.expandAncestorsOf(targetId, this.comments);
    }

    // Attempt scroll after a brief delay so Angular DOM renders comments
    setTimeout(() => {
      const element = document.getElementById(fragment);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          this.highlightedCommentId = null;
        }, 3000);
      } else {
        // Retry a bit later if data is still loading
        setTimeout(() => {
          const retryElement = document.getElementById(fragment);
          if (retryElement) {
            retryElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => this.highlightedCommentId = null, 3000);
          }
        }, 1000);
      }
    }, 500);
  }

  loadPost(): void {
    this.blogService.getPostById(this.postId).subscribe({
      next: data => {
        this.post = data;
        this.titleService.setTitle(`${this.post.title || 'Bài viết'} - blogforum`);
      },
      error: err => console.error(err)
    });
  }

  loadComments(): void {
    this.commentService.getCommentsByPost(this.postId).subscribe({
      next: data => {
        this.comments = data;
        this.sortCommentsList(this.comments);
      },
      error: err => console.error(err)
    });
  }

  sortCommentsList(commentsList: any[] = this.comments): void {
    if (!commentsList || commentsList.length === 0) return;
    
    commentsList.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      if (this.sortOption === 'newest') {
        return dateB - dateA;
      } else {
        return dateA - dateB;
      }
    });

    // Recursively sort replies
    commentsList.forEach(c => {
      if (c.replies && c.replies.length > 0) {
        this.sortCommentsList(c.replies);
      }
    });
  }

  expandAncestorsOf(targetId: number, commentsList: any[]): boolean {
    if (!commentsList) return false;
    for (const c of commentsList) {
      if (c.id === targetId) return true;
      if (c.replies && c.replies.length > 0) {
        const foundInChildren = this.expandAncestorsOf(targetId, c.replies);
        if (foundInChildren) {
          this.expandedReplies.add(c.id);
          return true;
        }
      }
    }
    return false;
  }

  submitComment(): void {
    if (!this.newCommentContent.trim() && !this.selectedMainGif) {
      alert('Vui lòng nhập nội dung hoặc chọn GIF');
      return;
    }

    let finalContent = this.newCommentContent;
    if (this.selectedMainGif) {
      finalContent += `\n<img src="${this.selectedMainGif}" alt="gif" class="comment-attached-img" loading="lazy" decoding="async" />\n`;
    }

    if (!finalContent.trim()) return;

    this.commentService.addComment(this.postId, finalContent).subscribe({
      next: (res) => {
        this.newCommentContent = '';
        this.selectedMainGif = null;
        this.loadComments();
      },
      error: err => {
        console.error(err);
        alert('Có lỗi xảy ra khi gọi bình luận');
      }
    });
  }

  votePost(): void {
    if (!this.isLoggedIn) {
      this.authModalService.open();
      return;
    }

    if (this.likedPosts.has(this.postId)) {
      this.likedPosts.delete(this.postId);
    } else {
      this.likedPosts.add(this.postId);
    }

    this.blogService.votePost(this.postId).subscribe({
      next: data => {
        if (this.post) {
          this.post.likes = data.likes;
        }
      },
      error: err => {
        console.error(err);
        if (this.likedPosts.has(this.postId)) {
          this.likedPosts.delete(this.postId);
        } else {
          this.likedPosts.add(this.postId);
        }
      }
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

  isPostLiked(): boolean {
    return this.likedPosts.has(this.postId);
  }

  isCommentLiked(commentId: number): boolean {
    return this.likedCommentIds.has(commentId);
  }

  toggleCommentLike(commentId: number): void {
    if (!this.isLoggedIn) {
      this.authModalService.open();
      return;
    }
    if (this.likedCommentIds.has(commentId)) {
      this.likedCommentIds.delete(commentId);
    } else {
      this.likedCommentIds.add(commentId);
    }
  }

  setReply(commentId: number): void {
    if (!this.isLoggedIn) {
      this.authModalService.open();
      return;
    }
    if (this.replyingToId === commentId) {
      this.replyingToId = null;
    } else {
      this.replyingToId = commentId;
      this.replyContent = '';
    }
  }

  submitReply(parentId: number): void {
    if (!this.replyContent.trim() && !this.selectedReplyGifs[parentId]) {
      alert('Vui lòng nhập phản hồi hoặc chọn GIF');
      return;
    }

    let finalContent = this.replyContent;
    if (this.selectedReplyGifs[parentId]) {
      finalContent += `\n<img src="${this.selectedReplyGifs[parentId]}" alt="gif" class="comment-attached-img" loading="lazy" decoding="async" />\n`;
    }

    if (!finalContent.trim()) return;

    this.commentService.addComment(this.postId, finalContent, parentId).subscribe({
      next: () => {
        this.replyContent = '';
        this.replyingToId = null;
        delete this.selectedReplyGifs[parentId];
        this.loadComments();
      },
      error: err => console.error(err)
    });
  }

  deleteComment(commentId: number): void {
    if (confirm('Bạn có chắc chắn muốn xóa bình luận này không?')) {
      this.commentService.deleteComment(commentId).subscribe({
        next: () => this.loadComments(),
        error: err => console.error(err)
      });
    }
  }

  isRepliesExpanded(commentId: number): boolean {
    return this.expandedReplies.has(commentId);
  }

  toggleReplies(commentId: number): void {
    if (this.expandedReplies.has(commentId)) {
      this.expandedReplies.delete(commentId);
    } else {
      this.expandedReplies.add(commentId);
    }
  }

  toggleMainGifPicker(): void {
    if (!this.isLoggedIn) {
      this.authModalService.open();
      return;
    }
    this.showMainGifPicker = !this.showMainGifPicker;
    this.activeReplyGifPicker = null; // close all reply pickers
  }

  toggleReplyGifPicker(commentId: number): void {
    if (!this.isLoggedIn) {
      this.authModalService.open();
      return;
    }
    if (this.activeReplyGifPicker === commentId) {
      this.activeReplyGifPicker = null;
    } else {
      this.activeReplyGifPicker = commentId;
      this.showMainGifPicker = false; // close main picker
    }
  }

  insertGif(gifUrl: string, isReply: boolean): void {
    if (isReply) {
      if (this.activeReplyGifPicker !== null) {
        this.selectedReplyGifs[this.activeReplyGifPicker] = gifUrl;
      }
      this.activeReplyGifPicker = null;
    } else {
      this.selectedMainGif = gifUrl;
      this.showMainGifPicker = false;
    }
  }

  removeMainGif(): void {
    this.selectedMainGif = null;
  }

  removeReplyGif(commentId: number): void {
    delete this.selectedReplyGifs[commentId];
  }

  openLoginModal(): void {
    this.authModalService.open();
  }
}
