import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { TokenStorageService } from '../_services/token-storage.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
    constructor(
        private router: Router,
        private tokenStorage: TokenStorageService
    ) {}

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
        const token = this.tokenStorage.getToken();
        const user = this.tokenStorage.getUser();

        // Kiểm tra đã đăng nhập
        if (!token || !user) {
            this.router.navigate(['/home']);
            return false;
        }

        // Kiểm tra có role ADMIN
        const roles: string[] = user.roles || [];
        if (roles.includes('ROLE_ADMIN')) {
            return true;
        }

        // Không có quyền → chuyển về trang chủ
        this.router.navigate(['/home']);
        return false;
    }
}
