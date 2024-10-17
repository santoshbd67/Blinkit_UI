import { Component, OnInit } from '@angular/core';
import { APIConfig } from './../../config/api-config';
import { Location } from '@angular/common';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-faq',
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.scss']
})
export class FaqComponent implements OnInit {

  apiConfig: any = APIConfig;
  ADMIN_EMAIL: string;//= `mailto:${APIConfig.ADMIN_EMAILID}`;
  ADMIN_EMAILID: string //=APIConfig.ADMIN_EMAILID;
  logoSrc: any;

  constructor(private location: Location, private auth: AuthService) { }

  ngOnInit() {
    let adminDetails = this.auth.getAdminDetails();
    this.ADMIN_EMAILID = adminDetails.EmailId;
    this.ADMIN_EMAIL = adminDetails.MailToId;
    this.logoSrc = `../../../assets/images/${this.auth.getUserSettings("PROJECT_CONFIGURATIONS").logoName}`

  }

  goBack() {
    this.location.back();
  }

}
