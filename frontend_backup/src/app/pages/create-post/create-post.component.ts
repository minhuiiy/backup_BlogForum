import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { BlogService } from '../../_services/blog.service';
import { FileService, UploadResponse } from '../../_services/file.service';
import { CommunityMockService } from '../../_services/community-mock.service';
import { TokenStorageService } from '../../_services/token-storage.service';
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

  // Community selection UI
  communities: any[] = [];
  selectedCommunity: any = null;
  showDropdown = false;

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
      ['link', 'image', 'video']
    ]
  };

  constructor(
    private blogService: BlogService, 
    private fileService: FileService,
    private commMock: CommunityMockService,
    private router: Router,
    private route: ActivatedRoute,
    private tokenStorage: TokenStorageService
  ) {
    const user = this.tokenStorage.getUser();
    const currentUsername = user ? user.username : null;

    this.commMock.communities$.subscribe(list => {
      if (currentUsername) {
        this.communities = list.filter(c => this.commMock.isJoined(c.name, currentUsername));
      } else {
        this.communities = [];
      }
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const commName = params['community'];
      if (commName) {
        // Tìm cộng đồng trong sách mock
        let found = this.communities.find(c => c.name.toLowerCase() === commName.toLowerCase());
        if (!found) {
          // Nếu không nằm trong d/s đã join, tạo một lựa chọn mock tạm
          found = { name: commName, description: 'Cộng đồng chỉ định từ URL' };
        }
        this.selectedCommunity = found;
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

  get titleLength(): number { return this.form.title ? this.form.title.length : 0; }

  isFormReady(): boolean {
    if (this.activeTab === 'media') {
      return this.titleLength > 0 && this.uploadedMedia.length > 0 && !this.isUploading;
    }
    return this.titleLength > 0 && this.form.content && this.form.content.trim().length > 0;
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

    if (this.activeTab === 'media') {
      let mediaHtml = '';
      this.uploadedMedia.forEach(m => {
        if (m.type.startsWith('image/')) {
             mediaHtml += `<div class="post-media-block"><img src="${m.url}" style="max-width: 100%; border-radius: 4px;" /></div><br/>`;
        } else {
             mediaHtml += `<div class="post-media-block"><video controls src="${m.url}" style="max-width: 100%; border-radius: 4px;"></video></div><br/>`;
        }
      });
      this.form.content = mediaHtml;
    }
    
    // Đính kèm category nếu có
    if (this.selectedCommunity) {
      this.form.category = { name: this.selectedCommunity.name };
    }
    
    this.blogService.createPost(this.form).subscribe({
      next: data => {
        this.isSuccessful = true;
        this.isFailed = false;
        
        // Link to community if one was selected
        if (this.selectedCommunity && data.id) {
          this.commMock.addPostToCommunity(this.selectedCommunity.name, data.id);
        }
        
        setTimeout(() => { this.router.navigate(['/post', data.id || '']); }, 1500);
      },
      error: err => {
        this.errorMessage = err.error?.message || 'Lỗi khi đăng bài';
        this.isFailed = true;
      }
    });
  }
}
