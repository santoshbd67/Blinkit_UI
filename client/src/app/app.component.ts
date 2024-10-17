import { Component, OnInit } from '@angular/core';
import { environment } from "src/environments/environment";
import { APIConfig } from 'src/app/config/api-config';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'tao-tapp';
  apiConfig: any = APIConfig;

  constructor(private auth: AuthService) { }

  ngOnInit() {
    let Url = environment.baseAPI + this.apiConfig.API.getUserSettings;
    fetch(Url)
      .then(response => response.json())
      .then(json => {
        this.auth.setUserAccessbilitySettings(json.result.UserSettings)
      })
  }
}
