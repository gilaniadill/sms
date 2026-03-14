import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { StudentService } from '../../../services/student.service';
import { ClassService } from '../../../services/class.service';
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
  students: Student[] = [];           // filtered list
  allStudents: Student[] = [];         // master list from API
  visibleStudents: Student[] = [];     // currently displayed slice
  printStudents: Student[] = [];

  searchText = '';
  selectedClass = '';
  selectedSection = '';

  classes: any[] = [];                 // list of class objects
  sections: string[] = [];              // unique sections

  isLoading = false;                    // loading state for the whole component
  selectAllChecked = false;
  selectedStudentIds: string[] = [];

  // Pagination
  pageSize = 50;
  currentPage = 0;

  private subs = new Subscription();

  constructor(
    private studentService: StudentService,
    private classService: ClassService,
    private toast: ToastService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  loadInitialData() {
    this.isLoading = true;
    this.cdr.detectChanges();

    const classes$ = this.classService.getClasses();
    const students$ = this.studentService.getStudents();

    const sub = forkJoin({
      classes: classes$,
      students: students$
    }).pipe(
      finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (results) => {
        // Handle classes
        const classRes = results.classes as any;
        let classes = classRes.data || classRes || [];
        
        // ✅ Sort classes numerically
        classes.sort((a: any, b: any) => {
          const aNum = parseInt(a.className, 10);
          const bNum = parseInt(b.className, 10);
          if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
          if (!isNaN(aNum)) return -1;
          if (!isNaN(bNum)) return 1;
          return a.className.localeCompare(b.className);
        });
        this.classes = classes;

        const allSections = this.classes.flatMap(c => c.sections || []);
        this.sections = [...new Set(allSections)];

        // Handle students
        const studentRes = results.students as any;
        if (studentRes.success) {
          this.allStudents = studentRes.data.map((s: any) => {
            const cls = this.classes.find(c => c._id === s.class) || s.class;
            return { ...s, class: cls };
          });
        } else {
          this.allStudents = [];
        }

        // Apply route param filter
        this.route.queryParams.subscribe(params => {
          if (params['classId']) {
            this.selectedClass = params['classId'];
          }
          this.applyFilters();
        });
      },
      error: (err) => {
        console.error('Error loading data', err);
        this.toast.show('Failed to load data', 'danger');
      }
    });
    this.subs.add(sub);
  }

  applyFilters() {
    let data = [...this.allStudents];

    if (this.searchText) {
      const t = this.searchText.toLowerCase();
      data = data.filter(s =>
        s.firstName.toLowerCase().includes(t) ||
        s.lastName.toLowerCase().includes(t) ||
        s.fatherName.toLowerCase().includes(t) ||
        s.admissionNo.toLowerCase().includes(t)
      );
    }

    if (this.selectedClass) {
      data = data.filter(s => s.class?._id === this.selectedClass);
    }

    if (this.selectedSection) {
      data = data.filter(s => s.section === this.selectedSection);
    }

    this.students = data;
    this.resetPagination();
    this.updateVisibleStudents();
    this.selectedStudentIds = [];
    this.selectAllChecked = false;
    this.cdr.detectChanges();
  }

  resetFilters() {
    this.searchText = '';
    this.selectedClass = '';
    this.selectedSection = '';
    this.applyFilters();
    this.toast.show('Filters reset', 'success');
  }

  resetPagination() {
    this.currentPage = 0;
  }

  updateVisibleStudents() {
    const start = 0;
    const end = (this.currentPage + 1) * this.pageSize;
    this.visibleStudents = this.students.slice(start, end);
    this.cdr.detectChanges();
  }

  loadMore() {
    this.currentPage++;
    this.updateVisibleStudents();
  }

  toggleSelection(id: string, checked: boolean) {
    if (checked) {
      this.selectedStudentIds.push(id);
    } else {
      this.selectedStudentIds = this.selectedStudentIds.filter(x => x !== id);
    }
    this.cdr.detectChanges();
  }

  toggleSelectAll(checked: boolean) {
    this.selectAllChecked = checked;
    this.selectedStudentIds = checked ? this.visibleStudents.map(s => s._id) : [];
    this.cdr.detectChanges();
  }


  deleteStudent(id: string, name: string) {
    if (!confirm(`Delete ${name}?`)) return;
    this.studentService.deleteStudent(id).subscribe({
      next: () => {
        this.allStudents = this.allStudents.filter(s => s._id !== id);
        this.applyFilters();
        this.toast.show('Student deleted', 'success');
      },
      error: (err) => {
        console.error(err);
        this.toast.show('Delete failed', 'danger');
      }
    });
  }

  deleteSelectedStudents() {
    if (!confirm('Delete selected students?')) return;
    const calls = this.selectedStudentIds.map(id =>
      this.studentService.deleteStudent(id)
    );
    forkJoin(calls).subscribe({
      next: () => {
        this.allStudents = this.allStudents.filter(
          s => !this.selectedStudentIds.includes(s._id)
        );
        this.applyFilters();
        this.selectedStudentIds = [];
        this.selectAllChecked = false;
        this.toast.show('Selected students deleted', 'success');
      },
      error: (err) => {
        console.error(err);
        this.toast.show('Error deleting selected students', 'danger');
      }
    });
  }

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