import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from "@angular/core";
import { forkJoin } from "rxjs";
import { AttendanceService } from "../../../services/attendance.service";
import { ClassService } from "../../../services/class.service";
import { StudentService } from "../../../services/student.service";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ToastService } from "../../../core/toast/toast.service";
import Chart from 'chart.js/auto';

@Component({
  selector: "app-attendance",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./attendance.component.html",
  styleUrls: ['./attendance.component.css'],
})
export class AttendanceComponent implements OnInit {
  @ViewChild('attendanceChart') attendanceChartRef!: ElementRef;
  chart: Chart | undefined;
  chartInitialized = false;

  classes: any[] = [];
  sections: string[] = [];
  records: any[] = [];
  totalStudents = 0;
  loading = false;
  error = "";

  // Chart data
  chartDates: string[] = [];
  chartPresent: number[] = [];
  chartAbsent: number[] = [];

  // Form state
  isEditing = false;
  editId = "";

  form = {
    classId: "",
    section: "",
    date: new Date().toISOString().slice(0, 10),
    present: 0,
    absent: 0,
  };

  constructor(
    private cdr: ChangeDetectorRef,
    private attendanceSvc: AttendanceService,
    private classSvc: ClassService,
    private studentSvc: StudentService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.loadInitialData();
  }

  loadInitialData() {
    this.loading = true;
    this.error = "";

    forkJoin({
      classes: this.classSvc.getClasses(),
      attendance: this.attendanceSvc.getAll(),
    }).subscribe({
      next: (res: any) => {
        // Sort classes numerically
        let classes = res.classes?.data || res.classes || [];
        classes.sort((a: any, b: any) => {
          const aNum = parseInt(a.className, 10);
          const bNum = parseInt(b.className, 10);
          if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
          if (!isNaN(aNum)) return -1;
          if (!isNaN(bNum)) return 1;
          return a.className.localeCompare(b.className);
        });
        this.classes = classes;
        this.records = res.attendance?.data || res.attendance || [];
        this.loading = false;

        // Force change detection to update DOM
        this.cdr.detectChanges();

        // Now that DOM is updated, initialize or update the chart
        if (this.attendanceChartRef && !this.chartInitialized) {
          this.initChart();
        } else if (this.chartInitialized) {
          this.updateChart();
        }

        this.toast.show("Attendance data loaded", "success");
      },
      error: (err) => {
        console.error("Error loading data:", err);
        this.error = "Failed to load data. Please try again.";
        this.loading = false;
        this.cdr.detectChanges();
        this.toast.show("Failed to load attendance data", "danger");
      },
    });
  }

  initChart() {
    if (!this.attendanceChartRef) return;

    const ctx = this.attendanceChartRef.nativeElement.getContext('2d');
    this.updateChartData(); // populate chartDates, chartPresent, chartAbsent

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.chartDates,
        datasets: [
          {
            label: 'Present',
            data: this.chartPresent,
            backgroundColor: 'rgba(40, 167, 69, 0.7)',
            borderColor: '#28a745',
            borderWidth: 1
          },
          {
            label: 'Absent',
            data: this.chartAbsent,
            backgroundColor: 'rgba(220, 53, 69, 0.7)',
            borderColor: '#dc3545',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Students'
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: 'Daily Attendance Overview'
          },
          legend: {
            position: 'top',
          }
        }
      }
    });
    this.chartInitialized = true;
  }

  updateChartData() {
    // Sort records by date
    const sorted = [...this.records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    this.chartDates = sorted.map(r => r.date);
    this.chartPresent = sorted.map(r => r.present);
    this.chartAbsent = sorted.map(r => r.absent);
  }

  updateChart() {
    if (!this.chart) return;
    this.updateChartData();
    this.chart.data.labels = this.chartDates;
    this.chart.data.datasets[0].data = this.chartPresent;
    this.chart.data.datasets[1].data = this.chartAbsent;
    this.chart.update();
  }

  onClassChange() {
    const cls = this.classes.find((c) => c._id === this.form.classId);
    this.sections = cls?.sections || [];
    this.form.section = "";
    this.totalStudents = 0;
  }

  onSectionChange() {
    if (!this.form.classId || !this.form.section) {
      this.totalStudents = 0;
      return;
    }

    this.studentSvc
      .countByClass(this.form.classId, this.form.section)
      .subscribe({
        next: (res) => {
          this.totalStudents = res.total || 0;
          this.cdr.detectChanges();
        },
        error: () => {
          this.totalStudents = 0;
          this.toast.show("Failed to load student count", "danger");
        },
      });
  }

  save() {
    if (!this.form.classId || !this.form.section) {
      this.toast.show("Please select class and section", "warning");
      return;
    }

    if (this.form.present + this.form.absent > this.totalStudents) {
      this.toast.show("Present + Absent cannot exceed total students", "warning");
      return;
    }

    if (this.form.present + this.form.absent === 0) {
      this.toast.show("Please enter attendance numbers", "warning");
      return;
    }

    if (this.isEditing) {
      this.updateAttendance();
    } else {
      this.createAttendance();
    }
  }

  createAttendance() {
    this.attendanceSvc.create(this.form).subscribe({
      next: (res) => {
        this.records.unshift(res.data);
        this.updateChart();
        this.resetForm();
        this.cdr.detectChanges();
        this.toast.show("Attendance saved successfully!", "success");
      },
      error: (err) => {
        const msg = err.error?.message || "Failed to save attendance";
        this.toast.show(msg, "danger");
      },
    });
  }

  updateAttendance() {
    this.attendanceSvc.update(this.editId, this.form).subscribe({
      next: (res) => {
        const index = this.records.findIndex((r) => r._id === this.editId);
        if (index !== -1) {
          this.records[index] = res.data;
          this.updateChart();
        }
        this.resetForm();
        this.cdr.detectChanges();
        this.toast.show("Attendance updated successfully!", "success");
      },
      error: (err) => {
        const msg = err.error?.message || "Failed to update attendance";
        this.toast.show(msg, "danger");
      },
    });
  }

  editRecord(record: any) {
    this.isEditing = true;
    this.editId = record._id;
    this.form.classId = record.class?._id || record.class;
    this.form.section = record.section;
    this.form.date = record.date;
    this.form.present = record.present;
    this.form.absent = record.absent;

    const cls = this.classes.find((c) => c._id === this.form.classId);
    this.sections = cls?.sections || [];

    this.studentSvc
      .countByClass(this.form.classId, this.form.section)
      .subscribe({
        next: (res) => {
          this.totalStudents = res.total || 0;
          this.cdr.detectChanges();
        },
      });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  deleteRecord(id: string) {
    if (!confirm("Are you sure you want to delete this attendance record?")) {
      return;
    }

    this.attendanceSvc.delete(id).subscribe({
      next: () => {
        this.records = this.records.filter((r) => r._id !== id);
        this.updateChart();
        this.cdr.detectChanges();
        this.toast.show("Attendance deleted successfully!", "success");
      },
      error: (err) => {
        const msg = err.error?.message || "Failed to delete attendance";
        this.toast.show(msg, "danger");
      },
    });
  }

  resetForm() {
    this.isEditing = false;
    this.editId = "";
    this.form = {
      classId: "",
      section: "",
      date: new Date().toISOString().slice(0, 10),
      present: 0,
      absent: 0,
    };
    this.sections = [];
    this.totalStudents = 0;
  }

  cancelEdit() {
    this.resetForm();
    this.toast.show("Edit cancelled", "info");
  }

  trackById(_: number, item: any) {
    return item._id;
  }

  retry() {
    this.loadInitialData();
  }
}