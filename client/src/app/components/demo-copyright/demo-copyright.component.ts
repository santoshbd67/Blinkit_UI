import { Component, OnInit } from '@angular/core';
import { APIConfig } from 'src/app/config/api-config';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-demo-copyright',
  templateUrl: './demo-copyright.component.html',
  styleUrls: ['./demo-copyright.component.scss']
})
export class DemoCopyrightComponent implements OnInit {

  apiConfig: any = APIConfig;
  HOW_IT_WORKS_URL: string;
  currentYear: any;
  appVersion: any = '1.0.0';

  constructor(private auth: AuthService) {
    this.currentYear = new Date().getFullYear();
    this.appVersion = this.auth.getUserSettings("PROJECT_CONFIGURATIONS").appVersion;
  }

  ngOnInit() { }

  howItWorks() {
    window.open(this.auth.getUserSettings('HOW_IT_WORKS_URL'), "_blank");
  }
}
