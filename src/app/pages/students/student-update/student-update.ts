import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { StudentService } from '../../../services/student.service';
import { ClassService } from '../../../services/class.service';
import { ToastService } from '../../../core/toast/toast.service';
import { environment } from '../../../../enviroment';

@Component({
  selector: 'app-student-update',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './student-update.html',
  styleUrls: ['./student-update.css']
})
export class StudentUpdate implements OnInit {
  studentForm!: FormGroup;
  studentId!: string;
  classes: any[] = [];
  sections: string[] = [];
  currentPhoto: string | null = null;
  selectedFile: File | null = null;

  isImageLoading = true;
  imageError = false;

  constructor(
    private fb: FormBuilder,
    private studentService: StudentService,
    private router: Router,
    private route: ActivatedRoute,
    private classService: ClassService,
    private toast: ToastService
  ) { }

  ngOnInit(): void {
    this.studentId = this.route.snapshot.paramMap.get('id')!;
    this.initForm();
    this.loadClasses();
  }

  private initForm() {
    this.studentForm = this.fb.group({
      admissionNo: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      fatherName: ['', Validators.required],
      dateOfBirth: ['', Validators.required],
      gender: ['Male', Validators.required],
      email: [''],
      phone: [''],
      student_status: ['Regular'],
      address: [''],
      class: ['', Validators.required],
      section: ['', Validators.required],
      academicYear: ['', Validators.required],
      cnic: ['', Validators.required],
      photo: [null]
    });
  }

  private loadClasses() {
    this.classService.getClasses().subscribe({
      next: (res: any) => {
        let classes = res.data || res;
        // Sort classes numerically
        classes.sort((a: any, b: any) => {
          const aNum = parseInt(a.className, 10);
          const bNum = parseInt(b.className, 10);
          if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
          if (!isNaN(aNum)) return -1;
          if (!isNaN(bNum)) return 1;
          return a.className.localeCompare(b.className);
        });
        this.classes = classes;
        this.loadStudent();
      },
      error: err => {
        console.error('Error loading classes:', err);
        this.toast.show('Failed to load classes!', 'danger');
      }
    });
  }

  // ✅ Updated photo URL method (same as in list)
  getPhotoUrl(photo: string): string {
    if (!photo) return 'assets/avatar.png';
    const filename = photo.split('/').pop() || photo;
    return `${environment.apiUrl}/uploads/students/${filename}`;
  }

  private loadStudent() {
    this.studentService.getStudentById(this.studentId).subscribe({
      next: res => {
        if (res.success && res.data) {
          const s = res.data;
          const dob = s.dateOfBirth ? new Date(s.dateOfBirth).toISOString().split('T')[0] : '';

          // Use the new getPhotoUrl method
          this.currentPhoto = s.photo ? this.getPhotoUrl(s.photo) : null;
          this.isImageLoading = true;
          this.imageError = false;

          this.studentForm.patchValue({
            admissionNo: s.admissionNo,
            firstName: s.firstName,
            lastName: s.lastName,
            fatherName: s.fatherName,
            dateOfBirth: dob,
            gender: s.gender,
            email: s.email,
            phone: s.phone,
            student_status: s.student_status,
            address: s.address,
            class: s.class._id,
            section: s.section,
            academicYear: s.academicYear,
            cnic: s.cnic
          });

          this.updateSections(s.class._id);
        } else {
          this.toast.show('Student not found!', 'danger');
          setTimeout(() => this.router.navigate(['/students']), 1500);
        }
      },
      error: err => {
        console.error('Error loading student:', err);
        this.toast.show('Failed to load student!', 'danger');
        setTimeout(() => this.router.navigate(['/students']), 1500);
      }
    });
  }

  onClassChange(event: Event) {
    const selectEl = event.target as HTMLSelectElement;
    const classId = selectEl.value;
    this.updateSections(classId);
    this.studentForm.patchValue({ section: '' });
  }

  private updateSections(classId: string) {
    const cls = this.classes.find(c => c._id === classId);
    this.sections = cls ? cls.sections : [];
  }

  onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (file) {
    this.selectedFile = file;
    this.studentForm.patchValue({ photo: file });

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.currentPhoto = e.target.result;
      this.isImageLoading = false;
    };

    reader.readAsDataURL(file);
  }
}

  submit() {
    if (this.studentForm.invalid) return;

    const formData = new FormData();
    Object.entries(this.studentForm.value).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (key === 'photo' && this.selectedFile) {
          formData.append(key, this.selectedFile);
        } else if (key !== 'photo') {
          formData.append(key, value as any);
        }
      }
    });

    this.studentService.updateStudent(this.studentId, formData).subscribe({
      next: () => {
        this.toast.show('Student updated successfully!', 'success');
        setTimeout(() => this.router.navigate(['/students']), 1500);
      },
      error: err => {
        console.error('Error updating student:', err);
        this.toast.show('Failed to update student!', 'danger');
      }
    });
  }
}