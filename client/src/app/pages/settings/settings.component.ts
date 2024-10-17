import { Component, OnInit, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class SettingsComponent implements OnInit {
  constructor() { }

  settings: any[] = [
    {
      text: 'Manage Users',
      route: 'users'
    }
    // {
    //   text: 'Rule Creation',
    //   route: 'createRules'
    // }
    // {
    //   text: 'XMLMapping',
    //   route: 'xmlMapping',
    //   disabled: true
    // },
    // {
    //   text: 'Vendors',
    //   route: 'vendors',
    //   disabled: true
    // },
    // {
    //   text: 'Status',
    //   route: 'status',
    //   disabled: true
    // },
    // {
    //   text: 'Language',
    //   route: 'language',
    //   disabled: true
    // },
    // {
    //   text: 'Currency',
    //   route: 'currency',
    //   disabled: true
    // },
    // {
    //   text: 'Preprocessing',
    //   route: 'preprocessing',
    //   disabled: true
    // },
    // {
    //   text: 'Extraction',
    //   route: 'extraction',
    //   disabled: true
    // },
    // {
    //   text: 'RPA',
    //   route: 'rpa',
    //   disabled: true
    // }
  ];

  ngOnInit() { }

  // tabClick(event) {
  //   // this.currentTab = event.nextId;
  //   // if (this.currentTab === 'vendor') {
  //   //   this.getVendorList();
  //   // }
  // }
}
