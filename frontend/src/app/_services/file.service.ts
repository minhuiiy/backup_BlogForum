import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_URL = '/api/v1/files/';

export interface UploadResponse {
  fileName: string;
  fileDownloadUri: string;
  fileType: string;
  size: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileService {

  constructor(private http: HttpClient) { }

  /**
   * Upload một hình ảnh hoặc video lên Backend bằng FormData
   * @param file File tải lên
   * @returns Mảng JSON thông tin về Tệp bao gồm `fileDownloadUri`
   */
  upload(file: File): Observable<HttpEvent<UploadResponse>> {
    const formData: FormData = new FormData();
    formData.append('file', file);

    const req = new HttpRequest('POST', API_URL + 'upload', formData, {
      reportProgress: true,
      responseType: 'json'
    });

    return this.http.request<UploadResponse>(req);
  }
}
