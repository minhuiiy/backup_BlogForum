import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Tag {
  id?: number;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class TagService {
  private apiUrl = environment.apiUrl + '/tags';

  constructor(private http: HttpClient) {}

  searchTags(q: string): Observable<Tag[]> {
    return this.http.get<Tag[]>(`${this.apiUrl}/search?q=${encodeURIComponent(q)}`);
  }

  findOrCreate(name: string): Observable<Tag> {
    return this.http.post<Tag>(`${this.apiUrl}/find-or-create`, { name });
  }

  getPopularTags(): Observable<Tag[]> {
    return this.http.get<Tag[]>(this.apiUrl);
  }
}
