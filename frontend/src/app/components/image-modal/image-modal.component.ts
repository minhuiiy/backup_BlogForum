import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageModalService } from '../../_services/image-modal.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-image-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-modal.component.html',
  styleUrls: ['./image-modal.component.css']
})
export class ImageModalComponent implements OnInit, OnDestroy {
  isOpen = false;
  imageUrl: string | null = null;
  private subscriptions = new Subscription();

  constructor(private imageModalService: ImageModalService) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.imageModalService.isOpen$.subscribe(isOpen => this.isOpen = isOpen)
    );
    this.subscriptions.add(
      this.imageModalService.imageUrl$.subscribe(url => this.imageUrl = url)
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  closeModal(): void {
    this.imageModalService.close();
  }
}
