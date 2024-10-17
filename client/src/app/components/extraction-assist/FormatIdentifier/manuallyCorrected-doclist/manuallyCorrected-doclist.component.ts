import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-manuallyCorrected-doclist',
  templateUrl: './manuallyCorrected-doclist.component.html',
  styleUrls: ['./manuallyCorrected-doclist.component.scss']
})
export class ManuallyCorrectedDocListComponent implements OnInit {
  selectedFilters: any = {};
  isDocsFetched = false;
  activeVerticalTab: any;

  verticalTabs: any[] = [
    { route: null, tab: "HOME", active: true, value: 0, subRoutes: [] },
    { route: "Rules", tab: "RULES", active: false, value: 2, subRoutes: [] },
    { route: "ML Identifier", tab: "ML IDENTIFIER", active: false, value: 0, subRoutes: [] }
  ];

  mappingObject = {
    "HOME": [
      { route: null, tab: "EA Queue", active: true, value: 0 },
      { route: "RaisedTickets", tab: "Tickets Raised", active: false, value: 1 }
    ],
    "RULES": [
      { route: null, tab: "Rules Created", active: true, value: 0 }
    ],
    "ML IDENTIFIER": [
      { route: null, tab: "ML Identifiers", active: true, value: 0 }
    ]
  }
  horizontalTabs: any = []; //will be dynamic based on verticalTab selected

  imgSrc: any = {
    homeIcon: "../../../../../assets/images/ea-home2.png",
  };

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute) { }

  ngOnInit() {
    this.checkQueryParams();
    // this.setDefaultVerticalTab();
    // this.setDefaultHorzintolTab();
    // this.setTabs(this.verticalTabs[0].tab); // TODO commented above 3 for state preserve
  }

  setDefaultVerticalTab() {
    if (this.verticalTabs && this.verticalTabs.length > 0) {
      this.verticalTabs[0].active = true;
    }
  }

  setDefaultHorzintolTab() {
    if (this.horizontalTabs && this.horizontalTabs.length > 0) {
      this.horizontalTabs[0].active = true;
    }
  }

  checkQueryParams() {
    this.activatedRoute.queryParams.subscribe((res) => {
      // let params = JSON.parse(JSON.stringify(res));

      localStorage.removeItem("vendorPagecalledFrom");
      localStorage.removeItem("templatePagecalledFrom");

      //TODO to preserve state on refresh
      setTimeout(() => { this.isDocsFetched = true; }, 500)

      let params = JSON.parse(JSON.stringify(res));
      if (!params.verticalTab) {
        this.setDefaultVerticalTab();
        this.setDefaultHorzintolTab();
        this.setTabs(this.verticalTabs[0].tab)
      }
      this.getHorzintolTabList();


      this.setDefaultTabs(params);
    })
  }

  setDefaultTabs(res) {
    if (res.verticalTab) {
      if (this.verticalTabs && this.verticalTabs.length > 0) {
        this.verticalTabs.forEach((each) => {
          if (each.tab == res.verticalTab) {
            each.active = true;
          } else {
            each.active = false;
          }
        });
      }
    }
    if (res.horzTab) {
      if (this.horizontalTabs && this.horizontalTabs.length > 0) {
        if (this.horizontalTabs.length > 0) {
          this.horizontalTabs.forEach((each) => {
            if (each.tab == res.horzTab) {
              each.active = true;
            } else {
              each.active = false;
            }
          });
        }
      }
    }

    this.getActiveVerticalTab();
    this.getHorzintolTabList();
  }

  getActiveVerticalTab() {
    let tab = this.verticalTabs.filter((tab) => {
      return tab.active === true;
    })

    this.activeVerticalTab = tab && tab.length > 0 ? tab[0].tab : undefined;
  }

  getHorzintolTabList() {
    this.horizontalTabs = this.mappingObject[this.activeVerticalTab];
    return this.horizontalTabs;
  }

  parentClicked(ind) {
    this.isDocsFetched = false;
    for (let i = 0; i < this.verticalTabs.length; i++) {
      if (i == ind) {
        this.verticalTabs[i].active = true;
      } else {
        this.verticalTabs[i].active = false;
      }
    }
  }

  onClickHorizontalTab(tabName) {
    this.getActiveVerticalTab();
    this.horizontalTabs.filter((tab) => {
      if (tab.tab == tabName) {
        tab.active = true;
      }
      else {
        tab.active = false;
      }
    })

    this.selectedFilters.horzTab = tabName;
    this.router.navigate(["extraction-assist"], { queryParams: this.selectedFilters });
    if (tabName == 'Tickets Raised') {
      tabName = 'RaisedTickets';
    }
  }

  // called on tab-click 
  setTabs(vertTab, horzTab?) {
    if (!horzTab) {
      this.getActiveVerticalTab();
      this.getHorzintolTabList();
      horzTab = this.horizontalTabs[0].tab;
    }
    if (vertTab && horzTab) {
      this.selectedFilters.verticalTab = vertTab;
      this.selectedFilters.horzTab = horzTab;
    }
    else {
      delete this.selectedFilters.verticalTab;
      delete this.selectedFilters.horzTab;
    }

    this.router.navigate(["extraction-assist"], { queryParams: this.selectedFilters });
    setTimeout(() => { this.isDocsFetched = true; }, 500)
  }
}
