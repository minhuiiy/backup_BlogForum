import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { TokenStorageService } from '../../_services/token-storage.service';
import { CommunityMockService } from '../../_services/community-mock.service';
import { AuthModalService } from '../../_services/auth-modal.service';
import { SlugifyPipe } from '../../_pipes/slugify.pipe';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, RouterLink, SlugifyPipe],
  templateUrl: './explore.html',
  styleUrls: ['./explore.css']
})
export class Explore implements OnInit {
  communities: any[] = [];
  currentUser: any;

  constructor(
    private http: HttpClient,
    private tokenStorage: TokenStorageService,
    private commMock: CommunityMockService,
    private router: Router,
    private authModalService: AuthModalService
  ) {}

  ngOnInit() {
    this.currentUser = this.tokenStorage.getUser();
    const myUsername = this.currentUser?.username;

    this.http.get<any[]>(environment.apiUrl + '/categories').subscribe({
      next: data => {
        let filtered = data;
        if (myUsername) {
          filtered = data.filter(c => {
            if (!c.members) return true;
            return !c.members.some((m: any) => m.username === myUsername);
          });
        }

        this.communities = filtered.map(c => ({
          id: c.id,
          name: c.name,
          title: c.displayName || c.name,
          members: c.members ? c.members.length : 0,
          description: c.description || 'Chưa có thông tin.',
          icon: c.imageUrl || '',
          banner: ''
        }));
      },
      error: err => console.error(err)
    });
  }

  joinCommunity(comm: any, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.currentUser) {
      this.authModalService.open();
      return;
    }
    
    // Gọi API để join cộng đồng
    this.commMock.joinCommunity(comm.name, this.currentUser.username, 'member');
    
    const slug = comm.name.toLowerCase().trim().replace(/\s+/g, '-');
    setTimeout(() => {
      this.router.navigate(['/community', slug]);
    }, 300);
  }
}
