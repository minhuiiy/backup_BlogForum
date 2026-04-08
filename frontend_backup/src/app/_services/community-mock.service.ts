import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CommunityMockService {
  private apiUrl = environment.apiUrl + '/categories';
  
  // Lưu danh sách cộng đồng
  private communities = new BehaviorSubject<any[]>(
    JSON.parse(localStorage.getItem('my_communities') || '[]')
  );
  
  // Lưu danh sách map ID bài đăng cho mỗi cộng đồng { "communityName": [post_id_1, post_id_2] }
  private postsMap = new BehaviorSubject<{ [key: string]: number[] }>(
    JSON.parse(localStorage.getItem('my_communities_posts') || '{}')
  );
  
  // Lưu danh sách member cho mỗi cộng đồng { "communityName": { "username": "moderator" } }
  private membersMap = new BehaviorSubject<{ [key: string]: { [username: string]: string } }>(
    JSON.parse(localStorage.getItem('my_communities_members') || '{}')
  );
  
  communities$ = this.communities.asObservable();
  membersMap$ = this.membersMap.asObservable();

  constructor(private http: HttpClient) {}

  fetchMyMemberships(username: string) {
    this.http.get<{ [key: string]: string }>(`${this.apiUrl}/my-memberships`).subscribe({
      next: (memberships) => {
        const currentMap: any = {};
        for (const commName in memberships) {
          const role = memberships[commName];
          currentMap[commName.toLowerCase()] = { [username]: role };
        }
        this.membersMap.next(currentMap);
      },
      error: (err) => console.error('Failed to load memberships', err)
    });
  }

  addCommunity(community: any) {
    const currentList = this.communities.getValue();
    currentList.push(community);
    localStorage.setItem('my_communities', JSON.stringify(currentList));
    this.communities.next(currentList);
  }

  joinCommunity(communityName: string, username: string, role: string = 'member') {
    let key = communityName.toLowerCase();
    if (key.startsWith('r/')) key = key.substring(2);

    this.http.post(`${this.apiUrl}/${key}/join?role=${role}`, {}).subscribe({
      next: () => {
        const currentMap = this.membersMap.getValue();
        if (!currentMap[key]) {
          currentMap[key] = {};
        }
        currentMap[key][username] = role;
        this.membersMap.next(currentMap);
      },
      error: (err) => console.error('Failed to join', err)
    });
  }


  leaveCommunity(communityName: string, username: string) {
    let key = communityName.toLowerCase();
    if (key.startsWith('r/')) key = key.substring(2);

    this.http.post(`${this.apiUrl}/${key}/leave`, {}).subscribe({
      next: () => {
        const currentMap = this.membersMap.getValue();
        if (currentMap[key] && currentMap[key][username]) {
          delete currentMap[key][username];
          this.membersMap.next(currentMap);
        }
      },
      error: (err) => console.error('Failed to leave', err)
    });
  }

  getCategoryStats(communityName: string): Observable<any> {
    let key = communityName.toLowerCase();
    if (key.startsWith('r/')) key = key.substring(2);
    return this.http.get<any>(`${this.apiUrl}/${key}/stats`);
  }

  getRole(communityName: string, username: string): string | null {
    if (!communityName || !username) return null;
    const currentMap = this.membersMap.getValue();
    let key = communityName.toLowerCase();
    if (key.startsWith('r/')) key = key.substring(2);

    return currentMap[key]?.[username] || null;
  }

  isJoined(communityName: string, username: string): boolean {
    return this.getRole(communityName, username) !== null;
  }

  addPostToCommunity(communityName: string, postId: number) {
    const currentMap = this.postsMap.getValue();
    let key = communityName.toLowerCase();
    if (key.startsWith('r/')) key = key.substring(2);
    
    if (!currentMap[key]) {
      currentMap[key] = [];
    }
    // Tránh lưu trùng lặp id
    if (!currentMap[key].includes(postId)) {
      currentMap[key].push(postId);
      localStorage.setItem('my_communities_posts', JSON.stringify(currentMap));
      this.postsMap.next(currentMap);
    }
  }

  getPostIdsByCommunity(communityName: string): number[] {
    const currentMap = this.postsMap.getValue();
    let key = communityName.toLowerCase();
    if (key.startsWith('r/')) key = key.substring(2);
    
    return currentMap[key] || [];
  }
}
