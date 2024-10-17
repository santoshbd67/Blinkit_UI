import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";

import { DataService } from 'src/app/services/data.service';
import { AuthService } from 'src/app/services/auth.service';
import { APIConfig } from 'src/app/config/api-config';
import { environment } from './../../../environments/environment';
@Component({
  selector: "app-header",
  templateUrl: "./header.component.html",
  styleUrls: ["./header.component.scss"]
})
export class HeaderComponent implements OnInit {

  apiConfig: any = APIConfig;
  ADMIN_EMAIL;
  ADMIN_EMAILID;

  isUserAdmin: boolean;
  isClientAdmin: boolean;
  userRole = localStorage.getItem('role');

  extractionAssistVisibility = false;
  settingsVisibility = false;
  dashboardVisibility = true;

  PROCESSING_VISIBILITY: number = this.auth.getUserSettings('PROCESSING_VISIBILITY');
  DASHBOARD_VISIBILITY: number = this.auth.getUserSettings('DASHBOARD_VISIBILITY');
  EXTRACTION_ASSIST_VISIBILITY: number = this.auth.getUserSettings('EXTRACTION_ASSIST_VISIBILITY');
  SETTINGS_VISIBILITY: number = this.auth.getUserSettings('SETTINGS_VISIBILITY');
  FAQ_VISIBILITY: number = 0;
  logoSrc: any;

  constructor(private router: Router, private dataService: DataService, private auth: AuthService) { }

  ngOnInit() {
    this.setDefaultRoutesAccess();
    this.FAQ_VISIBILITY = this.auth.getFAQVisibility();
    let adminDetails = this.auth.getAdminDetails();
    this.ADMIN_EMAILID = adminDetails.EmailId;
    this.ADMIN_EMAIL = adminDetails.MailToId;

    this.logoSrc = `../../../assets/images/${this.auth.getUserSettings("PROJECT_CONFIGURATIONS").logoName}`
  }

  setDefaultRoutesAccess() {
    switch (this.userRole) {
      case 'admin':
        this.isUserAdmin = true;
        this.extractionAssistVisibility = true;
        this.settingsVisibility = true;
        this.dashboardVisibility = true;
        break;
      case 'clientadmin':
        this.isClientAdmin = true;
        this.settingsVisibility = true;
        this.extractionAssistVisibility = false;
        this.dashboardVisibility = false;
        break;
      case 'viewer':
        this.dashboardVisibility = false;
        this.extractionAssistVisibility = false;
        this.settingsVisibility = false;
        break;
      case 'reviewer':
        this.dashboardVisibility = false;
        this.extractionAssistVisibility = false;
        this.settingsVisibility = false;
        break;
      case 'bot':
        this.dashboardVisibility = false;
        this.extractionAssistVisibility = false;
        this.settingsVisibility = false;
        break;
      case 'approver':
        this.dashboardVisibility = false;
        this.extractionAssistVisibility = false;
        this.settingsVisibility = false;
        break;
      default:
        break;
    }
  }

  logout() {
    this.auth.userLogout().toPromise().then(res => {
      if (res) {
        localStorage.clear();
        this.dataService.showSuccess('Logged Out Successfully', 'Success', 5000);
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
      this.dataService.showError('Error while logging you out', 'Please Refresh the Page', 5000);
      this.navigateTo('login');
    })

  }

  isAdmin() {
    return localStorage.getItem('role') === 'admin';
  }

  navigateTo(loc) {
    this.router.navigate([loc]);
  }
}
