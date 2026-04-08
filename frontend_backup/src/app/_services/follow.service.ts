import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const API_URL = environment.apiUrl + '/follow/';

@Injectable({
  providedIn: 'root'
})
export class FollowService {

  constructor(private http: HttpClient) { }

  followUser(username: string): Observable<any> {
    return this.http.post(API_URL + username, {});
  }

  unfollowUser(username: string): Observable<any> {
    return this.http.delete(API_URL + username);
  }

  isFollowing(follower: string, following: string): Observable<any> {
    return this.http.get(API_URL + 'check', { params: { follower, following } });
  }

  getFollowers(username: string): Observable<any> {
    return this.http.get(API_URL + username + '/followers');
  }

  getFollowing(username: string): Observable<any> {
    return this.http.get(API_URL + username + '/following');
  }
}
