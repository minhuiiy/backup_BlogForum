import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './news.html',
  styleUrls: ['./news.css']
})
export class News implements OnInit {
  newsList: any[] = [];
  loadingNews = true;

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    // Lấy 20 tin công nghệ nóng hổi nhất từ HackerNews
    this.http.get<number[]>('https://hacker-news.firebaseio.com/v0/topstories.json').subscribe({
      next: ids => {
        const top20 = ids.slice(0, 20);
        let loaded = 0;
        let errors = 0;
        top20.forEach(id => {
          this.http.get<any>(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).subscribe({
            next: story => {
              if (story) this.newsList.push(story);
              loaded++;
              this.checkDone(loaded, errors, top20.length);
            },
            error: () => {
              errors++;
              this.checkDone(loaded, errors, top20.length);
            }
          });
        });
      },
      error: () => this.loadingNews = false
    });
  }

  checkDone(loaded: number, errors: number, total: number) {
     if (loaded + errors === total) {
        this.newsList.sort((a, b) => b.score - a.score);
        this.loadingNews = false;
     }
  }

  // Thuật toán tách từ khóa chính xác nhất từ Title
  getKeyword(title: string): string {
    if (!title) return 'technology';
    // Loại bỏ ký tự đặc biệt và các mạo từ tiếng Anh cơ bản
    const ignoredWords = ['about', 'there', 'their', 'which', 'could', 'would', 'should', 'these', 'those'];
    const words = title.replace(/[^\w\s]/g, '').toLowerCase().split(/\s+/);
    
    // Tìm từ đầu tiên dài hơn 4 ký tự và không nằm trong danh sách bỏ qua
    const keyword = words.find(w => w.length > 4 && !ignoredWords.includes(w)) || 'news';
    return encodeURIComponent(keyword);
  }
}
