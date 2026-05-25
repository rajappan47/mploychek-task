import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RecordService, VerificationRecord } from '../../services/record.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  protected authService = inject(AuthService);
  private recordService = inject(RecordService);
  private router = inject(Router);

  // Latency Simulator Parameter (in milliseconds)
  protected delayMs = 1500; 

  // State Signals
  protected records = signal<VerificationRecord[]>([]);
  protected isLoading = signal<boolean>(false);
  protected error = signal<string | null>(null);

  // Computed properties for Dashboard Metrics
  protected totalChecks = computed(() => this.records().length);
  protected verifiedCount = computed(() => this.records().filter(r => r.status === 'Verified').length);
  protected inProgressCount = computed(() => this.records().filter(r => r.status === 'In Progress').length);
  protected discrepanciesCount = computed(() => 
    this.records().filter(r => r.status === 'Discrepancy Found' || r.status === 'Failed').length
  );

  ngOnInit(): void {
    // Refresh user profile details from DB
    this.authService.refreshProfile().subscribe({
      error: () => {
        // Handled by auth guard redirection
      }
    });

    this.loadRecords();
  }

  protected loadRecords(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.recordService.getRecords(this.delayMs).subscribe({
      next: (response) => {
        this.records.set(response.records);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to fetch candidate checks. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  protected logout(): void {
    this.authService.logout();
  }
}
