import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './components/navbar/navbar.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { WebSocketService } from './_services/websocket.service';
import { AuthModalService } from './_services/auth-modal.service';
import { LoginComponent } from './pages/login/login.component';
import { OnboardingWizardComponent } from './components/onboarding-wizard/onboarding-wizard.component';
import { ImageModalComponent } from './components/image-modal/image-modal.component';
import { ChatWidget } from './components/chat-widget/chat-widget';
import { TokenStorageService } from './_services/token-storage.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, SidebarComponent, CommonModule, LoginComponent, OnboardingWizardComponent, ImageModalComponent, ChatWidget],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'frontend';
  toastMessage: string | null = null;
  isLoggedIn = false;

  constructor(
    private webSocketService: WebSocketService,
    public authModalService: AuthModalService,
    private tokenStorage: TokenStorageService
  ) { }

  ngOnInit() {
    this.isLoggedIn = !!this.tokenStorage.getUser();
    this.webSocketService.connect();
    this.webSocketService.notifications.subscribe(msg => {
      try {
        const notif = JSON.parse(msg);
        this.toastMessage = notif.content || msg;
      } catch (e) {
        this.toastMessage = msg;
      }
      setTimeout(() => {
        this.toastMessage = null;
      }, 5000);
    });
  }
}
