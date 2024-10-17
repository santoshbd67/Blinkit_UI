import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { CustomvalidationService } from 'src/app/services/customvalidation.service';
import * as CryptoJS from 'crypto-js';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {

  resetform: FormGroup;
  submitted = false;
  token: any;
  fieldTextType: boolean;
  cnfFieldTextType: boolean;

  constructor(public fb: FormBuilder,
    private auth: AuthService,
    private dataService: DataService,
    private router: Router,
    private route: ActivatedRoute,
    private customValidator: CustomvalidationService) {
    this.route.queryParams.subscribe(params => { this.token = params['verificationToken']; });
  }
  password: string = null;
  confirmPassword: string = null;

  ngOnInit() {
    this.resetform = this.fb.group({
      password: ["", [Validators.compose([Validators.required, this.customValidator.patternValidator()])]],
      cnfpassword: ["", [Validators.compose([Validators.required, this.customValidator.patternValidator()])]],
    });
  }

  toggleFieldTextType() {
    this.fieldTextType = !this.fieldTextType;
  }
  toggleCnfFieldTextType() {
    this.cnfFieldTextType = !this.cnfFieldTextType;
  }

  onSubmit() {
    this.submitted = true;
    if (this.resetform.valid) {
      let data = {
        password: CryptoJS.SHA256(this.resetform.value.password).toString(),
        token: this.token
      }
      this.auth.resetPassword(data).subscribe(res => {
        if (res && res.responseCode === 'OK' && res.result.status == 200) {
          this.dataService.showSuccess('Your Password has been changed successfully. Now You can login again.', 'Congrats', 3000);
          setTimeout(() => {
            this.router.navigate(['/login']);
            this.resetform.reset();
          }, 3000);
        }
        else {
          if (res && res.result.status == 400) {
            this.dataService.showError(res.result.msg, 'Validation Error', this.dataService.getAlertTimeOut());
          }
          else {
            this.dataService.showError('Sorry,We could not change your password this time. Please try later.', 'server error');
          }
        }
      }, err => {
        this.dataService.showError('Sorry,We could not change your password this time. Please try later.', 'server error');
      })
    }
  }
}
