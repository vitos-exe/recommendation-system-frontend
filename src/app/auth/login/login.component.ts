import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { CommonModule } from '@angular/common'; // Import CommonModule for ngIf, etc.

@Component({
  selector: 'app-login',
  standalone: true, // Add standalone: true
  imports: [FormsModule, CommonModule, RouterLink], // Add FormsModule, CommonModule, RouterLink to imports
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  credentials = {
    username: '',
    password: ''
  };
  error: string | null = null;

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit(): void {
    this.error = null;
    const formData = new FormData();
    
    formData.append('username', this.credentials.username);
    formData.append('password', this.credentials.password);

    this.authService.login(formData) // Sending FormData directly
      .subscribe({
        next: () => {
          // Navigation is handled by AuthService
        },
        error: (err) => {
          console.error('Login failed', err);
          this.error = 'Login failed. Please check your credentials and try again.';
          if (err.error && err.error.detail) {
            this.error = err.error.detail;
          }
        }
      });
  }
}
