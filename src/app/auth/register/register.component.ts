import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  userData = {
    email: '',
    password: ''
  };
  error: string | null = null;
  successMessage: string | null = null;

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit(): void {
    this.error = null;
    this.successMessage = null;
    this.authService.register(this.userData)
      .subscribe({
        next: () => {
          this.successMessage = 'Registration successful! You can now login.';
          // Optionally, redirect to login after a short delay or let user click
          // setTimeout(() => this.router.navigate(['/login']), 2000);
        },
        error: (err) => {
          console.error('Registration failed', err);
          this.error = 'Registration failed. Please try again.';
          if (err.error && err.error.detail) {
            if (Array.isArray(err.error.detail)) {
              this.error = err.error.detail.map((e: any) => e.msg).join(', ');
            } else if (typeof err.error.detail === 'string') {
              this.error = err.error.detail;
            }
          }
        }
      });
  }
}
