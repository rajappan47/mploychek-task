import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Form Fields
  protected username = '';
  protected password = '';
  protected role: 'Admin' | 'General User' = 'General User';

  // State Signals
  protected errorMessage = signal<string | null>(null);
  protected isLoading = signal<boolean>(false);

  // Quick Login Helpers
  protected useDemoCredentials(type: 'admin' | 'general'): void {
    if (type === 'admin') {
      this.username = 'admin';
      this.password = 'admin123';
      this.role = 'Admin';
    } else {
      this.username = 'general';
      this.password = 'general123';
      this.role = 'General User';
    }
    this.errorMessage.set(null);
  }

  protected onSubmit(): void {
    if (!this.username.trim() || !this.password.trim()) {
      this.errorMessage.set('Please enter both username and password.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.username, this.password, this.role).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.user.role === 'Admin') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err);
      }
    });
  }
}
