import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../_services/auth.service';
import { TokenStorageService } from '../../_services/token-storage.service';
import { AuthModalService } from '../../_services/auth-modal.service';
import { OnboardingModalService } from '../../_services/onboarding-modal.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  form: any = {
    username: '',
    password: ''
  };
  isLoggedIn = false;
  isLoginFailed = false;
  errorMessage = '';


  constructor(
    private authService: AuthService,
    private tokenStorage: TokenStorageService,
    private router: Router,
    private authModalService: AuthModalService,
    private onboardingModalService: OnboardingModalService
  ) { }

  ngOnInit(): void {
    if (this.tokenStorage.getToken()) {
      this.isLoggedIn = true;
      this.close();
    }
  }

  close(): void {
    this.authModalService.close();
  }

  loginWithGoogle(): void {
    const clientId = '131278915848-0l7blp4v8bv7m9fkvs4n89r74767k7ll.apps.googleusercontent.com';
    const redirectUri = encodeURIComponent(window.location.origin + '/auth/google/callback');
    const scope = encodeURIComponent('email profile openid');
    // Nonce ngẫu nhiên để chống CSRF
    const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);

    const googleAuthUrl =
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${clientId}` +
      `&redirect_uri=${redirectUri}` +
      `&response_type=id_token` +
      `&scope=${scope}` +
      `&nonce=${nonce}`;

    window.location.href = googleAuthUrl;
  }

  closeAndNavigateToRegister(): void {
    this.authModalService.close();
    // Use timeout to allow modal animation teardown
    setTimeout(() => {
      this.router.navigate(['/register']);
    }, 50);
  }

  onSubmit(): void {
    const { username, password } = this.form;
    this.authService.login({ username, password }).subscribe({
      next: data => {
        this.tokenStorage.saveToken(data.token);
        this.tokenStorage.saveUser({ username: data.username, id: data.id, email: data.email, roles: data.roles, onboardingCompleted: data.onboardingCompleted });
        this.isLoginFailed = false;
        this.isLoggedIn = true;
        this.close();

        if (data.onboardingCompleted === false) {
          this.onboardingModalService.open();
        } else {
          window.location.reload();
        }
      },
      error: err => {
        this.errorMessage = err.error?.message || 'Lỗi hệ thống: Không thể kết nối tới Server!';
        this.isLoginFailed = true;
      }
    });
  }

  // ============== GIAO DIỆN REDDIT: LẬP TRÌNH TƯƠNG LAI =================
  loginWithApple(): void {
    alert('Apple Login API chưa được tích hợp!');
  }

  loginWithPhone(): void {
    console.log('Khởi chạy đăng nhập qua Số Điện Thoại...');
    /* [HƯỚNG DẪN CODE ĐĂNG NHẬP SMS - TWILIO]
       BƯỚC 1: Tạo Modal bắt user nhập SĐT (ở frontend). Gửi request POST /api/v1/auth/send-otp.
       BƯỚC 2: Backend AuthController gọi Twilio API bắn SMS 6 số vào đt User, rồi response(OK).
       BƯỚC 3: Frontend hiện popup "Nhập OTP". User điền 6 số. Gửi POST /api/v1/auth/verify-otp {phone, otp}.
       BƯỚC 4: Backend cache (Redis/Memory) check OTP đúng. Trả về JWT Token như Login()! 
    */
    alert('Đăng nhập SMS yêu cầu API Twilio ở Spring Boot. Hãy đọc // comment để tiếp tục code nhé!');
  }

  loginWithEmailLink(): void {
    console.log('Khởi chạy Magic Link Email...');
    /* [HƯỚNG DẪN ĐĂNG NHẬP 1 MỘT LẦN (MAGIC LINK)]
       BƯỚC 1: Hỏi User điền [Email]. Endpoint /api/auth/magic-link.
       BƯỚC 2: Spring Boot tạo String Token cực dài ngẫu nhiên lưu SQL (expire 15p). 
               Dùng JavaMailSender tự dộng gửi mail: "Đăng nhập BlogForum với link http://localhost:4200/verify?token=XYZ".
       BƯỚC 3: User bấm link, Angular Route /verify nhận `token`, tự check JWT GET /api/v1/auth/verify?token=XYZ.
       BƯỚC 4: Backend xoá Token một lần, đẩy về Session.
    */
    alert('Tính năng yêu cầu JavaMailSender tích hợp trong Backend. Hãy đọc // comment để code!');
  }
}
