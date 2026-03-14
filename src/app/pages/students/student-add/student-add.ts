import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StudentService } from '../../../services/student.service';
import { ToastService } from '../../../core/toast/toast.service';
import { ClassService } from '../../../services/class.service';

@Component({
  selector: 'app-student-add',
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './student-add.html',
  styleUrls: ['./student-add.css'],
  standalone: true
})
export class StudentAddComponent implements OnInit {
  studentForm!: FormGroup;
  selectedPhoto: File | null = null;
  classes: any[] = [];
  sections: string[] = [];

  constructor(
    private fb: FormBuilder,
    private studentService: StudentService,
    private classService: ClassService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadClasses();

    this.studentForm = this.fb.group({
      admissionNo: ['', Validators.required],
      rollNo: [''],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      fatherName: ['', Validators.required],
      dateOfBirth: ['', Validators.required],
      gender: ['Male', Validators.required],
      email: [''],
      cnic: ['', Validators.required],
      phone: [''],
      student_status: ['Regular'],
      address: [''],
      class: ['', Validators.required],
      section: ['', Validators.required],
      academicYear: ['', Validators.required],
      photo: [null]
    });
  }

  onFileChange(event: any) {
    if (event.target.files.length > 0) {
      this.selectedPhoto = event.target.files[0];
    }
  }

  loadClasses() {
    this.classService.getClasses().subscribe(res => {
      let classes = res.data;
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
    });
  }

  onClassChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const classId = selectElement.value;
    const selected = this.classes.find(c => c._id === classId);
    this.sections = selected ? selected.sections : [];
    this.studentForm.patchValue({ section: '' });
  }

  submit() {
    if (this.studentForm.invalid) return;

    const formData = new FormData();
    Object.entries(this.studentForm.value).forEach(([key, value]) => {
      if (key === 'photo') return;
      if (value !== null && value !== undefined) formData.append(key, value as any);
    });

    if (this.selectedPhoto) {
      formData.append('photo', this.selectedPhoto, this.selectedPhoto.name);
    }

    this.studentService.createStudent(formData).subscribe({
      next: () => {
        this.toastService.show('Student created successfully!');
        this.studentForm.reset();
        this.selectedPhoto = null;
      },
      error: err => {
        console.error('Error creating student', err);
        this.toastService.show('Failed to create student!');
      }
    });
  }
}