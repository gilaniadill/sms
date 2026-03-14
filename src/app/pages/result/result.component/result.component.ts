import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, timeout } from 'rxjs/operators';

import { ClassService } from '../../../services/class.service';
import { StudentService } from '../../../services/student.service';
import { ExamService } from '../../../services/exam.service';
import { ResultService } from '../../../services/result.service';
import { Class } from '../../../models/class.model';
import { Student } from '../../../models/student.model';
import { Exam, ExamSubject } from '../../../models/exam.model';
import { Result } from '../../../models/result.model';
import { ToastService } from '../../../core/toast/toast.service';

function isStudentObject(student: string | Student): student is Student {
  return typeof student !== 'string';
}

interface GridRow {
  studentId: string;
  admissionNo: string;
  name: string;
  photo?: string;
  marks: { [subject: string]: number };
  selected: boolean;
}

interface PrintRow {
  admissionNo: string;
  name: string;
  marks: { [subject: string]: number };
  total: number;
  percentage: number;
  grade: string;
}

@Component({
  selector: 'app-result-entry',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './result.component.html',
  styleUrls: ['./result.component.css']
})
export class ResultEntryComponent implements OnInit {
  classes: Class[] = [];
  sections: string[] = [];
  groups: string[] = [];
  exams: Exam[] = [];

  selectedClassId = '';
  selectedSection = '';
  selectedGroup = '';
  selectedExamId = '';

  students: Student[] = [];
  results: Result[] = [];
  subjects: ExamSubject[] = [];

  gridRows: GridRow[] = [];
  visibleRows: GridRow[] = [];      // ✅ for pagination
  displayedColumns: string[] = [];

  loading = false;
  saving = false;
  selectedStudentIds = new Set<string>();

  // Pagination
  pageSize = 10;
  currentPage = 0;

  selectedExamName = '';
  selectedAcademicYear = '';
  selectedClassName = '';
  currentDate = new Date();
  printListData: PrintRow[] = [];

  get allSelected(): boolean {
    return this.visibleRows.length > 0 && this.visibleRows.every(row => row.selected);
  }

  constructor(
    private classService: ClassService,
    private studentService: StudentService,
    private examService: ExamService,
    private resultService: ResultService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadClasses();
  }

  loadClasses() {
    this.classService.getClasses().subscribe({
      next: (res) => {
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
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading classes:', err);
        this.toast.show('Failed to load classes', 'danger');
      }
    });
  }

  onClassChange() {
    const cls = this.classes.find((c) => c._id === this.selectedClassId);
    this.sections = cls?.sections || [];
    this.groups = cls?.groups?.map(g => g.name) || [];
    this.selectedSection = '';
    this.selectedGroup = '';
    this.selectedExamId = '';
    this.exams = [];
    if (this.selectedClassId) {
      this.loadExams();
    }
    this.cdr.detectChanges();
  }

  onGroupChange() {
    this.selectedExamId = '';
    this.exams = [];
    if (this.selectedClassId) {
      this.loadExams();
    }
  }

  loadExams() {
    this.examService.getExamsByClass(this.selectedClassId, this.selectedGroup).subscribe({
      next: (res) => {
        this.exams = res.data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.toast.show('Failed to load exams', 'danger');
      }
    });
  }

  loadData() {
    if (!this.selectedClassId || !this.selectedSection || !this.selectedExamId) {
      this.toast.show('Please select class, section and exam', 'warning');
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    forkJoin({
      students: this.studentService.getStudents(this.selectedClassId, this.selectedSection).pipe(
        timeout(10000),
        catchError(err => {
          console.error('Students API error:', err);
          this.toast.show('Failed to load students', 'danger');
          return of({ success: false, data: [] });
        })
      ),
      results: this.resultService.getResults(this.selectedExamId, this.selectedClassId, this.selectedSection).pipe(
        timeout(10000),
        catchError(err => {
          console.error('Results API error:', err);
          this.toast.show('Failed to load results', 'danger');
          return of({ success: false, data: [] });
        })
      )
    }).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: ({ students, results }) => {
        // Handle both wrapped and unwrapped responses
        const studentArray = students?.data || students;
        const resultArray = results?.data || results;

        this.students = Array.isArray(studentArray) ? studentArray : [];
        this.results = Array.isArray(resultArray) ? resultArray : [];

        const exam = this.exams.find(e => e._id === this.selectedExamId);
        this.subjects = exam?.subjects || [];
        this.selectedExamName = exam?.name || '';
        this.selectedAcademicYear = exam?.academicYear || '';
        const cls = this.classes.find(c => c._id === this.selectedClassId);
        this.selectedClassName = cls?.className || '';

        if (this.students.length === 0) {
          this.toast.show('No students found for this class/section', 'info');
        } else {
          this.buildGrid();
        }
      },
      error: (err) => {
        console.error('Unexpected error:', err);
        this.toast.show('An unexpected error occurred', 'danger');
      }
    });
  }

  buildGrid() {
    const resultMap = new Map<string, Result>();
    this.results.forEach(r => {
      const studentId = isStudentObject(r.student) ? r.student._id : r.student;
      resultMap.set(studentId, r);
    });

    this.gridRows = this.students.map(student => {
      const existing = resultMap.get(student._id);
      const marks: { [subject: string]: number } = {};
      this.subjects.forEach(subj => {
        marks[subj.name] = existing?.marks?.[subj.name] || 0;
      });
      return {
        studentId: student._id,
        admissionNo: student.admissionNo,
        name: `${student.firstName} ${student.lastName}`,
        photo: student.photo,
        marks,
        selected: false
      };
    });

    this.displayedColumns = ['select', 'admissionNo', 'name', ...this.subjects.map(s => s.name)];
    // Reset pagination
    this.currentPage = 0;
    this.updateVisibleRows();
    this.cdr.detectChanges();
  }

  // ✅ Pagination methods
  updateVisibleRows() {
    const start = 0;
    const end = (this.currentPage + 1) * this.pageSize;
    this.visibleRows = this.gridRows.slice(start, end);
    this.cdr.detectChanges();
  }

  loadMore() {
    this.currentPage++;
    this.updateVisibleRows();
  }

  trackByStudentId(index: number, row: GridRow): string {
    return row.studentId;
  }

  toggleAll(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.visibleRows.forEach(row => (row.selected = checked));
    this.updateSelectedSet();
    this.cdr.detectChanges();
  }

  onRowSelect() {
    this.updateSelectedSet();
  }

  private updateSelectedSet() {
    this.selectedStudentIds.clear();
    this.visibleRows.forEach(row => {
      if (row.selected) {
        this.selectedStudentIds.add(row.studentId);
      }
    });
  }

  saveAll() {
    const payload = {
      examId: this.selectedExamId,
      results: this.gridRows.map(row => ({
        studentId: row.studentId,
        marks: row.marks
      }))
    };

    this.saving = true;
    this.cdr.detectChanges();

    this.resultService.bulkUpsert(payload).pipe(
      finalize(() => {
        this.saving = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => this.toast.show('Saved successfully', 'success'),
      error: (err) => {
        console.error(err);
        this.toast.show('Error saving', 'danger');
      }
    });
  }

  deleteSelected() {
    if (this.selectedStudentIds.size === 0) {
      this.toast.show('No rows selected', 'warning');
      return;
    }

    const selectedResultIds: string[] = [];
    this.results.forEach(r => {
      const studentId = isStudentObject(r.student) ? r.student._id : r.student;
      if (this.selectedStudentIds.has(studentId) && r._id) {
        selectedResultIds.push(r._id);
      }
    });

    if (selectedResultIds.length === 0) {
      this.toast.show('No saved results for selected students', 'warning');
      return;
    }

    if (!confirm('Delete selected results?')) return;

    this.resultService.deleteResults(selectedResultIds).subscribe({
      next: (res) => {
        this.toast.show(`Deleted ${res.deletedCount} results`, 'success');
        this.loadData();
      },
      error: (err) => {
        console.error(err);
        this.toast.show('Error deleting', 'danger');
      }
    });
  }

  printAll() {
    const studentIds = this.gridRows.map(row => row.studentId);
    this.navigateToPrint(studentIds);
  }

  printSelected() {
    if (this.selectedStudentIds.size === 0) {
      this.toast.show('No rows selected', 'warning');
      return;
    }
    this.navigateToPrint(Array.from(this.selectedStudentIds));
  }

  private navigateToPrint(studentIds: string[]) {
    this.router.navigate(['/print'], {
      queryParams: {
        examId: this.selectedExamId,
        studentIds: studentIds.join(',')
      }
    });
  }

  printList() {
    if (this.gridRows.length === 0) return;
    this.preparePrintData(this.gridRows);
    this.triggerPrint();
  }

  printListSelected() {
    if (this.selectedStudentIds.size === 0) {
      this.toast.show('No rows selected', 'warning');
      return;
    }
    const selectedRows = this.gridRows.filter(row => this.selectedStudentIds.has(row.studentId));
    this.preparePrintData(selectedRows);
    this.triggerPrint();
  }

  private preparePrintData(rows: GridRow[]) {
    this.printListData = rows.map(row => {
      const marksArray = this.subjects.map(subj => row.marks[subj.name] || 0);
      const total = marksArray.reduce((a, b) => a + b, 0);
      const maxTotal = this.subjects.reduce((sum, subj) => sum + subj.maxMarks, 0);
      const percentage = maxTotal ? (total / maxTotal) * 100 : 0;

      let grade = '';
      if (percentage >= 90) grade = 'A+';
      else if (percentage >= 80) grade = 'A';
      else if (percentage >= 70) grade = 'B';
      else if (percentage >= 60) grade = 'C';
      else if (percentage >= 50) grade = 'D';
      else grade = 'F';

      return {
        admissionNo: row.admissionNo,
        name: row.name,
        marks: row.marks,
        total,
        percentage,
        grade,
      };
    });
  }

  private triggerPrint() {
    setTimeout(() => {
      const printArea = document.getElementById('print-list-area')!.innerHTML;
      const original = document.body.innerHTML;
      document.body.innerHTML = printArea;
      window.print();
      document.body.innerHTML = original;
      location.reload(); // removed to prevent reload after print
    }, 100);
  }
}