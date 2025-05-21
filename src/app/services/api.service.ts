import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly API_URL = 'https://localhost:8000/api/v1';

  constructor(private http: HttpClient) { }

  private getAuthHeaders(isFormData: boolean = false): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    let headers = new HttpHeaders();

    if (!isFormData) {
      headers = headers.set('Content-Type', 'application/json');
    }

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  get(endpoint: string): Observable<any> {
    return this.http.get(`${this.API_URL}/${endpoint}`, { headers: this.getAuthHeaders() });
  }

  post(endpoint: string, data: any, isFormData: boolean = false): Observable<any> {
    return this.http.post(`${this.API_URL}/${endpoint}`, data, { headers: this.getAuthHeaders(isFormData) });
  }

  put(endpoint: string, data: any): Observable<any> {
    return this.http.put(`${this.API_URL}/${endpoint}`, data, { headers: this.getAuthHeaders() });
  }
}
