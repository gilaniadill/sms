import { Component } from '@angular/core';
import { ToastService } from './toast.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="toastService.toast$ | async as toast" class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 1100">
      <div class="toast show align-items-center text-white bg-{{toast.type}} border-0">
        <div class="d-flex">
          <div class="toast-body">
            {{ toast.message }}
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" (click)="close()"></button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 1100;
    }
    .toast {
      min-width: 250px;
    }
  `]
})
export class ToastComponent {
  constructor(public toastService: ToastService) {} // made public for template access

  close() {
    this.toastService.clear();
  }
}