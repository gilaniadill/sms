import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StudentService } from '../../../services/student.service';
import { ToastService } from '../../../core/toast/toast.service'; // <-- your toast service
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

  // classes = ['1', '2', '3', '4', '5','6','7','8','9','10'];
  // sections = ['A', 'B', 'C','D','E','F'];

  classes: any[] = [];
  sections: string[] = [];
  constructor(
    private fb: FormBuilder,
    private studentService: StudentService,
    private classService: ClassService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    // this.buildForm();
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
    this.classes = res.data;
  });
}
onClassChange(event: Event) {
  const selectElement = event.target as HTMLSelectElement;
  const classId = selectElement.value;

  const selected = this.classes.find(c => c._id === classId);
  this.sections = selected ? selected.sections : [];

  // Reset section selection
  this.studentForm.patchValue({ section: '' });
}


  submit() {
    if (this.studentForm.invalid) return;

    const formData = new FormData();
    Object.entries(this.studentForm.value).forEach(([key, value]) => {
      if (key === 'photo') return; // skip photo here
      if (value !== null && value !== undefined) formData.append(key, value as any);
    });

    if (this.selectedPhoto) {
      formData.append('photo', this.selectedPhoto, this.selectedPhoto.name);
    }

    this.studentService.createStudent(formData).subscribe({
      next: () => {
        this.toastService.show('Student created successfully!');
        this.studentForm.reset();           // clear the form
        this.selectedPhoto = null;          // clear photo selection
      },
      error: err => {
        console.error('Error creating student', err);
        this.toastService.show('Failed to create student!');
      }
    });
  }
}
