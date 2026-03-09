import { Component } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/toast/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  email = '';
  password = '';
  show = false;
  loading = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private toast: ToastService
  ) {}

  login() {
    if (!this.email || !this.password) {
      this.toast.show('Please enter email and password', 'warning');
      return;
    }

    this.loading = true;
    this.auth.login({ email: this.email, password: this.password })
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          this.auth.saveToken(res.token);
          this.toast.show('Login successful', 'success');
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.loading = false;
          const msg = err.error?.message || 'Login failed';
          this.toast.show(msg, 'danger');
        }
      });
  }
}