import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { OnboardingModalService } from '../../_services/onboarding-modal.service';
import { TokenStorageService } from '../../_services/token-storage.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-onboarding-wizard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './onboarding-wizard.component.html',
  styleUrls: ['./onboarding-wizard.component.css']
})
export class OnboardingWizardComponent implements OnInit {
  step = 1;

  gender: string = '';
  selectedInterests: string[] = [];
  selectedTags: string[] = [];

  readonly interestsList = [
    { name: 'Nghệ thuật', icon: '🎨' },
    { name: 'Làm đẹp', icon: '💄' },
    { name: 'Nghề nghiệp', icon: '💼' },
    { name: 'Giải trí', icon: '🍿' },
    { name: 'Tài chính', icon: '📈' },
    { name: 'Thực phẩm', icon: '🍔' },
    { name: 'Trò chơi', icon: '🎮' },
    { name: 'Tin tức', icon: '📰' },
    { name: 'Thể thao', icon: '⚽' },
    { name: 'Công nghệ', icon: '💻' },
    { name: 'Du lịch', icon: '✈️' },
    { name: 'Sức khỏe', icon: '🌿' }
  ];

  readonly tagsList = [
    'AI', 'Điện thoại thông minh', 'Lắp ráp PC', 'FinTech', 'Lập trình',
    'Momo', 'An ninh mạng', 'Tiện ích', 'Điện toán đám mây', 'Tập đoàn FPT',
    'Xe điện', 'Học máy', 'Phát triển web', 'Các công ty khởi nghiệp Việt Nam',
    'Máy bay không người lái', 'Apple', 'Android', 'Khoa học dữ liệu',
    'Nền tảng Thương mại điện tử', 'Phát triển trò chơi'
  ];

  constructor(
    public onboardingModalService: OnboardingModalService,
    private http: HttpClient,
    private router: Router,
    private tokenStorage: TokenStorageService
  ) {}

  ngOnInit(): void {}

  close(): void {
    if (this.step < 4) {
      this.onboardingModalService.close();
      window.location.reload(); // Skip the wizard, assume they don't want it now
    }
  }

  skip(): void {
    this.goToNextStep();
  }

  setGender(val: string): void {
    this.gender = val;
    this.goToNextStep();
  }

  toggleInterest(val: string): void {
    const index = this.selectedInterests.indexOf(val);
    if (index > -1) {
      this.selectedInterests.splice(index, 1);
    } else {
      this.selectedInterests.push(val);
    }
  }

  toggleTag(val: string): void {
    const index = this.selectedTags.indexOf(val);
    if (index > -1) {
      this.selectedTags.splice(index, 1);
    } else {
      this.selectedTags.push(val);
    }
  }

  goToNextStep(): void {
    if (this.step === 3) {
      this.submitOnboarding();
    } else {
      this.step++;
    }
  }

  goBack(): void {
    if (this.step > 1 && this.step < 4) {
      this.step--;
    }
  }

  submitOnboarding(): void {
    this.step = 4; // Loading step
    const payload = {
      gender: this.gender || 'Unknown',
      interests: this.selectedInterests,
      tags: this.selectedTags
    };

    this.http.post(environment.apiUrl + '/auth/onboarding', payload).subscribe({
      next: () => {
        // Update local storage so it doesn't prompt again
        const user = this.tokenStorage.getUser();
        user.onboardingCompleted = true;
        this.tokenStorage.saveUser(user);
        
        setTimeout(() => {
          this.onboardingModalService.close();
          window.location.reload(); // Reload to start app fresh
        }, 2000);
      },
      error: (err) => {
        console.error('Lỗi khi lưu thiết lập', err);
        // Fallback
        setTimeout(() => {
          this.onboardingModalService.close();
          window.location.reload();
        }, 1000);
      }
    });
  }
}
