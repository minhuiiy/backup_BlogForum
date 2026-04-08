import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SidebarService } from '../../_services/sidebar.service';
import { CommunityMockService } from '../../_services/community-mock.service';
import { TokenStorageService } from '../../_services/token-storage.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  toggleCommunities = true;
  joinedCommunities: {name: string, url: string}[] = [];
  isAdmin = false;

  constructor(
    public sidebarService: SidebarService,
    public commMock: CommunityMockService,
    private tokenStorage: TokenStorageService
  ) { }

  ngOnInit(): void {
    const user = this.tokenStorage.getUser();
    if (!user || Object.keys(user).length === 0 || !user.username) {
      // Not logged in or invalid token
      return;
    }

    if (user.roles && user.roles.includes('ROLE_ADMIN')) {
      this.isAdmin = true;
    }

    this.commMock.membersMap$.subscribe(map => {
       const list = [];
       for (const commName in map) {
          if (map[commName][user.username]) {
             list.push({
                name: commName,
                url: '/r/' + commName
             });
          }
       }
       // Sort alphabetically
       list.sort((a, b) => a.name.localeCompare(b.name));
       this.joinedCommunities = list;
    });
  }
}

