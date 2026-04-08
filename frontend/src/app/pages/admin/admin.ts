import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../_services/admin.service';
import { TimeAgoPipe } from '../../_pipes/time-ago.pipe';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TimeAgoPipe],
  templateUrl: './admin.html',
})
export class AdminComponent implements OnInit {
  activeTab = 'stats';
  tabs = [
    { id: 'stats', label: 'Thống kê', icon: 'bar_chart' },
    { id: 'users', label: 'Người dùng', icon: 'group' },
    { id: 'posts', label: 'Bài viết', icon: 'article' },
    { id: 'pending', label: 'Chờ duyệt', icon: 'pending_actions' },
    { id: 'communities', label: 'Cộng đồng', icon: 'communities' },
  ];

  // Toast
  success = '';
  error = '';

  // Stats
  stats: any = null;
  loadingStats = false;

  // Users
  users: any[] = [];
  loadingUsers = false;

  // Posts
  posts: any[] = [];
  loadingPosts = false;
  postsPage = 0;
  postsTotalPages = 1;

  // Pending posts
  pendingPosts: any[] = [];

  // Communities
  communities: any[] = [];
  loadingCommunities = false;

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadStats();
  }

  setTab(tabId: string) {
    this.activeTab = tabId;
    if (tabId === 'stats') this.loadStats();
    if (tabId === 'users' && this.users.length === 0) this.loadUsers();
    if (tabId === 'posts' && this.posts.length === 0) this.loadPosts();
    if (tabId === 'pending') this.loadPending();
    if (tabId === 'communities' && this.communities.length === 0) this.loadCommunities();
  }

  // ===== STATS =====
  loadStats() {
    this.loadingStats = true;
    this.adminService.getStats().subscribe({
      next: data => { this.stats = data; this.loadingStats = false; },
      error: () => this.loadingStats = false
    });
  }

  // ===== USERS =====
  loadUsers(): void {
    this.loadingUsers = true;
    this.adminService.getAllUsers().subscribe({
      next: data => { this.users = data; this.loadingUsers = false; },
      error: () => { this.error = 'Không thể tải danh sách người dùng.'; this.loadingUsers = false; }
    });
  }

  getUserRoleName(user: any): string {
    if (!user.roles || user.roles.length === 0) return 'user';
    const roles = user.roles.map((r: any) => r.name);
    if (roles.includes('ROLE_ADMIN')) return 'admin';
    if (roles.includes('ROLE_MODERATOR')) return 'mod';
    if (roles.includes('ROLE_EXPERT')) return 'expert';
    return 'user';
  }

  changeRole(user: any, event: any): void {
    const newRole = event.target.value;
    this.adminService.updateUserRoles(user.id, [newRole]).subscribe({
      next: updatedUser => {
        user.roles = updatedUser.roles;
        this.toast(`Đã cập nhật vai trò cho @${user.username}`);
      },
      error: () => this.toastError(`Cập nhật vai trò thất bại`)
    });
  }

  toggleLock(user: any): void {
    const newState = !user.locked;
    this.adminService.toggleUserLock(user.id, newState).subscribe({
      next: updatedUser => {
        user.locked = updatedUser.locked;
        this.toast(user.locked ? `Đã khóa @${user.username}` : `Đã mở khóa @${user.username}`);
      },
      error: () => this.toastError('Thao tác thất bại')
    });
  }

  // ===== POSTS =====
  loadPosts(page = 0) {
    this.loadingPosts = true;
    this.postsPage = page;
    this.adminService.getAllPosts(page, 15).subscribe({
      next: data => {
        const raw = data.content || data;
        this.posts = raw;
        this.postsTotalPages = data.totalPages || 1;
        this.loadingPosts = false;
      },
      error: () => this.loadingPosts = false
    });
  }

  loadPending() {
    this.loadingPosts = true;
    this.adminService.getAllPosts(0, 50).subscribe({
      next: data => {
        const raw = data.content || data;
        this.pendingPosts = raw.filter((p: any) => p.status === 'PENDING');
        this.loadingPosts = false;
      },
      error: () => this.loadingPosts = false
    });
  }

  deletePost(post: any) {
    if (!confirm(`Xóa bài "${post.title}"?`)) return;
    this.adminService.deletePost(post.id).subscribe({
      next: () => {
        this.posts = this.posts.filter(p => p.id !== post.id);
        this.pendingPosts = this.pendingPosts.filter(p => p.id !== post.id);
        this.toast('Đã xóa bài viết');
        if (this.stats) this.stats.totalPosts--;
      },
      error: () => this.toastError('Xóa thất bại')
    });
  }

  approvePost(post: any) {
    this.adminService.approvePost(post.id).subscribe({
      next: updated => {
        post.status = 'APPROVED';
        this.pendingPosts = this.pendingPosts.filter(p => p.id !== post.id);
        this.toast(`Đã duyệt: "${post.title}"`);
        if (this.stats) this.stats.pendingPosts = Math.max(0, this.stats.pendingPosts - 1);
      },
      error: () => this.toastError('Duyệt thất bại')
    });
  }

  rejectPost(post: any) {
    if (!confirm(`Từ chối bài "${post.title}"?`)) return;
    this.adminService.rejectPost(post.id).subscribe({
      next: () => {
        this.pendingPosts = this.pendingPosts.filter(p => p.id !== post.id);
        this.posts = this.posts.filter(p => p.id !== post.id);
        this.toast('Đã từ chối bài viết');
        if (this.stats) this.stats.pendingPosts = Math.max(0, this.stats.pendingPosts - 1);
      },
      error: () => this.toastError('Từ chối thất bại')
    });
  }

  // ===== COMMUNITIES =====
  loadCommunities() {
    this.loadingCommunities = true;
    this.adminService.getAllCommunities().subscribe({
      next: data => { this.communities = data; this.loadingCommunities = false; },
      error: () => this.loadingCommunities = false
    });
  }

  deleteCommunity(comm: any) {
    if (!confirm(`Xóa cộng đồng "${comm.name}"? Toàn bộ bài viết trong cộng đồng cũng sẽ bị xóa!`)) return;
    this.adminService.deleteCommunity(comm.id).subscribe({
      next: () => {
        this.communities = this.communities.filter(c => c.id !== comm.id);
        this.toast(`Đã xóa cộng đồng ${comm.name}`);
        if (this.stats) this.stats.totalCommunities--;
      },
      error: () => this.toastError('Xóa cộng đồng thất bại')
    });
  }

  // ===== HELPERS =====
  toast(msg: string) {
    this.success = msg; this.error = '';
    setTimeout(() => this.success = '', 3500);
  }
  toastError(msg: string) {
    this.error = msg; this.success = '';
    setTimeout(() => this.error = '', 3500);
  }

  getStatusBadge(status: string): string {
    if (status === 'PENDING') return 'bg-amber-100 text-amber-700';
    if (status === 'APPROVED') return 'bg-green-100 text-green-700';
    if (status === 'REJECTED') return 'bg-red-100 text-red-700';
    return 'bg-surface-container text-on-surface-variant';
  }

  getStatusLabel(status: string): string {
    if (status === 'PENDING') return 'Chờ duyệt';
    if (status === 'APPROVED') return 'Đã duyệt';
    if (status === 'REJECTED') return 'Từ chối';
    return status || 'Công khai';
  }
}
