import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { TokenStorageService } from '../../_services/token-storage.service';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './explore.html',
  styleUrls: ['./explore.css']
})
export class Explore implements OnInit {
  communities: any[] = [];
  currentUser: any;

  constructor(
    private http: HttpClient,
    private tokenStorage: TokenStorageService
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
          description: c.description || 'Chưa có mô tả.',
          icon: c.imageUrl || 'https://www.redditstatic.com/avatars/defaults/v2/avatar_default_2.png',
          banner: 'https://styles.redditmedia.com/t5_2qg6z/styles/bannerBackgroundImage_i51x300w1a7d1.png'
        }));
      },
      error: err => console.error(err)
    });
  }
}
