import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';

import { ActivatedRoute } from '@angular/router';

import { StudentService } from '../../../services/student.service';
import { ClassService } from '../../../services/class.service';        // 👈 added
import { Student } from '../../../models/student.model';
import { ToastService } from '../../../core/toast/toast.service';
import { environment } from '../../../../enviroment';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './student-list.html',
  styleUrls: ['./student-list.css']
})
export class StudentListComponent implements OnInit, OnDestroy {

  students: Student[] = [];           // filtered list (all matching filters)
  allStudents: Student[] = [];         // master list from API
  visibleStudents: Student[] = [];     // currently displayed slice
  printStudents: Student[] = [];

  searchText = '';
  selectedClass = '';
  selectedSection = '';

  classes: any[] = [];                 // list of class objects from backend
  sections: string[] = [];              // unique sections from all classes

  isLoading = false;
  selectAllChecked = false;
  selectedStudentIds: string[] = [];

  // Pagination
  pageSize = 10;
  currentPage = 0;

  private subs = new Subscription();

  constructor(
    private studentService: StudentService,
    private classService: ClassService,      // 👈 inject
    private toast: ToastService,
      private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadClasses();// load classes first to populate dropdowns
    
    this.route.queryParams.subscribe(params => {
      if (params['classId']) {
        this.selectedClass = params['classId'];
      }
    });
    this.loadStudents();   // then load students
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // ---------- LOAD CLASSES ----------
  loadClasses() {
    const sub = this.classService.getClasses().subscribe({
      next: (res: any) => {
        this.classes = res.data || res;   // each class: { _id, className, sections }
        // Build unique sections list from all classes
        const allSections = this.classes.flatMap(c => c.sections || []);
        this.sections = [...new Set(allSections)];   // remove duplicates
      },
      error: (err) => {
        console.error('Failed to load classes', err);
        this.toast.show('Could not load classes', 'danger');
      }
    });
    this.subs.add(sub);
  }

  // ---------- LOAD STUDENTS ----------
loadStudents() {
  this.isLoading = true;
  const sub = this.studentService.getStudents().subscribe({
    next: (res: any) => {
      this.isLoading = false;
      if (res.success) {
        // Normalize class property
        this.allStudents = res.data.map((s: any) => {
          const cls = this.classes.find(c => c._id === s.class) || s.class;
          return { ...s, class: cls };
        });

        this.applyFilters();
        this.toast.show('Students loaded', 'success');
      }
    },
    error: () => {
      this.isLoading = false;
      this.toast.show('Failed to load students', 'danger');
    }
  });
  this.subs.add(sub);
}

  // ---------- FILTERS ----------
  applyFilters() {
  let data = [...this.allStudents];

  // search filter
  if (this.searchText) {
    const t = this.searchText.toLowerCase();
    data = data.filter(s =>
      s.firstName.toLowerCase().includes(t) ||
      s.lastName.toLowerCase().includes(t) ||
      s.fatherName.toLowerCase().includes(t) ||
      s.admissionNo.toLowerCase().includes(t)
    );
  }

  // class filter
  if (this.selectedClass) {
    data = data.filter(s => s.class?._id === this.selectedClass);
  }

  // section filter
  if (this.selectedSection) {
    data = data.filter(s => s.section === this.selectedSection);
  }

  this.students = data;
  this.resetPagination();
  this.updateVisibleStudents();
  this.selectedStudentIds = [];
  this.selectAllChecked = false;
}

  resetFilters() {
    this.searchText = '';
    this.selectedClass = '';
    this.selectedSection = '';
    this.applyFilters();
    this.toast.show('Filters reset', 'success');
  }

  // ---------- PAGINATION ----------
  resetPagination() {
    this.currentPage = 0;
  }

  updateVisibleStudents() {
    const start = 0;
    const end = (this.currentPage + 1) * this.pageSize;
    this.visibleStudents = this.students.slice(start, end);
  }

  loadMore() {
    this.currentPage++;
    this.updateVisibleStudents();
  }

  // ---------- SELECTION ----------
  toggleSelection(id: string, checked: boolean) {
    checked
      ? this.selectedStudentIds.push(id)
      : this.selectedStudentIds = this.selectedStudentIds.filter(x => x !== id);
  }

  toggleSelectAll(checked: boolean) {
    this.selectAllChecked = checked;
    this.selectedStudentIds = checked ? this.visibleStudents.map(s => s._id) : [];
  }

  // ---------- PHOTO URL ----------
  getPhotoUrl(photo: string) {
     if (!photo) return 'assets/avatar.png';
    return photo
      ? `${environment.apiUrl}/uploads/${photo.replace(/^uploads[\\/]/i, '').replace(/\\/g, '/')}`
      : '';
  }

  // ---------- DELETE ----------
  deleteStudent(id: string, name: string) {
    if (!confirm(`Delete ${name}?`)) return;

    this.studentService.deleteStudent(id).subscribe(() => {
      this.allStudents = this.allStudents.filter(s => s._id !== id);
      this.applyFilters(); // re‑filter and update visible list
      this.toast.show('Student deleted', 'success');
    });
  }

  deleteSelectedStudents() {
    if (!confirm('Delete selected students?')) return;

    const calls = this.selectedStudentIds.map(id =>
      this.studentService.deleteStudent(id)
    );

    forkJoin(calls).subscribe(() => {
      this.allStudents = this.allStudents.filter(
        s => !this.selectedStudentIds.includes(s._id)
      );
      this.applyFilters(); // re‑filter and update visible list
      this.selectedStudentIds = [];
      this.selectAllChecked = false;
      this.toast.show('Selected students deleted', 'success');
    });
  }

  // ---------- PRINT ----------
  printSingleStudent(student: Student) {
    this.printStudents = [student];
    this.triggerPrint();
  }

  printSelectedStudents() {
    this.printStudents = this.students.filter(s =>
      this.selectedStudentIds.includes(s._id)
    );

    if (!this.printStudents.length) {
      this.toast.show('No students selected', 'danger');
      return;
    }

    this.triggerPrint();
  }

  triggerPrint() {
    setTimeout(() => {
      const printArea = document.getElementById('print-area')!.innerHTML;
      const original = document.body.innerHTML;

      document.body.innerHTML = printArea;
      window.print();
      document.body.innerHTML = original;
      location.reload();
    }, 100);
  }

  trackById(_: number, s: Student) {
    return s._id;
  }
}