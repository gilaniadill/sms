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
  groups: string[] = [];                 // groups for the selected class
  exams: Exam[] = [];

  selectedClassId = '';
  selectedSection = '';
  selectedGroup = '';                    // selected group
  selectedExamId = '';

  students: Student[] = [];
  results: Result[] = [];
  subjects: ExamSubject[] = [];           // ✅ changed from string[] to ExamSubject[]

  gridRows: GridRow[] = [];
  displayedColumns: string[] = [];

  loading = false;
  saving = false;
  selectedStudentIds = new Set<string>();

  // For print list
  selectedExamName = '';
  selectedAcademicYear = '';
  selectedClassName = '';
  currentDate = new Date();
  printListData: PrintRow[] = [];

  get allSelected(): boolean {
    return this.gridRows.length > 0 && this.gridRows.every(row => row.selected);
  }

  constructor(
    private classService: ClassService,
    private studentService: StudentService,
    private examService: ExamService,
    private resultService: ResultService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadClasses();
  }

  loadClasses() {
    this.classService.getClasses().subscribe({
      next: (res) => {
        this.classes = res.data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading classes:', err)
    });
  }

  onClassChange() {
    const cls = this.classes.find((c) => c._id === this.selectedClassId);
    this.sections = cls?.sections || [];
    this.groups = cls?.groups?.map(g => g.name) || [];  // extract group names
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
      error: (err) => console.error(err)
    });
  }

  loadData() {
    if (!this.selectedClassId || !this.selectedSection || !this.selectedExamId) {
      alert('Please select class, section and exam');
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    forkJoin({
      students: this.studentService.getStudents(this.selectedClassId, this.selectedSection).pipe(
        timeout(10000),
        catchError(err => {
          console.error('Students API error:', err);
          return of({ success: false, data: [] });
        })
      ),
      results: this.resultService.getResults(this.selectedExamId, this.selectedClassId, this.selectedSection).pipe(
        timeout(10000),
        catchError(err => {
          console.error('Results API error:', err);
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
        this.students = students?.data || [];
        this.results = results?.data || [];

        const exam = this.exams.find(e => e._id === this.selectedExamId);
        this.subjects = exam?.subjects || [];
        this.selectedExamName = exam?.name || '';
        this.selectedAcademicYear = exam?.academicYear || '';
        const cls = this.classes.find(c => c._id === this.selectedClassId);
        this.selectedClassName = cls?.className || '';

        this.buildGrid();
      },
      error: (err) => {
        console.error('Unexpected error:', err);
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
        marks[subj.name] = existing?.marks?.[subj.name] || 0;   // ✅ use subj.name
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

    // Displayed columns: subject names
    this.displayedColumns = ['select', 'admissionNo', 'name', ...this.subjects.map(s => s.name)];
    this.cdr.detectChanges();
  }

  trackByStudentId(index: number, row: GridRow): string {
    return row.studentId;
  }

  toggleAll(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.gridRows.forEach(row => (row.selected = checked));
    this.updateSelectedSet();
    this.cdr.detectChanges();
  }

  onRowSelect() {
    this.updateSelectedSet();
  }

  private updateSelectedSet() {
    this.selectedStudentIds.clear();
    this.gridRows.forEach(row => {
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
      next: () => alert('Saved successfully'),
      error: (err) => {
        console.error(err);
        alert('Error saving');
      }
    });
  }

  deleteSelected() {
    if (this.selectedStudentIds.size === 0) {
      alert('No rows selected');
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
      alert('No saved results for selected students');
      return;
    }

    if (!confirm('Delete selected results?')) return;

    this.resultService.deleteResults(selectedResultIds).subscribe({
      next: (res) => {
        alert(`Deleted ${res.deletedCount} results`);
        this.loadData();
      },
      error: (err) => console.error(err)
    });
  }

  printAll() {
    const studentIds = this.gridRows.map(row => row.studentId);
    this.navigateToPrint(studentIds);
  }

  printSelected() {
    if (this.selectedStudentIds.size === 0) {
      alert('No rows selected');
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
      alert('No rows selected');
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
      const maxTotal = this.subjects.reduce((sum, subj) => sum + subj.maxMarks, 0);   // ✅ sum of maxMarks
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
        grade
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
      location.reload();
    }, 100);
  }
}