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
          if (this.results.length > 0) {
            setTimeout(() => window.print(), 500);
          } else {
            this.error = 'No result cards found.';
          }
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

  getPhotoUrl(photoPath: string): string {
    if (!photoPath) return 'assets/default-avatar.png';
    const baseUrl = environment.apiUrl.replace('/api', '');
    return `${baseUrl}/${photoPath}`;
  }

  printPage() {
    window.print();
  }

  goBack() {
    this.router.navigate(['/']);
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