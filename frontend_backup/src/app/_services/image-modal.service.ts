import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ImageModalService {
  private isOpenSubject = new BehaviorSubject<boolean>(false);
  private imageUrlSubject = new BehaviorSubject<string | null>(null);

  isOpen$: Observable<boolean> = this.isOpenSubject.asObservable();
  imageUrl$: Observable<string | null> = this.imageUrlSubject.asObservable();

  open(url: string): void {
    this.imageUrlSubject.next(url);
    this.isOpenSubject.next(true);
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }

  close(): void {
    this.isOpenSubject.next(false);
    this.imageUrlSubject.next(null);
    document.body.style.overflow = ''; // Restore scrolling
  }
}
