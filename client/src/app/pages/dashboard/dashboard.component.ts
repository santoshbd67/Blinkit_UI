import { Component, OnInit, ViewEncapsulation } from "@angular/core";
import { DataService } from "src/app/services/data.service";
import { AppConfig } from "src/app/config/app-config";
import { DashboardConfig } from "src/app/config/dashboard-config";
import { type } from "os";
import { AuthService } from "src/app/services/auth.service";
import { log } from "util";
import { APIConfig } from 'src/app/config/api-config';

@Component({
  selector: "app-dashboard",
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.scss"],
  encapsulation: ViewEncapsulation.None
})
export class DashboardComponent implements OnInit {
  appConfig = AppConfig;
  apiConfig: any = APIConfig;
  selectPeriod: any;
  dashboardStats: any;
  selectedPeriodValue: any;
  selectedVendorValue: any;
  masterDataOfSelectPeriod = DashboardConfig.masterDataOfSelectedPeriods;
  documentStats: any;
  dashboardNew = true;
  vendorList: any[] = [];
  defaultConfig = {
    // default config for the chart and summaries
    selectedPeriodValue: this.masterDataOfSelectPeriod[1].value,
    selectedVendorValue: ""
  };
  NO_OF_ALLOWED_PAGES: number;
  dashboardConfig = DashboardConfig;
  accuracyVrsInvoicesData: any;
  errorCountVrsInvoicesData: any;
  vendorVrsAccuracy: any;
  vendorVrsTotalDocumentsAutoProcessed: any;
  vendorVrstotalDocumentsManuallyProcessed: any;
  averageConfidenceAndSTP: { data1: any; data2: any };
  vendorVrManualTimeSpent: any;
  vendorVsFieldsManuallyCorrected: { count: number; range: string }[];
  vendorVrsTotalDocumentsProcessed: any;
  threeBarGraphData: { data1: any; data2: any; data3: any };
  noOfDocsVsDays: any;

  invoicesProcessing: any[];
  invoicesProcessingFailed: any[];
  dashboardStatsHistory: any;
  filterVendorData: any[] = [];
  // topVendorsCount: number = 10;
  totalVendorCount: number = 0;
  orgTypeOptions: any;
  docTypeOptions: any;
  orgTypeSelect: any;
  docTypeSelect: any;

  organizationConfiguration: any;
  consumedPages: string;
  consumtionMessageVisibility = 0;

  constructor(private dataService: DataService, private auth: AuthService) {
    this.selectedPeriodValue = this.defaultConfig.selectedPeriodValue;
    this.selectedVendorValue = this.defaultConfig.selectedVendorValue;
    this.consumtionMessageVisibility = this.auth.getConsumptionVisibility();
  }

  ngOnInit() {
    this.clickOnRefresh();
    this.fetchOrgAndDocType();
    this.fetchOrganizationConfiguration();
    this.getDashboardStats();
    this.NO_OF_ALLOWED_PAGES = this.auth.getMaximumAllowedPages();
  }

  fetchOrgAndDocType() {
    let orgAndDocType = this.dataService.getOrgAndDocType();
    this.orgTypeOptions = JSON.parse(orgAndDocType.ORGTYPE_OPTIONS);
    this.docTypeOptions = JSON.parse(orgAndDocType.DOCTYPE_OPTIONS);
    //Set the first to default always
    this.orgTypeSelect = "";
    this.docTypeSelect = "";
  }

  fetchOrganizationConfiguration() {
    this.dataService.getOrganizationConfiguration().subscribe(res => {
      if (res && res.result && res.result.organizationConfig) {
        this.organizationConfiguration = JSON.parse(res.result.organizationConfig);
      }
    })
    this.dataService.consumedPagesObservable.subscribe((consumedData) => {
      this.consumedPages = consumedData;
    })
  }


  /* call on refresh  */
  clickOnRefresh() {
    this.getDocumentStats();
    // this.getVendorList();
    this.getHistory();
  }

  /* Get Document Stats */
  getDocumentStats() {
    this.dataService.getDocumentStats().subscribe(
      res => {
        if (res && res.result) {
          this.documentStats = res.result[0];
        }
      },
      err => {
        this.dataService.showError("No Data found", "Error!");
      }
    );
  }

  get FAILED_SUM() {
    if (this.documentStats)
      return (
        this.handleNumberUndefined(this.documentStats.EXTRACTION_FAILED) +
        this.handleNumberUndefined(this.documentStats.EXTRACTION_DONE)
      );
    else return 0;
  }

  handleNumberUndefined(value) {
    if (typeof value !== "number" || !value) return 0;
    else return value;
  }
  // get a year dashboard summaries
  getHistory() {
    const payload = {
      filter: {
        period: this.selectedPeriodValue,
        vendorId: "",
        orgTypeId: this.orgTypeSelect || "",
        docTypeId: this.docTypeSelect || "",
        role: localStorage.getItem('role')
      },
      summaries: true,
      ranges: false,
      vendorMetrics: false,
      emailId: localStorage.getItem('emailId')
    };

    this.dataService.getDashboardStats(payload).subscribe(
      res => {
        if (res && res.result && res.result.summaries) {
          this.dashboardStatsHistory = res.result.summaries;
          if (!this.dashboardStatsHistory.totalProcessingTime) {
            this.dashboardStatsHistory.totalProcessingTime = this.getProcessingTime(
              this.dashboardStatsHistory
            );
          }
        }
      },
      err => {
        this.dataService.showInfo("No data found", "Info");
      }
    );
  }
  // get processing time  if processing time is null add all the time to processing time
  getProcessingTime(dashboardStatsHistory) {
    return (
      this.handleNumberUndefined(dashboardStatsHistory.totalPreProcessingTime) +
      this.handleNumberUndefined(dashboardStatsHistory.totalExtractionTime) +
      this.handleNumberUndefined(dashboardStatsHistory.totalRPAProcessingTime)
    );
  }

  // get Default values for chart payload`
  getDefaultValues() {
    const payload = {
      filter: {
        period: this.selectedPeriodValue,
        vendorId: this.selectedVendorValue,
        orgTypeId: this.orgTypeSelect || "",
        docTypeId: this.docTypeSelect || "",
        role: localStorage.getItem('role') // added by gaurav
      },
      summaries: this.dashboardConfig.summaries,
      ranges: this.dashboardConfig.ranges,
      vendorMetrics: this.dashboardConfig.vendorMetrics,
      timeLineData: this.dashboardConfig.timeLineData,
      timeLineOverallScoreConfidence: this.dashboardConfig.timeLineOverallScoreConfidence,
      emailId: localStorage.getItem('emailId')
    };
    return payload;
  }

  // get vendor list
  getVendorList() {
    let filter = {};
    let page = 0;
    let perItem = 0;
    let vendorObj = {
      filter: filter,
      page: page,
      offset: 0,
      limit: perItem
    };

    this.dataService.getVendorList(vendorObj).subscribe(
      res => {
        if (res && res.result && res.result.documents) {
          this.vendorList = res.result.documents;
          this.totalVendorCount = res.result.count;
          // if (res.result.documents.length > this.topVendorsCount) {
          //   this.vendorList = this.vendorList.slice(0, this.topVendorsCount);
          // }

        } else {
          this.vendorList = [];
        }
      },
      err => {
        this.dataService.showInfo("No vendor found", "Info");
      }
    );
  }
  getVendorName(vendorId) {
    if (vendorId) {
      let filteredValues = this.vendorList.filter(each => {
        if (each.vendorId == vendorId) {
          return each.name;
        }
      });
      if (filteredValues && filteredValues.length) {
        return filteredValues[0];
      }
    }
  }

  // get Dashboard Stats
  getDashboardStats() {
    const payload = this.getDefaultValues();
    this.dataService.getDashboardStats(payload).subscribe(
      res => {
        if (res && res.result) {
          this.dashboardStats = res.result;
          if (
            this.dashboardStats.ranges &&
            this.dashboardStats.ranges.accuracy &&
            this.dashboardStats.ranges.accuracy.length > 0
          ) {
            this.accuracyVrsInvoicesData = this.dashboardStats.ranges.accuracy;
          }
          if (
            this.dashboardStats.ranges &&
            this.dashboardStats.ranges.errorCount &&
            this.dashboardStats.ranges.errorCount.length > 0
          ) {
            this.errorCountVrsInvoicesData = this.dashboardStats.ranges.errorCount;
          }

          if (this.selectedVendorValue) {
            const selectVendorData = this.dashboardStats.vendorStats.filter(
              vendor => {
                return vendor.vendorId === this.selectedVendorValue;
              }
            );
            this.filterVendorData = selectVendorData;
          } else {
            this.filterVendorData = this.dashboardStats.vendorStats;
          }
          // the chart component requires range and count arrays.
          // MAP VENDOR STATS for charting

          //common vendor list
          this.vendorList.push({ vendorId: "dummyvendor001", name: "" });

          if (this.dashboardStats && this.dashboardStats.timeLineData) {

            //Using a dummy vendor to manage the chart needs for the mapvendordata function.

            let noofDocsData = this.dashboardStats.timeLineData.map(item => {
              item.vendorId = "dummyvendor001";
              let theDate = item._id.toString().replace(/(\d{4})(\d{2})(\d{2})/g, '$1-$2-$3');
              item.labelData = new Date(theDate).toLocaleDateString('en-US', {
                day: 'numeric', month: 'short', year: 'numeric'
              });

              return item;
            })
            // this.vendorList.push({vendorId:"dummyvendor001", name:""});
            this.noOfDocsVsDays = this.mapVendorData(noofDocsData, ["count", "labelData"], "noOfDocsVsDays");
          }

          if (this.dashboardStats && this.dashboardStats.timeLineOverallScoreConfidence) {
            //use a dummy vendor 
            let noOfDocsData = this.dashboardStats.timeLineOverallScoreConfidence.map(item => {
              item.vendorId = "dummyvendor001";
              item.labelData = new Date(item._id).toLocaleDateString('en-US', {
                day: 'numeric', month: 'short', year: 'numeric'
              });
              return item;
            })
            let data1 = this.mapVendorData(noOfDocsData, ["count", "labelData"])
            let data2 = this.mapVendorData(noOfDocsData, ["count_stp", "labelData"])
            this.averageConfidenceAndSTP = {
              data1: data1,
              data2: data2
            }
          }

          // this.threeBarGraphData = {
          //   data1: this.vendorVrsTotalDocumentsProcessed,
          //   data2: this.invoicesProcessing,
          //   data3: this.invoicesProcessingFailed
          // };

          if (
            this.dashboardStats.summaries &&
            !this.dashboardStats.summaries.totalProcessingTime
          ) {
            this.dashboardStats.summaries.totalProcessingTime = this.getProcessingTime(
              this.dashboardStats.summaries
            );
          }
        }
      },
      err => {
        this.dataService.showInfo("No Data found", "Info");
      }
    );
  }

  mapVendorData(data, key, whatId?) {
    const vendorStatsMap = data.map(item => {
      return {
        range: item.vendorId,
        count: item[key[0]],
        labelData: item[key[1]]
      };
    });
    // vendorStatsMap to Vendor List to get vendor name - make sure that if vendor id less than 1 - then show Unknown.

    vendorStatsMap.forEach(item => {
      const findVendor = this.vendorList.filter(vendor => {
        let vendorId = vendor.vendorId;
        return vendorId.toString() === item.range;
      });

      if (findVendor && findVendor.length) {
        item.range =
          findVendor[0].name +
          (item.labelData ? " " + item.labelData + " " : "");
      } else {
        delete item.range;
      }
    });
    const finalVendorStatsMap = vendorStatsMap.filter(each => {
      return each.range ? true : false;
    });
    return finalVendorStatsMap;
  }

  // filter Dashboard stats with vendor id and period
  filterDashBoardStats() {
    this.getDashboardStats();
  }
  // clear filter
  clearFilters() {
    this.selectedPeriodValue = this.masterDataOfSelectPeriod[0].value;
    this.selectedVendorValue = "";
    this.orgTypeSelect = "";
    this.docTypeSelect = "";
    this.getDashboardStats();
  }

  addFour(item1, item2, item3?, item4?) {
    return (
      (item1 && typeof item1 == "number" ? item1 : 0) +
      (item2 && typeof item2 == "number" ? item2 : 0) +
      (item3 && typeof item3 == "number" ? item3 : 0) +
      (item3 && typeof item4 == "number" ? item4 : 0)
    );
  }

  addThree(item1, item2, item3?) {
    return (
      (item1 && typeof item1 == "number" ? item1 : 0) +
      (item2 && typeof item2 == "number" ? item2 : 0) +
      (item3 && typeof item3 == "number" ? item3 : 0)
    );
  }

  addTwo(item1, item2) {
    return (
      (item1 && typeof item1 == "number" ? item1 : 0) +
      (item2 && typeof item2 == "number" ? item2 : 0)
    );
  }
}
