import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { enableProdMode } from '@angular/core';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

(window as any).global = window;

// Tắt Angular DevTools để bảo mật - không lộ component state
enableProdMode();

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    // Xóa ng global object sau khi bootstrap để chặn angular devtools
    if ((window as any).ng) {
      delete (window as any).ng;
    }
  })
  .catch((err) => console.error(err));
