import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {

  currentOrientation: string = 'vertical';
  constructor() { }
  settings: any[] = [{
    text: "Details", route: "details"
  }, {
    text: "Change Password", route: "change-password"
  }];


  ngOnInit() {
  }

}
