import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Exam } from '../models/exam.model';
import { environment } from '../../enviroment';

@Injectable({ providedIn: 'root' })
export class ExamService {
  private apiUrl = `${environment.apiUrl}/exams`;

  constructor(private http: HttpClient) {}

  getExamsByClass(classId?: string, group?: string): Observable<{ success: boolean; data: Exam[] }> {
    let params = new HttpParams();
    if (classId) params = params.set('classId', classId);
    if (group) params = params.set('group', group);
    return this.http.get<{ success: boolean; data: Exam[] }>(this.apiUrl, { params });
  }

  // Create exam
  createExam(data: any): Observable<{ success: boolean; data: Exam }> {
    return this.http.post<{ success: boolean; data: Exam }>(this.apiUrl, data);
  }

  // Get exams with optional filters
  getExams(classId?: string, group?: string): Observable<{ success: boolean; data: Exam[] }> {
    let params = new HttpParams();
    if (classId) params = params.set('classId', classId);
    if (group) params = params.set('group', group);
    return this.http.get<{ success: boolean; data: Exam[] }>(this.apiUrl, { params });
  }

  // Get single exam
  getExamById(id: string): Observable<{ success: boolean; data: Exam }> {
    return this.http.get<{ success: boolean; data: Exam }>(`${this.apiUrl}/${id}`);
  }

  // Update exam
  updateExam(id: string, data: any): Observable<{ success: boolean; data: Exam }> {
    return this.http.put<{ success: boolean; data: Exam }>(`${this.apiUrl}/${id}`, data);
  }

  // Delete exam
  deleteExam(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`);
  }
}