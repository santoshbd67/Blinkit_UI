import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { FormBuilder } from '@angular/forms';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { Validators } from '@angular/forms';
import * as CryptoJS from 'crypto-js';
import { CustomvalidationService } from './../../services/customvalidation.service';
import { APIConfig } from 'src/app/config/api-config';
import * as uuid from 'uuid';
import { environment } from '../../../environments/environment';
import { AppConfig } from './../../config/app-config';
import { CustomValidators } from './../change-password/custom-validators';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignupComponent implements OnInit {

  signupForm: FormGroup;
  submitted = false;
  apiConfig: any = APIConfig;
  appConfig: any = AppConfig;
  fieldTextType: boolean;
  logoSrc: any;

  constructor(private router: Router, public fb: FormBuilder, private auth: AuthService, private dataService: DataService, private customValidator: CustomvalidationService) { }

  ngOnInit() {
    this.signupForm = this.fb.group({
      //emailId: ["", [Validators.required, Validators.email, Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$')]],
      emailId: ["", Validators.compose([Validators.required, Validators.pattern('^[a-z0-9A-Z._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,4}$'), Validators.email, this.customValidator.emailValidator.bind(this.customValidator)])],
      userName: ["", [Validators.required, Validators.minLength(3), Validators.maxLength(30)]],
      //password: ["", Validators.compose([Validators.required, this.customValidator.patternValidator()])],
      password: ["", Validators.compose([
        Validators.required,
        CustomValidators.patternValidator(/\d/, { hasNumber: true }),// check whether the entered password has a number
        CustomValidators.patternValidator(/[A-Z]/, { hasCapitalCase: true }),  // check whether the entered password has upper case letter
        CustomValidators.patternValidator(/[a-z]/, { hasSmallCase: true }),  // check whether the entered password has a lower case letter
        CustomValidators.patternValidator(/[ !@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, { hasSpecialCharacters: true }),// check whether the entered password has a special character
        Validators.minLength(8)
      ])],
    });

    this.logoSrc = `../../../assets/images/${this.auth.getUserSettings("PROJECT_CONFIGURATIONS").logoName}`

  }

  toggleFieldTextType() {
    this.fieldTextType = !this.fieldTextType;
  }

  onSubmit() {

    console.log(this.signupForm.valid);

    this.submitted = true;
    if (this.signupForm.valid) {
      let payload = this.auth.getPayload(this.signupForm.value, 'self');
      this.auth.userSignUp(payload).subscribe(res => {
        if (res && res.responseCode == 'OK') {
          this.nextActionAfterSubmit(res.result);
        }
        else {
          this.dataService.showError('We could not register now. Please try later.', 'Server Error', this.dataService.getAlertTimeOut());
        }
      }, err => {
        if (err.error.result.status === 409) {
          this.dataService.showError('User already exists', 'Duplicate Entry', this.dataService.getAlertTimeOut());
        }
        else if (err.error.result.status === 403) {
          this.dataService.showError('Please provide your corporate EmailId.', 'Invalid Email Address', this.dataService.getAlertTimeOut());
        }
        else {
          this.dataService.showError('Error while registering you.', 'Server Error', this.dataService.getAlertTimeOut());
        }
        console.error('signup error', err);
      })
    }
  }

  nextActionAfterSubmit(result) {
    this.router.navigateByUrl("/thankyou");
  }
}
