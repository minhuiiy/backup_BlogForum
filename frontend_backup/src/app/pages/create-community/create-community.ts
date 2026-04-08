import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommunityMockService } from '../../_services/community-mock.service';
import { TokenStorageService } from '../../_services/token-storage.service';

@Component({
  selector: 'app-create-community',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-community.html',
  styleUrls: ['./create-community.css']
})
export class CreateCommunity {
  currentStep = 1;
  communityName = '';
  communityType = 'public';
  isAdultContent = false;
  selectedTopics: string[] = [];

  // Danh mục chủ đề mô phỏng 100% hình ảnh
  availableTopics = [
    { icon: '📚', name: 'Anime và Cosplay' }, { icon: '🎶', name: 'Âm nhạc' },
    { icon: '🍔', name: 'Ẩm thực' }, { icon: '🌈', name: 'Bản sắc và mối quan hệ' },
    { icon: '💻', name: 'Công nghệ' }, { icon: '✈️', name: 'Địa điểm & du lịch' },
    { icon: '📖', name: 'Đọc và viết' }, { icon: '🧩', name: 'Đồ sưu tầm và sở thích khác' },
    { icon: '🎓', name: 'Giáo dục và nghề nghiệp' }, { icon: '✏️', name: 'H&Đ & câu chuyện' },
    { icon: '🔬', name: 'Khoa học' }, { icon: '💹', name: 'Kinh doanh và tài chính' },
    { icon: '👻', name: 'Ma quái' }, { icon: '🎨', name: 'Nghệ thuật' },
    { icon: '🏠', name: 'Nhà cửa và vườn' }, { icon: '⚖️', name: 'Nhân đạo và luật pháp' },
    { icon: '🎬', name: 'Phim & TV' }, { icon: '❤️', name: 'Sức khỏe' },
    { icon: '🧘', name: 'Sức khỏe tinh thần' }, { icon: '🏅', name: 'Thể thao' },
    { icon: '🌿', name: 'Thiên nhiên và ngoài trời' }, { icon: '👗', name: 'Thời trang và làm đẹp' },
    { icon: '📰', name: 'Tin tức & chính trị' }, { icon: '🕹️', name: 'Trò chơi' },
    { icon: '✨', name: 'Văn hóa đại chúng' }, { icon: '🌐', name: 'Văn hóa Internet' },
    { icon: '🚗', name: 'Xe cộ' }, { icon: '🔞', name: 'Chủ đề 18+' }
  ];

  communityDesc = '';
  existingNames: string[] = [];

  constructor(
    private router: Router, 
    private commMock: CommunityMockService,
    private tokenStorage: TokenStorageService
  ) {
    this.commMock.communities$.subscribe(list => {
      this.existingNames = list.map(c => c.name.toLowerCase());
    });
  }

  get isDuplicate(): boolean {
    if(!this.communityName) return false;
    return this.existingNames.includes(this.communityName.toLowerCase());
  }

  toggleTopic(topicName: string) {
    const index = this.selectedTopics.indexOf(topicName);
    if (index > -1) {
      this.selectedTopics.splice(index, 1);
    } else {
      // Giới hạn chọn tối đa 3 chủ đề (Tùy chọn UX)
      if(this.selectedTopics.length < 3) this.selectedTopics.push(topicName);
    }
  }

  nextStep() {
    if (this.currentStep === 1 && this.selectedTopics.length > 0) {
      this.currentStep = 2;
    } else if (this.currentStep === 2) {
      this.currentStep = 3;
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  createCommunity() {
    if (this.communityName.trim().length < 3 || this.isDuplicate) return;
    
    // Ở bước 3 nhấn Tạo -> Lưu dữ liệu, sau đó chuyển sang màn hình Success (Bước 4)
    const generatedUrl = `/r/${this.communityName}`;
    const newComm = {
      name: this.communityName,
      url: generatedUrl,
      type: this.communityType,
      isAdult: this.isAdultContent,
      topics: this.selectedTopics,
      description: this.communityDesc
    };
    
    this.commMock.addCommunity(newComm);
    
    // Đăng ký quyền Moderator cho người tạo
    const user = this.tokenStorage.getUser();
    if (user && user.username) {
      this.commMock.joinCommunity(this.communityName, user.username, 'moderator');
    }

    this.currentStep = 4; // Bật màn hình Chúc mừng
  }

  goToCommunity() {
    this.router.navigate([`/r/${this.communityName}`]);
  }

  cancel() {
    this.router.navigate(['/']);
  }
}
