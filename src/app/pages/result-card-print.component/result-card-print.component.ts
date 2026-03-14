import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ResultService } from '../../services/result.service';
import { environment } from '../../../enviroment';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-result-card-print',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './result-card-print.component.html',
  styleUrls: ['./result-card-print.component.css']
})
export class ResultCardPrintComponent implements OnInit, OnDestroy {
  examId = '';
  studentIds: string[] = [];
  results: any[] = [];
  loading = true;
  error: string | null = null;
  private subscription: Subscription | null = null;
  private timeoutId: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private resultService: ResultService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.examId = params['examId'];
      this.studentIds = params['studentIds'] ? params['studentIds'].split(',') : [];
      if (this.examId && this.studentIds.length) {
        this.fetchPrintData();
      } else {
        this.error = 'Missing exam or student information';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });

    this.timeoutId = setTimeout(() => {
      if (this.loading) {
        this.error = 'Request timed out. Please try again.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    }, 15000);
  }

  fetchPrintData() {
    this.subscription = this.resultService.getPrintData(this.examId, this.studentIds).subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.results = res.data;
          this.loading = false;
          clearTimeout(this.timeoutId);
          this.cdr.detectChanges();
          // No auto‑print – user will click the button
        } else {
          this.error = 'Invalid response from server';
          this.loading = false;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Print API error:', err);
        this.error = `Failed to load: ${err.message}`;
        this.loading = false;
        clearTimeout(this.timeoutId);
        this.cdr.detectChanges();
      }
    });
  }

  getTotalMarks(result: any): number {
    if (!result || !result.marks) return 0;
    const marks = result.marks;
    return Object.values(marks).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
  }

  getTotalMaxMarks(exam: any): number {
    return exam?.subjects?.reduce((sum: number, subj: any) => sum + subj.maxMarks, 0) || 0;
  }

  getPercentage(result: any): number {
    const obtained = this.getTotalMarks(result);
    const max = this.getTotalMaxMarks(result?.exam);
    return max ? (obtained / max) * 100 : 0;
  }

  getGrade(result: any): string {
    const percentage = this.getPercentage(result);
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  }

  printPage() {
    const printContents = document.getElementById('print-cards')?.innerHTML;
    if (!printContents) return;

    // Get all styles from the current document
    const styles = Array.from(document.querySelectorAll('style')).map(style => style.outerHTML).join('');
    const externalStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map(link => link.outerHTML)
      .join('');

    const popup = window.open('', '_blank', 'width=800,height=600');
    if (!popup) return;

    popup.document.write(`
      <html>
        <head>
          <title>Print Results</title>
          ${externalStyles}
          ${styles}
          <style>
            /* Ensure page breaks and colors work */
            @media print {
              body { margin: 0; padding: 0; background: white; }
              .no-print { display: none !important; }
              .result-card-container:not(:first-child) { page-break-before: always; }
              .result-card {
                page-break-inside: avoid;
                margin: 0.5in auto 0.25in;
                border: 1px solid #ccc;
                padding: 15px;
                border-radius: 8px;
                background: white;
              }
              .school-header { background-color: #0d6efd !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .student-info { background-color: #f8f9fa !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              thead tr { background-color: #0d6efd !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .table-info { background-color: #e7f1ff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .result-card .row.mt-6 { margin-top: 2rem !important; }
            }
          </style>
        </head>
        <body>
          <div id="print-cards">${printContents}</div>
        </body>
      </html>
    `);

    popup.document.close();

    // Wait for resources to load before printing
    popup.onload = () => {
      popup.focus();
      popup.print();
    };
  }

  goBack() {
    this.router.navigate(['/result']);
  }

  retry() {
    this.error = null;
    this.loading = true;
    this.cdr.detectChanges();
    this.fetchPrintData();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    clearTimeout(this.timeoutId);
  }
}