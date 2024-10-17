import { Component, Input, OnInit, OnChanges, SimpleChanges, EventEmitter, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ExtractionAssistService } from 'src/app/services/extraction-assist.service';
import { DataService } from 'src/app/services/data.service';

@Component({
  selector: 'app-ml-identifier-view',
  templateUrl: './ml-identifier-view.component.html',
  styleUrls: ['./ml-identifier-view.component.scss']
})
export class MlIdentifierViewComponent implements OnInit {

  @Input() horizontalTabs: any;
  @Input() selectedFilters: any;
  @Output() onClickHorizontalTab = new EventEmitter();

  selectedTab: any;
  isDocsFetched: boolean = false;
  mlDataSet: any[];
  itemsCount: number;

  colorsList = ['#EBF5FB', '#FEF5E7', '#E9F7EF', '#F9EBEA', '#F5EEF8'];
  vendors = [];
  colorForUnknown = 'rgb(247 247 247)';

  imgSrc: any = {
    forwardIcon: "../../../assets/images/icons8-forward-button-24.png",
    infoIcon: "../../../assets/images/info.svg",
  };

  statusTextMapping: any = {
    'ML Identifiers': "Vendor Master",
  };

  constructor(
    private extractionService: ExtractionAssistService,
    private dataService: DataService,
    private activatedRoute: ActivatedRoute,
    private router: Router) { }

  ngOnInit() {
    this.activatedRoute.queryParams.subscribe((res) => {
      let queryParams = JSON.parse(JSON.stringify(res));
      this.selectedTab = queryParams.horzTab;
      this.getMLIdentifiersList();
    })
  }

  switchTab(tabName) {
    this.onClickHorizontalTab.emit(tabName);
    this.getMLIdentifiersList();
  }

  getMLIdentifiersList() {
    if (this.selectedTab && this.selectedTab === 'ML Identifiers') {
      this.extractionService.getMLIdentifiersList().subscribe((response) => {

        if (response &&
          response.responseCode == 'OK' &&
          response.result &&
          response.result.status === 'Success' &&
          response.result.list_formats &&
          response.result.list_formats.length > 0) {

          this.mlDataSet = response.result.list_formats;
          this.itemsCount = this.mlDataSet.length;
          this.isDocsFetched = true;
          console.log(this.mlDataSet);
        }
        else {
          this.mlDataSet = [];
          this.isDocsFetched = true;
        }
      }, (error) => {
        console.log("Got error in getMLIdentifiersList method")
        console.log(error);
        this.isDocsFetched = true;
      })
    }
  }

  getColor(vendorId: string) {
    let color: any;

    if (vendorId == 'UNKNOWN') {
      color = this.colorForUnknown;
    }
    else {
      if (this.vendors.find(e => e.vendorId === vendorId)) {
        color = this.vendors.find(e => e.vendorId === vendorId).color
      }
      else {
        color = this.colorsList[this.vendors.length % this.colorsList.length]
        this.vendors.push({
          vendorId: vendorId,
          color: this.colorsList[this.vendors.length % this.colorsList.length]
        })
      }
    }
    return color;
  }

  openMasterDataPage(headerItem) {
    //this.setObjectForTemplateCreationPage(headerItem);

    let dataTobeSent = {
      redirectTo: 'masterdata-suggestion',
      calledFrom: 'ML_Identifier',
    }
    this.getDocumentId(headerItem.VENDOR_ID, dataTobeSent);
  }

  getDocumentId(format, dataTobeSent) {
    this.extractionService.getDocumentsForTesting({ vendorId: format }).subscribe((res) => {
      if (res && res.responseCode == "OK" && res.result && res.result.IdDetailsList && res.result.IdDetailsList.length > 0 && res.result.docIdsList && res.result.docIdsList.length > 0) {
        this.router.navigate(["extraction-assitance"], {
          queryParams: {
            docIdentifier: res.result.IdDetailsList[0].documentId//"doc_1667817154402_899ab89abb8"
          },
          state: { calledFor: dataTobeSent }
        });
        localStorage.setItem("vendorPagecalledFrom", dataTobeSent.calledFrom);
      }
      else {
        this.dataService.showInfo("No Document exist for selected ML ID.", "Info");
      }
    }, (err) => {
      console.log(err);
    })
  }
}
