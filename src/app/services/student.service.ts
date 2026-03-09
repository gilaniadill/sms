import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../enviroment'; // fixed typo
import { Student } from '../models/student.model'; // import your model

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private API = `${environment.apiUrl}/students`; // adjust if needed, your example had /api/students but environment might already include /api

  constructor(private http: HttpClient) {}

  // ✅ Used by result entry – get students filtered by class and section
  // getStudents(classId?: string, section?: string): Observable<{ success: boolean; data: Student[] }> {
  //   let params = new HttpParams();
  //   if (classId) params = params.set('class', classId);
  //   if (section) params = params.set('section', section);
  //   return this.http.get<{ success: boolean; data: Student[] }>(this.API, { params });
  // }

  getStudents(className?: string, section?: string): Observable<{ success: boolean; data: Student[] }> {
  let params = new HttpParams();
  if (className) params = params.set('className', className);
  if (section) params = params.set('section', section);
  return this.http.get<{ success: boolean; data: Student[] }>(this.API, { params });
}

  // Original pagination method (rename to avoid conflict if needed)
  getStudentsPaginated(params?: { page?: number; limit?: number }): Observable<any> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);
    return this.http.get<any>(this.API, { params: httpParams });
  }

  // Other methods remain unchanged but should also use proper types where possible
  createStudent(data: FormData): Observable<any> {
    return this.http.post(this.API, data);
  }

  getStudentById(id: string): Observable<{ success: boolean; data: Student }> {
    return this.http.get<{ success: boolean; data: Student }>(`${this.API}/${id}`);
  }

  updateStudent(id: string, data: FormData): Observable<any> {
    return this.http.put(`${this.API}/${id}`, data);
  }

  deleteStudent(id: string): Observable<any> {
    return this.http.delete(`${this.API}/${id}`);
  }

  deleteSelected(ids: string[]): Observable<any> {
    return this.http.delete(this.API, { body: { ids } });
  }

  getStudentsByClass(className: string): Observable<any> {
    return this.http.get<any>(`${this.API}/class/${className}`);
  }

  // This is essentially the same as getStudents with classId and section
  getStudentsByClassSection(classId: string, section: string): Observable<any> {
    return this.http.get(`${this.API}?classId=${classId}&section=${section}`);
  }

  countByClass(classId: string, section?: string): Observable<any> {
    let params = new HttpParams().set('classId', classId);
    if (section) params = params.set('section', section);
    return this.http.get<any>(`${this.API}/count`, { params });
  }
}