import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeAgo',
  standalone: true
})
export class TimeAgoPipe implements PipeTransform {

  transform(value: string | Date | null | undefined): string {
    if (!value) return '';

    let parsedValue = value;
    if (typeof value === 'string' && value.indexOf('T') !== -1 && !value.endsWith('Z') && !value.includes('+') && !value.match(/-\d{2}:\d{2}$/)) {
        // Automatically assume UTC for LocalDateTime from backend
        // Appending 'Z' tells the browser this date is in UTC
        parsedValue = value + 'Z';
    }

    const d = new Date(parsedValue as string | Date);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (seconds < 60) {
      return 'Vừa xong';
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} phút trước`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} giờ trước`;
    }

    const days = Math.floor(hours / 24);
    if (days < 30) {
      return `${days} ngày trước`;
    }

    const months = Math.floor(days / 30);
    if (months < 12) {
      return `${months} tháng trước`;
    }

    const years = Math.floor(days / 365);
    return `${years} năm trước`;
  }

}
