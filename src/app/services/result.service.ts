import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Result } from '../models/result.model';
import { environment } from '../../enviroment';

@Injectable({ providedIn: 'root' })
export class ResultService {
  private apiUrl = `${environment.apiUrl}/results`;

  constructor(private http: HttpClient) {}

  getResults(examId: string, classId?: string, section?: string): Observable<{ success: boolean; data: Result[] }> {
    let params = new HttpParams().set('examId', examId);
    if (classId) params = params.set('classId', classId);
    if (section) params = params.set('section', section);
    return this.http.get<{ success: boolean; data: Result[] }>(this.apiUrl, { params });
  }

  bulkUpsert(payload: { examId: string; results: { studentId: string; marks: { [subject: string]: number } }[] }): Observable<any> {
    return this.http.post(`${this.apiUrl}/bulk`, payload);
  }

  deleteResults(ids: string[]): Observable<{ success: boolean; deletedCount: number }> {
    return this.http.request<{ success: boolean; deletedCount: number }>('delete', this.apiUrl, { body: { ids } });
  }

  getPrintData(examId: string, studentIds: string[]): Observable<{ success: boolean; data: any[] }> {
    return this.http.post<{ success: boolean; data: any[] }>(`${this.apiUrl}/print`, { examId, studentIds });
  }
}