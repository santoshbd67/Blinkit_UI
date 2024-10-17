import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from '../../services/auth.service';
import { DataService } from 'src/app/services/data.service';

import * as CryptoJS from 'crypto-js';
import { APIConfig } from "src/app/config/api-config";

@Component({
  selector: "app-login",
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.scss"]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  submitted = false;
  apiConfig: any = APIConfig;
  fieldTextType: boolean;
  userEmail: string;
  SIGNUP_PAGE_VISIBILITY = 0;
  projConfig: any;
  logoSrc: string;
  projName: string;

  constructor(private router: Router, public fb: FormBuilder, private auth: AuthService, private dataService: DataService,) { }

  ngOnInit() {
    this.loginForm = this.fb.group({
      emailId: ["", [Validators.required, Validators.email]],
      password: ["", Validators.required]
    });
    setTimeout(() => {
      this.SIGNUP_PAGE_VISIBILITY = this.auth.getUserSettings('SIGNUP_PAGE_VISIBILITY');
      this.projConfig = this.auth.getUserSettings("PROJECT_CONFIGURATIONS");
      this.logoSrc = `../../../assets/images/${this.projConfig.logoName}`
      this.projName = this.projConfig.projectName;
    }, 2000);
  }

  toggleFieldTextType() {
    this.fieldTextType = !this.fieldTextType;
  }

  forgotPassword() {
    var subject = `Reset ${this.projName} Password`;
    var emailBody = `Hello Admin, 
    Please help me to reset my ${this.projName} password.`;
    this.router.navigateByUrl("/forgot-password");
  }

  onSubmit() {

    this.submitted = true;

    if (this.loginForm.valid) {
      let payload = {
        //emailId: this.auth.encrypt(this.loginForm.value.emailId.toLowerCase()),
        emailId: this.loginForm.value.emailId.toLowerCase(),
        password: CryptoJS.SHA256(this.loginForm.value.password).toString()
      }

      this.auth.userLogin(payload).subscribe(res => {

        if (res && res.responseCode == 'OK') {
          this.dataService.showSuccess('Logged In Successfully', 'Success', 5000);
          this.auth.setUserDetails(res.result);
          this.nextActionAfterSubmit(res.result);
        }
        else {
          this.dataService.showError('Invalid email or password', 'Authentication Error', 5000);
        }
      }, err => {
        if (err && err.error.result.err == 'UNAUTHORIZED' && err.error.result.errmsg == 'Email Not Verified')
          this.dataService.showError('Your EmailId is not Verified. Please check your inbox and validate your email.', 'Unverified User', 5000);
        else if (err && err.error.result.err == 'NOTFOUND' && err.error.result.status == 404) {
          this.dataService.showError('Invalid EmailId or Password', 'Invalid Credentials', 5000);
        } else
          this.dataService.showError('Error while logging you in', 'Server Error', 5000);
      })
    }
  }

  nextActionAfterSubmit(result) {
    this.setPropertiesInLocalStorage(result);
    this.dataService.checkConsumedQuota();
    this.setRouteAfterLogin(result);
  }

  setPropertiesInLocalStorage({ emailId, lastLogin, token, userId, role }) {
    localStorage.setItem('emailId', emailId);
    localStorage.setItem('lastLogin', lastLogin);
    localStorage.setItem('token', token);
    localStorage.setItem('userId', userId);
    localStorage.setItem('role', role);
  }

  setRouteAfterLogin(result) {
    if (localStorage.getItem('emailId') && localStorage.getItem('lastLogin')) {
      //let extractionAssistVisibility: number = Number(JSON.parse(this.auth.decryptPayload(result.UserSettings)).EXTRACTION_ASSIST_VISIBILITY);

      switch (result.role) {
        case 'admin':
          //extractionAssistVisibility === 1 ? this.router.navigateByUrl("/extraction-assist") : this.router.navigateByUrl("/processing");
          this.router.navigateByUrl("/processing");
          break;
        case 'clientadmin':
          //extractionAssistVisibility === 1 ? this.router.navigateByUrl("/extraction-assist") : this.router.navigateByUrl("/processing");
          this.router.navigateByUrl("/processing");
          break;
        case 'viewer':
          this.router.navigateByUrl("/processing");
          break;
        case 'reviewer':
          this.router.navigateByUrl("/processing?status=REVIEW");
          break;
        case 'bot':
          this.router.navigateByUrl("/processing");
          break;
        case 'approver':
          this.router.navigateByUrl("/processing?status=RPA_PENDING_APPROVAL");
          break;
        default:
          break;
      }
    }
  }

  bookmarkPage(event) {
    event.preventDefault();
    alert("Press " + (navigator.userAgent.toLowerCase().indexOf('mac') != -1 ? 'Command/Cmd' : 'CTRL') + "+D to bookmark this page.")
    // var createBookmark = browser.bookmarks.create({
    //   title: "bookmarks.create() on MDN",
    //   url: "https://developer.mozilla.org/Add-ons/WebExtensions/API/bookmarks/create"
    // });
  }
}
