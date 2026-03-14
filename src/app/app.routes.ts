import { Routes } from '@angular/router';

// SMS Pages
import { StudentListComponent } from './pages/students/student-list/student-list';
import { StudentAddComponent } from './pages/students/student-add/student-add';
import { StudentUpdate } from './pages/students/student-update/student-update';
import { ClassListComponent } from './pages/classes/class-list.component/class-list.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component/dashboard.component';
import { AttendanceComponent } from './pages/attendance/attendance.component/attendance.component';
import { ResultEntryComponent } from './pages/result/result.component/result.component';
import { ResultCardPrintComponent } from './pages/result-card-print.component/result-card-print.component';
import { ExamListComponent } from './pages/exam-list/exam-list.component/exam-list.component';

// Auth Pages


// Route Guard (optional but recommended)
import { AuthGuard } from './core/guards/auth.guard';
import { LoginComponent } from './pages/login/login.component/login.component';

import { AdminComponent } from './pages/admin/admin.component/admin.component';

export const routes: Routes = [
  // Auth Routes

  //  { path: 'admin', component: AdminComponent},
   { path: 'login', component: LoginComponent },

  

  // SMS App Routes (Protected by AuthGuard)
  { path: '', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'students', component: StudentListComponent, canActivate: [AuthGuard] },
  { path: 'students/add', component: StudentAddComponent, canActivate: [AuthGuard] },
  { path: 'students/edit/:id', component: StudentUpdate, canActivate: [AuthGuard] },
  { path: 'classes', component: ClassListComponent, canActivate: [AuthGuard] },
  { path: 'attendance', component: AttendanceComponent, canActivate: [AuthGuard] },
  { path: 'result', component: ResultEntryComponent, canActivate: [AuthGuard] },
  { path: 'print', component: ResultCardPrintComponent, canActivate: [AuthGuard] },
  { path: 'exams', component: ExamListComponent, canActivate: [AuthGuard] },
  { path: 'admin', component: AdminComponent, canActivate: [AuthGuard] },
 


  

  // Catch All
  { path: '**', redirectTo: '' }
];