import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin, Subscription, of, timeout } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ExamService } from '../../../services/exam.service';
import { ClassService } from '../../../services/class.service';
import { ToastService } from '../../../core/toast/toast.service';

@Component({
  selector: 'app-exam-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './exam-list.component.html',
  styleUrls: ['./exam-list.component.css']
})
export class ExamListComponent implements OnInit, OnDestroy {
  exams: any[] = [];
  classes: any[] = [];
  groups: string[] = [];

  // Filters
  selectedClassId = '';
  selectedGroup = '';

  // Form for add/edit
  showForm = false;
  editingId: string | null = null;
  formData: any = {
    name: '',
    class: '',
    group: '',
    subjects: [],
    academicYear: '',
    maxMarks: 100
  };

  subjectInputs: { name: string; maxMarks: number }[] = [];

  isLoading = false;
  isInitialLoading = false;

  private subs = new Subscription();

  constructor(
    private examService: ExamService,
    private classService: ClassService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  loadInitialData() {
  this.isInitialLoading = true;
  this.cdr.detectChanges();

  const classes$ = this.classService.getClasses().pipe(
    timeout(10000),
    catchError(err => {
      console.error('Classes API error:', err);
      this.toast.show('Failed to load classes', 'danger');
      return of({ data: [] });
    })
  );

  const exams$ = this.examService.getExamsByClass().pipe(
    timeout(10000),
    catchError(err => {
      console.error('Exams API error:', err);
      this.toast.show('Failed to load exams', 'danger');
      return of({ data: [] });
    })
  );

  const sub = forkJoin({
    classes: classes$,
    exams: exams$
  }).subscribe({
    next: (results) => {
      let classes = results.classes.data || results.classes;
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
      this.exams = results.exams.data || results.exams;
      this.isInitialLoading = false;
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('Unexpected forkJoin error:', err);
      this.toast.show('Failed to load data', 'danger');
      this.isInitialLoading = false;
      this.cdr.detectChanges();
    }
  });
  this.subs.add(sub);
}

  loadExams() {
    this.isLoading = true;
    this.cdr.detectChanges();

    const classId = this.selectedClassId || undefined;
    const group = this.selectedGroup || undefined;
    const sub = this.examService.getExamsByClass(classId, group).subscribe({
      next: (res: any) => {
        this.exams = res.data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.toast.show('Failed to load exams', 'danger');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
    this.subs.add(sub);
  }

  onClassChange() {
    const cls = this.classes.find(c => c._id === this.selectedClassId);
    this.groups = cls?.groups?.map((g: any) => g.name) || [];
    this.selectedGroup = '';
    this.loadExams();
  }

  onGroupChange() {
    this.loadExams();
  }

  resetFilters() {
    this.selectedClassId = '';
    this.selectedGroup = '';
    this.groups = [];
    this.loadExams();
  }

  openForm(exam?: any) {
    this.showForm = true;
    if (exam) {
      this.editingId = exam._id;
      this.formData = {
        name: exam.name,
        class: exam.class._id || exam.class,
        group: exam.group || '',
        subjects: exam.subjects || [],
        academicYear: exam.academicYear,
        maxMarks: exam.maxMarks
      };
      this.subjectInputs = exam.subjects ? [...exam.subjects] : [];
      const cls = this.classes.find(c => c._id === this.formData.class);
      this.groups = cls?.groups?.map((g: any) => g.name) || [];
    } else {
      this.editingId = null;
      this.formData = {
        name: '',
        class: '',
        group: '',
        subjects: [],
        academicYear: '',
        maxMarks: 100
      };
      this.subjectInputs = [];
      this.groups = [];
    }
    this.cdr.detectChanges();
  }

  closeForm() {
    this.showForm = false;
    this.editingId = null;
    this.cdr.detectChanges();
  }

  onClassSelectForForm() {
    const cls = this.classes.find(c => c._id === this.formData.class);
    this.groups = cls?.groups?.map((g: any) => g.name) || [];
    this.formData.group = '';
    this.subjectInputs = []; // Clear subjects when class changes
    this.cdr.detectChanges();
  }

  // Called when group changes in the form
  onGroupSelectForForm() {
    const className = this.formData.class;
    const groupName = this.formData.group;
    if (!className || !groupName) return;

    const cls = this.classes.find(c => c._id === className);
    if (!cls) return;

    const group = cls.groups.find((g: any) => g.name === groupName);
    if (group) {
      // Pre‑fill subjects from the group
      this.subjectInputs = group.subjects.map((s: any) => ({
        name: s.name,
        maxMarks: s.maxMarks
      }));
    } else {
      this.subjectInputs = [];
    }
    this.cdr.detectChanges();
  }

  addSubject() {
    this.subjectInputs.push({ name: '', maxMarks: 100 });
    this.cdr.detectChanges();
  }

  removeSubject(index: number) {
    this.subjectInputs.splice(index, 1);
    this.cdr.detectChanges();
  }

  submitForm() {
    if (this.subjectInputs.length === 0) {
      this.toast.show('At least one subject is required', 'danger');
      return;
    }
    for (let s of this.subjectInputs) {
      if (!s.name.trim()) {
        this.toast.show('Subject name cannot be empty', 'danger');
        return;
      }
      if (s.maxMarks <= 0) {
        this.toast.show('Max marks must be positive', 'danger');
        return;
      }
    }

    const payload = {
      name: this.formData.name.trim(),
      class: this.formData.class,
      group: this.formData.group || undefined,
      subjects: this.subjectInputs.map(s => ({ name: s.name.trim(), maxMarks: s.maxMarks })),
      academicYear: this.formData.academicYear.trim()
    };

    const request$ = this.editingId
      ? this.examService.updateExam(this.editingId, payload)
      : this.examService.createExam(payload);

    request$.subscribe({
      next: () => {
        this.toast.show(`Exam ${this.editingId ? 'updated' : 'created'} successfully`, 'success');
        this.closeForm();
        this.loadExams();
      },
      error: (err) => {
        this.toast.show(err.error?.message || 'Operation failed', 'danger');
      }
    });
  }

  deleteExam(id: string, name: string) {
    if (!confirm(`Delete exam "${name}"?`)) return;
    this.examService.deleteExam(id).subscribe({
      next: () => {
        this.toast.show('Exam deleted', 'success');
        this.loadExams();
      },
      error: (err) => {
        this.toast.show(err.error?.message || 'Delete failed', 'danger');
      }
    });
  }

  trackById(_: number, exam: any) {
    return exam._id;
  }
}