import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { UserManagementService } from '../../services/user-management.service';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-panel.html',
  styleUrl: './admin-panel.css'
})
export class AdminPanelComponent implements OnInit {
  protected authService = inject(AuthService);
  private userService = inject(UserManagementService);

  // Simulated latency
  protected delayMs = 1500;

  // UI State Signals
  protected users = signal<User[]>([]);
  protected isLoading = signal<boolean>(false);
  protected showModal = signal<boolean>(false);
  protected modalTitle = signal<string>('Add System User');
  protected isSubmitting = signal<boolean>(false);

  // Message Banners
  protected errorMessage = signal<string | null>(null);
  protected successMessage = signal<string | null>(null);

  // Form Fields
  protected editUserId: number | null = null;
  protected formUsername = '';
  protected formPassword = '';
  protected formRole: 'Admin' | 'General User' = 'General User';
  protected formFullName = '';
  protected formEmail = '';
  protected formDesignation = '';
  protected formDepartment = '';

  // Stats
  protected totalUsers = computed(() => this.users().length);
  protected adminCount = computed(() => this.users().filter(u => u.role === 'Admin').length);
  protected userCount = computed(() => this.users().filter(u => u.role === 'General User').length);

  ngOnInit(): void {
    this.loadUsers();
  }

  protected loadUsers(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.userService.getUsers(this.delayMs).subscribe({
      next: (response) => {
        this.users.set(response.users);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('Failed to load user accounts.');
        this.isLoading.set(false);
      }
    });
  }

  protected openAddModal(): void {
    this.editUserId = null;
    this.formUsername = '';
    this.formPassword = '';
    this.formRole = 'General User';
    this.formFullName = '';
    this.formEmail = '';
    this.formDesignation = '';
    this.formDepartment = '';
    
    this.modalTitle.set('Add System User');
    this.errorMessage.set(null);
    this.showModal.set(true);
  }

  protected openEditModal(user: User): void {
    this.editUserId = user.id;
    this.formUsername = user.username;
    this.formPassword = ''; // leave blank if password is not changing
    this.formRole = user.role;
    this.formFullName = user.fullName;
    this.formEmail = user.email;
    this.formDesignation = user.designation;
    this.formDepartment = user.department;

    this.modalTitle.set('Modify System User');
    this.errorMessage.set(null);
    this.showModal.set(true);
  }

  protected closeModal(): void {
    this.showModal.set(false);
    this.errorMessage.set(null);
  }

  protected saveUser(): void {
    if (!this.formUsername.trim() || !this.formFullName.trim() || !this.formEmail.trim() || !this.formDesignation.trim() || !this.formDepartment.trim()) {
      this.errorMessage.set('Please fill out all required fields.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload = {
      username: this.formUsername,
      role: this.formRole,
      fullName: this.formFullName,
      email: this.formEmail,
      designation: this.formDesignation,
      department: this.formDepartment,
      ...(this.formPassword ? { password: this.formPassword } : {})
    };

    if (this.editUserId === null) {
      // Create user flow
      this.userService.createUser(payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.showModal.set(false);
          this.triggerNotification('User created successfully.');
          this.loadUsers();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err.error?.error || 'Failed to create user account.');
        }
      });
    } else {
      // Update user flow
      this.userService.updateUser(this.editUserId, payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.showModal.set(false);
          this.triggerNotification('User details updated successfully.');
          this.loadUsers();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err.error?.error || 'Failed to update user account.');
        }
      });
    }
  }

  protected deleteUser(id: number): void {
    if (Number(this.authService.currentUser()?.id) === Number(id)) {
      alert('Action Denied: You cannot delete your own administrative account.');
      return;
    }

    if (!confirm('Are you sure you want to permanently delete this user? This will remove all verification privileges for this account.')) {
      return;
    }

    this.userService.deleteUser(id).subscribe({
      next: () => {
        this.triggerNotification('User account deleted.');
        this.loadUsers();
      },
      error: (err) => {
        alert(err.error?.error || 'Failed to delete user account.');
      }
    });
  }

  private triggerNotification(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => {
      this.successMessage.set(null);
    }, 4000);
  }

  protected logout(): void {
    this.authService.logout();
  }
}
