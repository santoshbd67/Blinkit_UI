import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-email-verification',
  templateUrl: './email-verification.component.html',
  styleUrls: ['./email-verification.component.scss']
})
export class EmailVerificationComponent implements OnInit {
  VerificationToken: any;
  VerificationMessage: any;
  isEmailVerified = false;
  headerMessage = "Email Unverified";
  logoSrc: any;
  projName: string;

  constructor(public authService: AuthService, private route: ActivatedRoute) {
    this.route.queryParams.subscribe(params => {
      this.VerificationToken = params['verificationToken'];
    });
  }

  ngOnInit() {
    this.logoSrc = `../../../assets/images/${this.authService.getUserSettings("PROJECT_CONFIGURATIONS").logoName}`
    this.projName = this.authService.getUserSettings("PROJECT_CONFIGURATIONS").projectName;
    this.validateUserToken();
  }

  validateUserToken() {
    this.authService.verifyUser(this.VerificationToken).subscribe((res) => {
      if (res.result && res.result.status == 200 && res.result.msg == 'Token Verified successfully') {
        this.isEmailVerified = true;
        this.headerMessage = "Account Activated";
      }
      if (res.result && res.result.status == 202 && res.result.msg == 'Token Already Verified') {
        this.isEmailVerified = true;
        this.headerMessage = "Account Already Activated";
      }

    }, err => {
      console.log(err);
      this.isEmailVerified = false;
      this.headerMessage = "Invalid Token";
    })
  }
}
