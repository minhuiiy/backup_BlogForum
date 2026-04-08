import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'slugify',
  standalone: true,
  pure: true
})
export class SlugifyPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';
    return value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')        // Khoảng trắng → gạch ngang
      .replace(/[^a-z0-9\u00C0-\u024F\u1E00-\u1EFF\-]/g, '') // Giữ lại chữ Latin mở rộng + tiếng Việt
      .replace(/-+/g, '-');        // Nhiều gạch ngang liên tiếp → 1
  }
}
