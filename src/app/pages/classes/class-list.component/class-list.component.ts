import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ClassService } from '../../../services/class.service';
import { ToastService } from '../../../core/toast/toast.service';

@Component({
  selector: 'app-class-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './class-list.component.html'
})
export class ClassListComponent implements OnInit, OnDestroy {
  classForm!: FormGroup;
  classes: any[] = [];
  allClasses: any[] = [];
  visibleClasses: any[] = [];
  editingId: string | null = null;
  isSubmitting = false;

  // Group modal
  showGroupModal = false;
  selectedClassId: string | null = null;
  editingGroupId: string | null = null;
  groupForm!: FormGroup;

  pageSize = 10;
  currentPage = 0;

  private subs = new Subscription();

  constructor(
    private fb: FormBuilder,
    private classService: ClassService,
    private toast: ToastService
  ) {
    this.initGroupForm();
  }

  ngOnInit(): void {
    this.classForm = this.fb.group({
      className: ['', Validators.required],
      sections: ['', Validators.required]
    });
    this.loadClasses();
  }

  initGroupForm() {
    this.groupForm = this.fb.group({
      name: ['', Validators.required],
      subjects: this.fb.array([])
    });
  }

  get subjectsArray(): FormArray {
    return this.groupForm.get('subjects') as FormArray;
  }

  addSubject() {
    const subjectGroup = this.fb.group({
      name: ['', Validators.required],
      maxMarks: [100, [Validators.required, Validators.min(1)]]
    });
    this.subjectsArray.push(subjectGroup);
  }

  removeSubject(index: number) {
    this.subjectsArray.removeAt(index);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  loadClasses() {
    this.isSubmitting = true;
    const sub = this.classService.getClasses().subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        const classes = res.data || res;
        
        // Sort classes numerically: "1", "2", "10" in correct order
        classes.sort((a: any, b: any) => {
          const aNum = parseInt(a.className, 10);
          const bNum = parseInt(b.className, 10);
          
          // If both are numeric, sort numerically
          if (!isNaN(aNum) && !isNaN(bNum)) {
            return aNum - bNum;
          }
          // If only one is numeric, place numeric first
          if (!isNaN(aNum)) return -1;
          if (!isNaN(bNum)) return 1;
          // Otherwise, lexicographic sort
          return a.className.localeCompare(b.className);
        });
        
        this.allClasses = classes;
        this.applyFilters();
        this.toast.show('Classes loaded', 'success');
      },
      error: () => {
        this.isSubmitting = false;
        this.toast.show('Failed to load classes', 'danger');
      }
    });
    this.subs.add(sub);
  }

  applyFilters() {
    this.classes = [...this.allClasses];
    this.resetPagination();
    this.updateVisibleClasses();
  }

  resetPagination() {
    this.currentPage = 0;
  }

  updateVisibleClasses() {
    const end = (this.currentPage + 1) * this.pageSize;
    this.visibleClasses = this.classes.slice(0, end);
  }

  loadMore() {
    this.currentPage++;
    this.updateVisibleClasses();
  }

  submit() {
    if (this.classForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    const sections = this.classForm.value.sections
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    const payload = {
      className: this.classForm.value.className.trim(),
      sections
    };

    const request$ = this.editingId
      ? this.classService.updateClass(this.editingId, payload)
      : this.classService.createClass(payload);

    request$.subscribe({
      next: () => {
        this.resetForm();
        this.loadClasses();
        this.isSubmitting = false;
      },
      error: () => (this.isSubmitting = false)
    });
  }

  edit(cls: any) {
    this.editingId = cls._id;
    this.classForm.patchValue({
      className: cls.className,
      sections: cls.sections.join(', ')
    });
  }

  deleteClass(id: string, className: string) {
    if (!confirm(`Delete class ${className}?`)) return;
    this.classService.deleteClass(id).subscribe({
      next: () => {
        this.toast.show('Class deleted', 'success');
        this.loadClasses();
      },
      error: (err) => this.toast.show(err.error?.message || 'Error', 'danger')
    });
  }

  resetForm() {
    this.classForm.reset();
    this.editingId = null;
  }

  // Group modal methods
  openAddGroupModal(classId: string) {
    this.selectedClassId = classId;
    this.editingGroupId = null;
    this.initGroupForm();
    this.showGroupModal = true;
  }

  openEditGroupModal(classId: string, group: any) {
    this.selectedClassId = classId;
    this.editingGroupId = group._id;
    this.initGroupForm();
    this.groupForm.patchValue({ name: group.name });
    group.subjects.forEach((s: any) => {
      const subjectGroup = this.fb.group({
        name: [s.name, Validators.required],
        maxMarks: [s.maxMarks, [Validators.required, Validators.min(1)]]
      });
      this.subjectsArray.push(subjectGroup);
    });
    this.showGroupModal = true;
  }

  closeGroupModal() {
    this.showGroupModal = false;
    this.selectedClassId = null;
    this.editingGroupId = null;
    this.initGroupForm();
  }

  saveGroup() {
    if (this.groupForm.invalid || !this.selectedClassId) return;

    const formValue = this.groupForm.value;

    const subjects = formValue.subjects
      .filter((s: any) => s.name && s.name.trim() !== '')
      .map((s: any) => ({
        name: s.name.trim(),
        maxMarks: Number(s.maxMarks) || 100
      }));

    const groupData = {
      name: formValue.name.trim(),
      subjects
    };

    console.log("Sending group data:", JSON.stringify(groupData, null, 2));

    const request$ = this.editingGroupId
      ? this.classService.updateGroup(this.selectedClassId, this.editingGroupId, groupData)
      : this.classService.addGroup(this.selectedClassId, groupData);

    request$.subscribe({
      next: () => {
        this.toast.show('Group saved', 'success');
        this.closeGroupModal();
        this.loadClasses();
      },
      error: (err) => {
        console.error(err);
        this.toast.show(err.error?.message || 'Error saving group', 'danger');
      }
    });
  }

  deleteGroup(classId: string, groupId: string, groupName: string) {
    if (!confirm(`Delete group ${groupName}?`)) return;
    this.classService.deleteGroup(classId, groupId).subscribe({
      next: () => {
        this.toast.show('Group deleted', 'success');
        this.loadClasses();
      },
      error: (err) => this.toast.show(err.error?.message || 'Error', 'danger')
    });
  }

  trackById(_: number, cls: any) {
    return cls._id;
  }
}