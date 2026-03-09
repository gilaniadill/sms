import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastMessage {
  message: string;
  type: 'success' | 'danger' | 'warning' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toastSubject = new BehaviorSubject<ToastMessage | null>(null);
  toast$ = this.toastSubject.asObservable();

  show(message: string, type: 'success' | 'danger' | 'warning' | 'info' = 'info') {
    this.toastSubject.next({ message, type });
    setTimeout(() => this.clear(), 3000);
  }

  clear() {
    this.toastSubject.next(null);
  }
}