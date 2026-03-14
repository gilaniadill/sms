import { Injectable, HostListener } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class IdleService {

  private timeout: any;
  private idleTime = 5 * 60 * 1000; // 2 minutes

  constructor(private authService: AuthService) {
    this.startWatching();
  }

  startWatching() {
    this.resetTimer();

    window.addEventListener('mousemove', () => this.resetTimer());
    window.addEventListener('keydown', () => this.resetTimer());
    window.addEventListener('click', () => this.resetTimer());
    window.addEventListener('scroll', () => this.resetTimer());
  }

  resetTimer() {
    clearTimeout(this.timeout);

    this.timeout = setTimeout(() => {
      alert("Session expired due to inactivity");
      this.authService.logout();
    }, this.idleTime);
  }

}