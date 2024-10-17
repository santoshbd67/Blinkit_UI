import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { APIConfig } from './../../config/api-config';

@Component({
  selector: 'app-thankyou',
  templateUrl: './thankyou.component.html',
  styleUrls: ['./thankyou.component.scss']
})
export class ThankyouComponent implements OnInit {

  apiConfig: any = APIConfig;
  ADMIN_EMAIL;// = `mailto:${APIConfig.ADMIN_EMAILID}`;
  ADMIN_EMAILID;// = APIConfig.ADMIN_EMAILID;
  projName: string;

  constructor(private auth: AuthService) { }

  ngOnInit() {
    let adminDetails = this.auth.getAdminDetails();
    this.ADMIN_EMAILID = adminDetails.EmailId;
    this.ADMIN_EMAIL = adminDetails.MailToId;
    this.projName = this.auth.getUserSettings("PROJECT_CONFIGURATIONS").projectName;
  }

}
