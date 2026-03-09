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

  constructor(
    private fb: FormBuilder,
    private studentService: StudentService,
    private router: Router,
    private route: ActivatedRoute,
    private classService: ClassService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.studentId = this.route.snapshot.paramMap.get('id')!;
    this.initForm();
    this.loadClasses(); // classes must load first to map student class/sections
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
      class: ['', Validators.required],   // stores _id
      section: ['', Validators.required],
      academicYear: ['', Validators.required],
      cnic: ['', Validators.required],
      photo: [null]
    });
  }

  // ---------- LOAD CLASSES ----------
  private loadClasses() {
    this.classService.getClasses().subscribe({
      next: (res: any) => {
        this.classes = res.data || res;
        this.loadStudent(); // now fetch student
      },
      error: err => {
        console.error('Error loading classes:', err);
        this.toast.show('Failed to load classes!', 'danger');
      }
    });
  }

  // ---------- LOAD STUDENT ----------
  private loadStudent() {
    this.studentService.getStudentById(this.studentId).subscribe({
      next: res => {
        if (res.success && res.data) {
          const s = res.data;
          const dob = s.dateOfBirth ? new Date(s.dateOfBirth).toISOString().split('T')[0] : '';

          // Photo preview
          this.currentPhoto = s.photo
            ? `${environment.apiUrl}/uploads/${s.photo.replace(/^uploads[\\/]/i, '').replace(/\\/g, '/')}`
            : null;

          // Patch form (class stores _id)
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

          // Populate sections for selected class
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

  // ---------- CLASS CHANGE ----------
  onClassChange(event: Event) {
    const selectEl = event.target as HTMLSelectElement;
    const classId = selectEl.value;
    this.updateSections(classId);
    this.studentForm.patchValue({ section: '' }); // reset section when class changes
  }

  private updateSections(classId: string) {
    const cls = this.classes.find(c => c._id === classId);
    this.sections = cls ? cls.sections : [];
  }

  // ---------- PHOTO CHANGE ----------
  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.selectedFile = file;
      this.studentForm.patchValue({ photo: file });

      const reader = new FileReader();
      reader.onload = (e: any) => (this.currentPhoto = e.target.result);
      reader.readAsDataURL(file);
    }
  }

  // ---------- SUBMIT ----------
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

  // ---------- PHOTO URL ----------
  getPhotoUrl(photo: string) {
     if (!photo) return 'assets/avatar.png';
    return photo
      ? `${environment.apiUrl}/uploads/${photo.replace(/^uploads[\\/]/i, '').replace(/\\/g, '/')}`
      : '';
  }
}