import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule, RouterOutlet, NavigationEnd } from '@angular/router';
import { ToastComponent } from "./core/toast/toast";
import { CommonModule } from '@angular/common';
import { AuthService, User } from './services/auth.service';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent, RouterModule, CommonModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent implements OnInit, OnDestroy {
  isSidebarOpen = false;
  showSidebar = true;
  user: User | null = null;

  private routerSub: Subscription | undefined;
  private userSub: Subscription | undefined;

  constructor(private router: Router, private auth: AuthService) {}

  ngOnInit(): void {
    // Subscribe to user changes
    this.userSub = this.auth.user$.subscribe(user => {
      this.user = user;
    });

    // Check route to decide sidebar visibility
    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      const currentUrl = this.router.url;
      const authPages = ['/login', '/forgot-password', '/reset'];
      this.showSidebar = !authPages.some(page => currentUrl.startsWith(page));
    });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.userSub?.unsubscribe();
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar() {
    this.isSidebarOpen = false;
  }

  logout() {
    this.auth.logout();
  }
}