import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { ToastService } from '../../../core/toast/toast.service';

@Component({
  selector: 'app-admin',
  imports: [FormsModule, CommonModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
})
export class AdminComponent implements OnInit {
  admins: any[] = [];
  loading = false;
  addLoading = false;
  updateLoading = false;
  deleteLoading = false;

  // Add admin form
  name = '';
  email = '';
  password = '';
  showPassword = false;

  // Edit admin
  editingAdminId: string | null = null;
  editName = '';
  editEmail = '';
  editPassword = '';
  showEditPassword = false;

  constructor(
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.loadAdmins();
  }

  loadAdmins() {
    this.loading = true;
    this.cdr.detectChanges();

    this.auth.getAdmins()
      .pipe(
        finalize(() => {
          setTimeout(() => {
            this.loading = false;
            this.cdr.detectChanges();
          });
        })
      )
      .subscribe({
        next: (res: any) => {
          this.admins = res;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error(err);
          this.toast.show('Failed to load admins', 'danger');
        }
      });
  }

  addAdmin() {
    if (!this.name || !this.email || !this.password) {
      this.toast.show('All fields are required', 'warning');
      return;
    }

    this.addLoading = true;
    this.auth.createAdmin({ name: this.name, email: this.email, password: this.password })
      .pipe(finalize(() => this.addLoading = false))
      .subscribe({
        next: () => {
          this.toast.show('Admin created successfully', 'success');
          this.name = this.email = this.password = '';
          this.showPassword = false;
          this.loadAdmins();
        },
        error: (err) => this.toast.show(err.error?.message || 'Error creating admin', 'danger')
      });
  }

  startEdit(admin: any) {
    this.editingAdminId = admin._id;
    this.editName = admin.name;
    this.editEmail = admin.email;
    this.editPassword = '';
    this.showEditPassword = false;
    this.cdr.detectChanges();
  }

  cancelEdit() {
    this.editingAdminId = null;
    this.editName = this.editEmail = this.editPassword = '';
    this.showEditPassword = false;
    this.cdr.detectChanges();
  }

  updateAdmin() {
    if (!this.editName || !this.editEmail) {
      this.toast.show('Name and Email are required', 'warning');
      return;
    }
    const payload: any = { name: this.editName, email: this.editEmail };
    if (this.editPassword) payload.password = this.editPassword;

    this.updateLoading = true;
    this.auth.updateAdmin(this.editingAdminId!, payload)
      .pipe(finalize(() => this.updateLoading = false))
      .subscribe({
        next: () => {
          this.toast.show('Admin updated successfully', 'success');
          this.cancelEdit();
          this.loadAdmins();
        },
        error: (err) => this.toast.show(err.error?.message || 'Error updating admin', 'danger')
      });
  }

  removeAdmin(id: string) {
    if (!confirm('Delete this admin?')) return;
    this.deleteLoading = true;
    this.auth.deleteAdmin(id)
      .pipe(finalize(() => this.deleteLoading = false))
      .subscribe({
        next: () => {
          this.toast.show('Admin deleted', 'success');
          this.loadAdmins();
        },
        error: (err) => this.toast.show(err.error?.message || 'Error deleting admin', 'danger')
      });
  }

  trackById(index: number, admin: any): string {
    return admin._id;
  }
}