import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';
import { AuthService } from 'src/app/services/auth.service';
import { CustomvalidationService } from 'src/app/services/customvalidation.service';
import { DataService } from 'src/app/services/data.service';
import { APIConfig } from 'src/app/config/api-config';

@Component({
  selector: 'app-check-email',
  templateUrl: './check-email.component.html',
  styleUrls: ['./check-email.component.scss']
})
export class CheckEmailComponent implements OnInit {

  emailForm: FormGroup;
  submitted: boolean;
  apiConfig: any = APIConfig;

  constructor(private router: Router, public fb: FormBuilder, private auth: AuthService, private dataService: DataService,
    private customValidator: CustomvalidationService) { }

  ngOnInit() {
    this.emailForm = this.fb.group({
      emailId: ["", Validators.compose([Validators.required, Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$'), Validators.email, this.customValidator.emailValidator.bind(this.customValidator)])],
    });
  }

  returnToSignIn() {
    this.router.navigateByUrl("/login");
  }

  onSubmit() {
    this.submitted = true;
    if (this.emailForm.valid) {

      let data = {
        //emailId: this.auth.encrypt(this.emailForm.value.emailId),
        emailId: this.emailForm.value.emailId
      }
      this.auth.forgotPassword(data).subscribe(res => {
        if (res && res.responseCode === 'OK') {
          this.dataService.showSuccess('Reset Link has been sent to your Email.Please check Your Inbox.', 'success', this.dataService.getAlertTimeOut());
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        }
        else {
          this.dataService.showError('Sorry, this email does not exist.', 'Error', this.dataService.getAlertTimeOut());
        }
      }, err => {
        this.dataService.showError('Sorry, this email does not exist.', 'Error', this.dataService.getAlertTimeOut());
      })
    }
  }
}
