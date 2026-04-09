import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { TokenStorageService } from '../../_services/token-storage.service';
import { CommunityMockService } from '../../_services/community-mock.service';
import { AuthModalService } from '../../_services/auth-modal.service';
import { SlugifyPipe } from '../../_pipes/slugify.pipe';
import { combineLatest, forkJoin, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

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
  loading = true;

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

    // Bước 1: Lấy danh sách cộng đồng + memberships song song
    const categories$ = this.http.get<any[]>(environment.apiUrl + '/categories');
    const memberships$ = myUsername
      ? this.http.get<{ [key: string]: string }>(environment.apiUrl + '/categories/my-memberships').pipe(
          catchError(() => of({} as { [key: string]: string }))
        )
      : of({} as { [key: string]: string });

    combineLatest([categories$, memberships$]).pipe(
      switchMap(([allCategories, memberships]) => {
        // Lọc ra cộng đồng user CHƯA tham gia
        const joinedKeys = Object.keys(memberships).map(k => k.toLowerCase());
        const notJoined = allCategories.filter(c =>
          !joinedKeys.includes(c.name?.toLowerCase())
        );

        if (notJoined.length === 0) {
          return of({ categories: notJoined, statsMap: {} as any });
        }

        // Bước 2: Lấy stats (member count) cho từng cộng đồng chưa join
        const statsRequests = notJoined.reduce((acc: any, c: any) => {
          acc[c.name] = this.http.get<any>(
            `${environment.apiUrl}/categories/${encodeURIComponent(c.name)}/stats`
          ).pipe(catchError(() => of({ memberCount: 0 })));
          return acc;
        }, {});

        return forkJoin(statsRequests).pipe(
          switchMap((statsMap: any) => of({ categories: notJoined, statsMap })),
          catchError(() => of({ categories: notJoined, statsMap: {} }))
        );
      })
    ).subscribe({
      next: ({ categories, statsMap }: any) => {
        this.communities = categories.map((c: any) => ({
          id: c.id,
          name: c.name,
          title: c.displayName || c.name,
          // ✅ Lấy member count từ stats API thực (không dùng c.members bị JsonIgnore)
          members: statsMap[c.name]?.memberCount ?? 0,
          description: c.description || 'Chưa có thông tin.',
          icon: c.imageUrl || '',
          banner: ''
        }));
        this.loading = false;
      },
      error: err => {
        console.error(err);
        this.loading = false;
      }
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
