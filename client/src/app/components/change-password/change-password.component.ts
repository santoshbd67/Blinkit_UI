import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { Router } from '@angular/router';
import { APIConfig } from 'src/app/config/api-config';
import { environment } from './../../../environments/environment';

import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CustomValidators } from './custom-validators';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss']
})
export class ChangePasswordComponent implements OnInit {

  newPassword: string = null;
  confirmPassword: string = null;
  oldPassword: string = null;
  apiConfig: any = APIConfig;
  passwordType: string = 'password';
  mandatoryMsg: string = 'This is a mandatory field';
  public frmSignup: FormGroup;
  currentPasswordField: boolean;
  newPasswordField: any;
  confirmPasswordField: any;

  constructor(private fb: FormBuilder, private auth: AuthService, private dataService: DataService, private router: Router) {
    this.frmSignup = this.createManagePasswordForm();
  }

  ngOnInit() { }

  // resetForm() {
  //   this.newPassword = null;
  //   this.confirmPassword = null;
  //   this.oldPassword = null;
  // }

  clearSession() {
    this.auth.userLogout().toPromise().then(res => {
      if (res) {
        localStorage.clear();
        this.dataService.showSuccess('Your session has expired', 'Please login again', 5000);
        let Url = environment.baseAPI + this.apiConfig.API.getUserSettings;
        fetch(Url)
          .then(response => response.json())
          .then(json => {
            this.navigateTo('login');
            this.auth.setUserAccessbilitySettings(json.result.UserSettings)
          })
      }
    }).catch(err => {
      localStorage.clear();
      this.dataService.showError('Error while logging you out', 'Error', 5000);
      this.navigateTo('login');
    })
  }

  navigateTo(loc) {
    this.router.navigate([loc]);
  }

  // submitForm(isDirty, isValid, data) {

  //   if (isDirty) {
  //     if (isValid && data && data.oldPassword && data.newPassword && data.confirmPassword && data.newPassword === data.confirmPassword) {
  //       this.auth.changePassword(data).toPromise().then(res => {
  //         if (res && res.responseCode === 'OK') {
  //           this.dataService.showSuccess('Password Changed Successfully!', 'success', this.dataService.getAlertTimeOut());
  //           //this.router.navigate(['profile/details']);
  //           this.clearSession();
  //         }
  //         else {
  //           this.dataService.showError('current password is incorrect!', 'Incorrect Password', this.dataService.getAlertTimeOut());
  //         }
  //       }).catch(err => {
  //         this.dataService.showError('Error while changing password!', 'error', this.dataService.getAlertTimeOut());
  //         console.error('error while changing password', err);
  //       })
  //     }
  //     else {
  //       this.dataService.showError('Fill all the details & try again', 'validation error', this.dataService.getAlertTimeOut());
  //     }
  //   }
  //   else {
  //     this.dataService.showError('Nothing to save', 'warning', this.dataService.getAlertTimeOut());
  //   }

  // }

  // showPassword() {
  //   this.passwordType = 'text';
  //   setTimeout(() => {
  //     this.passwordType = 'password'
  //   }, 1000);
  // }


  createManagePasswordForm(): FormGroup {
    return this.fb.group(
      {
        oldPassword: [null, Validators.compose([Validators.minLength(8), Validators.required])],
        newPassword: [null,
          Validators.compose([
            Validators.required,
            CustomValidators.patternValidator(/\d/, { hasNumber: true }),// check whether the entered password has a number
            CustomValidators.patternValidator(/[A-Z]/, { hasCapitalCase: true }),  // check whether the entered password has upper case letter
            CustomValidators.patternValidator(/[a-z]/, { hasSmallCase: true }),  // check whether the entered password has a lower case letter
            CustomValidators.patternValidator(/[ !@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, { hasSpecialCharacters: true }),// check whether the entered password has a special character
            Validators.minLength(8)
          ])
        ],
        confirmPassword: [null, Validators.compose([Validators.required])]
      },
      {
        validator: CustomValidators.passwordMatchValidator  // check whether our password and confirm password match
      }
    );
  }

  submit() {
    // call change apssword API
    this.auth.changePassword(this.frmSignup.value).toPromise().then(res => {
      if (res && res.responseCode === 'OK' && res.result.errmsg !== 'New password cannot equal to old password') {
        this.dataService.showSuccess('Password Changed Successfully!', 'success', this.dataService.getAlertTimeOut());
        //this.router.navigate(['profile/details']);
        this.clearSession();
      }
      else {
        if (res && res.result.errmsg == 'New password cannot equal to old password') {
          this.dataService.showError(res.result.errmsg, 'Validation Error', this.dataService.getAlertTimeOut());
        }
        else {
          this.dataService.showError('Current password is Incorrect!', 'Validation Error', this.dataService.getAlertTimeOut());
        }
      }
    }).catch(err => {
      this.dataService.showError('Error while changing password!', 'error', this.dataService.getAlertTimeOut());
      console.error('error while changing password', err);
    })
  }

  toggleCurrentPasswordType() {
    this.currentPasswordField = !this.currentPasswordField;
  }

  toggleNewPasswordType() {
    this.newPasswordField = !this.newPasswordField;
  }

  toggleConfirmPasswordType() {
    this.confirmPasswordField = !this.confirmPasswordField;
  }
}
