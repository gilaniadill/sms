import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../enviroment";

@Injectable({ providedIn: "root" })
export class AttendanceService {
  private api = `${environment.apiUrl}/attendance`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<any> {
    return this.http.get(this.api);
  }

  create(data: any): Observable<any> {
    return this.http.post(this.api, data);
  }

  update(id: string, data: any): Observable<any> {
    return this.http.put(`${this.api}/${id}`, data);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.api}/${id}`);
  }
}