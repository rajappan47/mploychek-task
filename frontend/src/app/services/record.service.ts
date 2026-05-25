import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface VerificationRecord {
  id: string;
  candidateName: string;
  email: string;
  checkType: string;
  company: string;
  status: 'Verified' | 'Discrepancy Found' | 'In Progress' | 'Failed';
  completionDate: string;
  userId: number;
}

@Injectable({
  providedIn: 'root'
})
export class RecordService {
  private http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api/records';

  public getRecords(delayMs?: number): Observable<{ records: VerificationRecord[] }> {
    let params = new HttpParams();
    if (delayMs !== undefined && delayMs > 0) {
      params = params.set('delay', delayMs.toString());
    }
    
    return this.http.get<{ records: VerificationRecord[] }>(this.apiUrl, { params });
  }
}
