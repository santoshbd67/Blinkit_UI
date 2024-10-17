import { Component, OnInit } from '@angular/core';
import { APIConfig } from 'src/app/config/api-config';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-demo-instuctions',
  templateUrl: './demo-instuctions.component.html',
  styleUrls: ['./demo-instuctions.component.scss']
})
export class DemoInstuctionsComponent implements OnInit {

  apiConfig: any = APIConfig;
  HOW_IT_WORKS_URL: string;
  LOGO_VISIBILITY = 0;
  projConfigs: any;

  constructor(private auth: AuthService) { }

  ngOnInit() {
    this.LOGO_VISIBILITY = this.auth.getUserSettings("LOGO_VISIBILITY");
    this.projConfigs = this.auth.getUserSettings("PROJECT_CONFIGURATIONS");
  }

  howItWorks() {
    window.open(this.auth.getUserSettings('HOW_IT_WORKS_URL'), "_blank");
  }
}
