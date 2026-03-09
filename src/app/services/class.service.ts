import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Class, Group  } from '../models/class.model';
import { environment } from '../../enviroment';

@Injectable({ providedIn: 'root' })
export class ClassService {
  private apiUrl = `${environment.apiUrl}/classes`;

  constructor(private http: HttpClient) {}

  getClasses(): Observable<{ success: boolean; data: Class[] }> {
    return this.http.get<{ success: boolean; data: Class[] }>(this.apiUrl);
  }

  getClassGroups(classId: string): Observable<{ success: boolean; data: Group[] }> {
    return this.http.get<{ success: boolean; data: Group[] }>(`${this.apiUrl}/${classId}/groups`);
  }
  getGroups(classId: string): Observable<any> {
  return this.http.get(`${this.apiUrl}/${classId}/groups`);
}

  createClass(data: Partial<Class>): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  updateClass(id: string, data: Partial<Class>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  deleteClass(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
   getClassStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats`);
  }

   addGroup(classId: string, group: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${classId}/groups`, group);
  }

  updateGroup(classId: string, groupId: string, group: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${classId}/groups/${groupId}`, group);
  }

  deleteGroup(classId: string, groupId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${classId}/groups/${groupId}`);
  }
}