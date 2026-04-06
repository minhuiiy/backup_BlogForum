import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { HomeComponent } from './pages/home/home.component';
import { PostDetailComponent } from './pages/post-detail/post-detail.component';
import { CreatePostComponent } from './pages/create-post/create-post.component';
import { AuthGuard } from './_helpers/auth.guard';
import { Profile } from './pages/profile/profile';
import { Popular } from './pages/popular/popular';
import { News } from './pages/news/news';
import { Explore } from './pages/explore/explore';
import { CreateCommunity } from './pages/create-community/create-community';
import { CommunityComponent } from './pages/community/community';
import { Search } from './pages/search/search';

export const routes: Routes = [
  { path: 'profile', component: Profile },
  { path: 'user/:username', component: Profile },
  { path: 'home', component: HomeComponent },
  { path: 'popular', component: Popular },
  { path: 'all', component: HomeComponent },
  { path: 'explore', component: Explore },
  { path: 'news', component: News },
  { path: 'search', component: Search },
  { path: 'create-community', component: CreateCommunity, canActivate: [AuthGuard] },
  { path: 'r/:communityName', component: CommunityComponent },
  { path: 'login', redirectTo: 'home', pathMatch: 'full' },
  { path: 'register', component: RegisterComponent },
  { path: 'create-post', component: CreatePostComponent, canActivate: [AuthGuard] },
  { path: 'post/:id', component: PostDetailComponent },
  { path: '', redirectTo: 'home', pathMatch: 'full' }
];
