import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { combineLatest, Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { BlogService } from '../../_services/blog.service';
import { FileService, UploadResponse } from '../../_services/file.service';
import { CommunityMockService } from '../../_services/community-mock.service';
import { TokenStorageService } from '../../_services/token-storage.service';
import { TagService, Tag } from '../../_services/tag.service';
import { QuillModule } from 'ngx-quill';
import { HttpEvent, HttpEventType, HttpResponse } from '@angular/common/http';

@Component({
  selector: 'app-create-post',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, QuillModule],
  templateUrl: './create-post.component.html',
  styleUrls: ['./create-post.component.css']
})
export class CreatePostComponent implements OnInit {
  form: any = { title: '', content: '' };
  isSuccessful = false;
  isFailed = false;
  errorMessage = '';
  activeTab = 'text';

  // Edit mode
  editPostId: number | null = null;
  isEditMode = false;

  // Community selection UI
  communities: any[] = [];
  selectedCommunity: any = null;
  showDropdown = false;

  // Tag selection UI
  selectedTags: Tag[] = [];
  tagInput = '';
  tagSuggestions: Tag[] = [];
  showTagSuggestions = false;
  private tagSearch$ = new Subject<string>();

  // Drag & Drop UI variables
  isDragOver = false;
  uploadedMedia: { url: string, type: string }[] = [];
  isUploading = false;

  quillModules = {
    toolbar: [
      ['bold', 'italic', 'strike'], 
      ['blockquote', 'code-block'],
      [{ 'script': 'sub'}, { 'script': 'super' }], 
      [{ 'list': 'bullet' }, { 'list': 'ordered'}],
      ['link']
    ]
  };

  constructor(
    private blogService: BlogService,
    private fileService: FileService,
    private commMock: CommunityMockService,
    private router: Router,
    private route: ActivatedRoute,
    private tokenStorage: TokenStorageService,
    private tagService: TagService
  ) {}

  ngOnInit() {
    const user = this.tokenStorage.getUser();
    const username = user?.username;

    // Fetch dữ liệu từ API
    this.commMock.fetchAllCommunities();
    if (username) {
      this.commMock.fetchMyMemberships(username);
    }

    // Kết hợp communities và memberships, chỉ giữ cộng đồng user đã join
    combineLatest([
      this.commMock.communities$,
      this.commMock.membersMap$
    ]).subscribe(([allComms, membersMap]) => {
      if (!username) {
        this.communities = [];
        return;
      }
      this.communities = allComms.filter(c => {
        const key = c.name?.toLowerCase();
        return membersMap[key] && membersMap[key][username] !== undefined;
      });
    });

    // Tag autocomplete: debounce 300ms
    this.tagSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => q.length >= 1 ? this.tagService.searchTags(q) : of([]))
    ).subscribe((tags: any[]) => {
      this.tagSuggestions = tags.filter(t => !this.selectedTags.find(s => s.name === t.name));
      this.showTagSuggestions = this.tagSuggestions.length > 0;
    });

    this.route.queryParams.subscribe(params => {
      const commName = params['community'];
      if (commName) {
        let found = this.communities.find(c => c.name.toLowerCase() === commName.toLowerCase());
        if (!found) {
          found = { name: commName, description: 'Cộng đồng chỉ định từ URL' };
        }
        this.selectedCommunity = found;
      }

      // Edit mode: load bài cũ
      const editId = params['edit'];
      if (editId) {
        this.editPostId = +editId;
        this.isEditMode = true;
        this.blogService.getPostById(this.editPostId).subscribe({
          next: (post: any) => {
            this.form.title = post.title || '';
            this.form.content = post.content || '';
            if (post.category) {
              this.selectedCommunity = post.category;
            }
            if (post.tags) {
              this.selectedTags = post.tags;
            }
          },
          error: () => console.error('Không tải được bài viết')
        });
      }
    });
  }

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
  }

  selectCommunity(comm: any) {
    this.selectedCommunity = comm;
    this.showDropdown = false;
  }

  // === Tag methods ===
  onTagInput() {
    const q = this.tagInput.trim();
    if (q.length >= 1) {
      this.tagSearch$.next(q);
    } else {
      this.showTagSuggestions = false;
    }
  }

  addTag(name: string) {
    const normalized = name.trim().toLowerCase().replace(/\s+/g, '-');
    if (!normalized || this.selectedTags.find(t => t.name === normalized) || this.selectedTags.length >= 5) return;
    // Tạo array mới để Angular change detection nhận ra
    this.selectedTags = [...this.selectedTags, { name: normalized }];
    this.tagInput = '';
    this.showTagSuggestions = false;
  }

  selectSuggestion(tag: Tag) {
    this.addTag(tag.name);
  }

  removeTag(index: number) {
    // Tạo array mới thay vì splice (mutation)
    this.selectedTags = this.selectedTags.filter((_, i) => i !== index);
  }

  onTagKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      if (this.tagInput.trim()) this.addTag(this.tagInput);
    } else if (event.key === 'Backspace' && !this.tagInput && this.selectedTags.length > 0) {
      // Tạo array mới thay vì pop (mutation)
      this.selectedTags = this.selectedTags.slice(0, -1);
    }
  }

  // Delay ẩn suggestions để mousedown trên suggestion kịp fire trước blur
  onTagBlur() {
    setTimeout(() => { this.showTagSuggestions = false; }, 150);
  }

  get titleLength(): number { return this.form.title ? this.form.title.length : 0; }

  isFormReady(): boolean {
    // Không bắt buộc chọn cộng đồng
    if (this.activeTab === 'media') {
      return this.titleLength > 0 && this.uploadedMedia.length > 0 && !this.isUploading;
    }
    return this.titleLength > 0 && ((this.form.content && this.form.content.trim().length > 0) || this.uploadedMedia.length > 0);
  }

  selectTab(tabId: string) { this.activeTab = tabId; }

  // Drag & Drop events
  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = true;
  }
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
  }
  onFileDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.handleFiles(event.dataTransfer.files);
    }
  }
  onFileSelected(event: any) {
    if (event.target.files.length > 0) {
      this.handleFiles(event.target.files);
    }
  }

  handleFiles(files: FileList) {
    this.isUploading = true;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.match(/image\/*/) || file.type.match(/video\/*/)) {
        this.fileService.upload(file).subscribe({
          next: (event: HttpEvent<any>) => {
            if (event.type === HttpEventType.Response && event.body) {
              this.uploadedMedia.push({
                url: event.body.fileDownloadUri,
                type: event.body.fileType || file.type
              });
            }
          },
          error: (err) => {
            console.error('Lỗi khi tải lên file: ', err);
            this.errorMessage = 'Một tệp đã bị lỗi tải lên. Dung lượng có vượt quá 20MB?';
            this.isFailed = true;
          },
          complete: () => { this.isUploading = false; }
        });
      }
    }
  }

  removeMedia(index: number) { this.uploadedMedia.splice(index, 1); }

  onSubmit(): void {
    if (!this.isFormReady()) return;

    let finalContent = this.activeTab === 'text' ? (this.form.content || '') : '';
    
    if (this.uploadedMedia.length > 0) {
      let mediaHtml = '<div class="post-attachments-grid" style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 24px;">';
      this.uploadedMedia.forEach(m => {
        if (m.type.startsWith('image/')) {
             mediaHtml += `<div class="post-media-block" style="flex: 1 1 calc(50% - 8px); min-width: 250px;"><img src="${m.url}" style="width: 100%; height: auto; border-radius: 12px; margin: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" /></div>`;
        } else {
             mediaHtml += `<div class="post-media-block" style="flex: 1 1 calc(50% - 8px); min-width: 250px;"><video controls src="${m.url}" style="width: 100%; border-radius: 12px; margin: 0;"></video></div>`;
        }
      });
      mediaHtml += '</div>';

      if (this.activeTab === 'text') {
        finalContent += mediaHtml;
      } else {
        finalContent = mediaHtml;
      }
    }
    
    const postPayload: any = { ...this.form, content: finalContent };

    if (this.selectedCommunity) {
      postPayload.category = { name: this.selectedCommunity.name };
    }
    if (this.selectedTags.length > 0) {
      postPayload.tags = this.selectedTags;
    }

    // ===== EDIT MODE =====
    if (this.isEditMode && this.editPostId) {
      postPayload.id = this.editPostId;
      this.blogService.updatePost(postPayload).subscribe({
        next: data => {
          this.isSuccessful = true;
          this.isFailed = false;
          setTimeout(() => { this.router.navigate(['/post', data.id]); }, 1200);
        },
        error: err => {
          this.errorMessage = err.error?.message || 'Lỗi khi lưu bài viết';
          this.isFailed = true;
        }
      });
      return;
    }
    
    // ===== CREATE MODE =====
    this.blogService.createPost(postPayload).subscribe({
      next: data => {
        this.isSuccessful = true;
        this.isFailed = false;
        
        if (this.selectedCommunity && data.id) {
          this.commMock.addPostToCommunity(this.selectedCommunity.name, data.id);
        }
        
        const isPending = data.status === 'PENDING';
        if (isPending && this.selectedCommunity) {
          setTimeout(() => {
            this.router.navigate(['/r', this.selectedCommunity.name]);
          }, 2000);
        } else {
          setTimeout(() => { this.router.navigate(['/post', data.id || '']); }, 1500);
        }
      },
      error: err => {
        this.errorMessage = err.error?.message || 'Lỗi khi đăng bài';
        this.isFailed = true;
      }
    });
  }
}
