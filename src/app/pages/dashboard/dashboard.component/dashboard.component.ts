import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Chart from 'chart.js/auto';
import { ClassService } from '../../../services/class.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  classStats: any[] = [];
  private chart: Chart | undefined;

  constructor(
    private classService: ClassService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats() {
    forkJoin({
      stats: this.classService.getClassStats()
    }).subscribe({
      next: ({ stats }: any) => {
        console.log('Raw data:', stats.data);

        // Apply natural sort based on class name numbers
        this.classStats = stats.data.sort(this.naturalSort.bind(this));

        // console.log('Sorted data:', this.classStats); // verify order

        this.cdr.detectChanges(); // ensure DOM updates
        setTimeout(() => this.renderChart(), 0);
      },
      error: err => console.error('Failed to load stats:', err)
    });
  }

  private naturalSort(a: any, b: any): number {
    const extractNumber = (name: string): number => {
      const match = name.match(/\d+/);
      return match ? parseInt(match[0], 10) : NaN;
    };

    const numA = extractNumber(a.className);
    const numB = extractNumber(b.className);

    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    if (!isNaN(numA)) return -1; // a has number, b doesn't → a first
    if (!isNaN(numB)) return 1;  // b has number, a doesn't → b first
    return a.className.localeCompare(b.className, undefined, { sensitivity: 'base' });
  }

  renderChart() {
    const ctx = document.getElementById('classChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.classStats.map(c => c.className),
        datasets: [
          {
            label: 'Students',
            data: this.classStats.map(c => c.studentCount),
            backgroundColor: 'rgba(54, 162, 235, 0.6)'
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true }
        },
        scales: {
          y: { 
            beginAtZero: true,
            ticks: { stepSize: 1 } 
          }
        }
      }
    });
  }

  openClass(cls: any) {
    this.router.navigate(['/students'], { queryParams: { classId: cls._id } });
  }

  trackByClassId(index: number, cls: any) {
    return cls._id;
  }
}