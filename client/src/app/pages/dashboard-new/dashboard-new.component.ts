import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbCalendar, NgbDate, NgbDateStruct, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NgxSpinnerService } from 'ngx-spinner';
import { DashboardNewDisabledGraphsComponent } from 'src/app/components/dashboard-new-disabled-graphs/dashboard-new-disabled-graphs.component';
import { DashboardNewConfig } from 'src/app/config/dashboard-new-config';
import { AuthService } from 'src/app/services/auth.service';
import { ChartNewService } from 'src/app/services/chart-new.service';
import { DataService } from 'src/app/services/data.service';

@Component({
  selector: 'app-dashboard-new',
  templateUrl: './dashboard-new.component.html',
  styleUrls: ['./dashboard-new.component.scss']
})
export class DashboardNewComponent implements OnInit, OnDestroy, AfterViewInit {
  dashboardConfig = DashboardNewConfig;
  masterDataOfSelectPeriod = DashboardNewConfig.masterDataOfSelectedPeriods;

  defaultConfig = {
    selectedPeriodValue: this.masterDataOfSelectPeriod[1].value,
    selectedVendorValue: ""
  };

  allTabs: any[] = [
    { route: null, tab: "Extraction", active: true, enabled: false }
    // { route: null, tab: "Posting", active: false, enabled: false },
  ];

  docTypeSelect: any;
  selectedPeriodValue: any;
  totalRows = Math.ceil(8 / this.dashboardConfig.numberOfGrids)
  mappedDashboardCharts: any = [];

  summaryData: any = [];
  isGraphsFetched = false;

  selectedFilter: string = null;
  toggleCal: boolean = false;
  filterParams = [
    // { name: "Search", id: "search" },
    { name: "submitted date", id: "submittedOn" },
    // { name: "STP", id: "stp" },
    // { name: "ACE", id: "ace" },
  ];
  selectedFilterValue: any = null;
  filterValues = {
    invoiceDate: [],
    submittedOn: [],
    Search: [],
    stp: [
      { name: "Yes", vendorId: true },
      { name: "No", vendorId: false },
    ],
    ace: [
      { name: "Yes", vendorId: 'Yes' },
      { name: "No", vendorId: 'No' },
      { name: "Not Applicable", vendorId: 'Not_Applicable' }
    ]

  };
  rangetime
  fromDate: NgbDate;
  toDate: NgbDate;
  model2: NgbDateStruct;
  searchKey: string;
  isShown: boolean = false;
  dateTypes = ["range", "date"];
  selectedDateType: string;
  hoveredDate: NgbDate;
  selectedStartDate: any;
  selectedEndDate: any;
  maxDate: any;
  isDisabled;
  selectedFilters: any = {};
  currentFilter: any;
  toggleFilter: boolean = false;
  defaultTab = 'Extraction';
  selectedTab = 'Extraction';

  enabledSortedCharts: any = [];
  disabledSortedCharts: any = [];

  clearMainFiltersEmit: boolean = false;
  badgeHidden: boolean = true;
  badgeValue: number = 0;
  isConfigureMode: boolean;
  originalGraphConfigs;
  configure_btn_text = 'Configure';
  isConfigureActionCompleted: boolean = false;
  dashboardOptions: any;
  prevMonthValue = 0;

  constructor(private chartService: ChartNewService,
    private calendar: NgbCalendar,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private dataService: DataService,
    private authService: AuthService,
    private spinner: NgxSpinnerService,
    private modalService: NgbModal
  ) {
    //added on 05-04-2023
    const postingTabVisibility = this.authService.getUserSettings("POSTINGTABINDASHBOARD");
    if (postingTabVisibility == 1) {
      this.allTabs.push({ route: null, tab: "Posting", active: false, enabled: false });
    }
    this.prevMonthValue = this.authService.getUserSettings("DASHBOARD_CAL_PREV_MONTH_VALUE");

    this.initializeInnerRoute(); // KEEP this method here only in first line of constructor.
    this.setDefaultDates();
    this.setMaxDate();
    this.isDisabled = (date: NgbDate, current: { month: number }) => { date.after(calendar.getToday()) };

    //added on 19-04-2023 - dashboardOptions is used for to show/hide the Configure and OtherGraphs buttons
    this.dashboardOptions = this.authService.getUserSettings("DASHBOARD_OPTIONS");
    console.log(this.dashboardOptions);
  }

  ngOnInit() {
    this.fetchFiltersData();
    this.defaultRoute();
  }

  ngAfterViewInit() {
    //this.registerDragElement();
  }

  initializeInnerRoute() {
    this.activatedRoute.queryParams.subscribe((res) => {
      if (Object.keys(res) && Object.keys(res).length) {
        this.selectedTab = JSON.parse(JSON.stringify(res)).selectedTab
        const index = this.allTabs.findIndex(tab => (tab.tab == this.selectedTab))
        if (index >= 0) {
          this.highlightTab(index)
        }
      }
      else {
        this.switchTabs({ tab: 'Extraction' });
        this.highlightTab(0);
      }
    });
  }

  getChartConfigs() {

    let filter = this.getCurrentFilter();
    console.log("filter sent for dashboard:- ");
    console.log(filter);

    this.chartService.getChartConfigs(filter, this.selectedTab).subscribe((response) => {

      if (response && response.responseCode == 'OK' && response.result && response.result.summaryData && response.result.graphConfigs) {

        this.generateSummaryData(response.result.summaryData);
        this.originalGraphConfigs = JSON.parse(JSON.stringify(response.result.graphConfigs));

        this.enabledSortedCharts = [];
        this.enabledSortedCharts = this.getEnabledSortedCharts(response.result.graphConfigs)
        this.remapChartConfigData(this.enabledSortedCharts);

        this.disabledSortedCharts = [];
        this.disabledSortedCharts = this.getDisabledSortedCharts(response.result.graphConfigs);
      }
    }, (error) => {
      console.log("Error in getChartConfigs method");
      console.log(error);
    })
  }

  remapChartConfigData(enabledSortedCharts) {
    // console.log(this.dashboardConfig.dashboardCharts);
    this.mappedDashboardCharts = [];
    enabledSortedCharts.forEach(element => {
      if (element.colSpan == 1) {
        const index = this.mappedDashboardCharts.findIndex(subList => (subList.length < 2 && subList[0].colSpan == 1))
        if (index >= 0) {
          this.mappedDashboardCharts[index].push(element)
        } else {
          this.mappedDashboardCharts.push([element])
        }
      } else {
        this.mappedDashboardCharts.push([element])
      }
    });

    this.reSuffleMappedDashboardCharts(this.mappedDashboardCharts);

    console.log("Graphs List showing:- ");
    console.log(this.mappedDashboardCharts);
  }

  reSuffleMappedDashboardCharts(mappedCharts) {
    const index = mappedCharts.findIndex(subList => (subList.length < 2 && subList[0].colSpan == 1))
    if (index >= 0 && index != mappedCharts.length - 1) {
      const chartToBeSuffled = mappedCharts.splice(index, 1);
      if (chartToBeSuffled && chartToBeSuffled.length > 0)
        mappedCharts.push(chartToBeSuffled[0]);
    }
  }

  configureGraphs() {
    this.isConfigureMode = !this.isConfigureMode;
    this.configure_btn_text = this.isConfigureMode ? "Done" : "Configure";

    // call getChartConfigs on click of 'Done' button
    if (this.configure_btn_text == 'Configure' && this.isConfigureMode == false && this.isConfigureActionCompleted == true) {
      this.getChartConfigs();
      this.isConfigureActionCompleted = false;
    }
  }

  swapGraphs(graph1, graph2) {
    let changedGraphConfigs = JSON.parse(JSON.stringify(this.originalGraphConfigs));
  }

  handleChangeSpan(graph, calledFor) {
    console.log(graph, calledFor);
    let changedGraphConfigs = this.originalGraphConfigs;
    changedGraphConfigs.findIndex(data => {
      if (data.chartId === graph.chartId) {
        data.colSpan = (calledFor == 'Expand') ? 2 : 1;
      }
    })

    //call reConfigureGraphsLayout method
    this.reConfigureGraphsLayout(changedGraphConfigs);
  }

  disableGraph(graph) {
    let changedGraphConfigs = this.originalGraphConfigs;// JSON.parse(JSON.stringify(this.originalGraphConfigs));

    changedGraphConfigs.findIndex(data => {
      if (data.chartId === graph.chartId) {
        data.enabled = false;
        data.index = 999;
      }
    })

    //call reConfigureGraphsLayout method
    this.reConfigureGraphsLayout(changedGraphConfigs);
  }

  reConfigureGraphsLayout(changedGraphConfigs) {
    let enabledSortedGraphs = this.getEnabledSortedCharts(changedGraphConfigs);
    let disabledSortedCharts = this.getDisabledSortedCharts(changedGraphConfigs);

    //Call re-indexing algorirhm for enabled_graphs

    this.remapChartConfigData(enabledSortedGraphs);
    let reIndexedEnabledGraphs = this.reIndexingOfGraphs(this.mappedDashboardCharts);
    let reConfiguredGraphs = reIndexedEnabledGraphs.concat(disabledSortedCharts);

    let finalChartsData = this.filterOutFieldsToBeResetInChartsData(reConfiguredGraphs);
    console.log("Final Charts sent to Bulk Upload API:- ")
    console.log(finalChartsData);

    // call bulk update final_reconfigured_graph
    this.bulkUpdateGraphs(finalChartsData);
  }

  filterOutFieldsToBeResetInChartsData(chartsData) {
    let graphsList = [];
    if (chartsData && chartsData.length > 0) {
      chartsData.map((chart) => {
        graphsList.push({
          chartId: chart.chartId,
          index: chart.index,
          enabled: chart.enabled,
          colSpan: chart.colSpan
        })
      })
    }
    return graphsList;
  }

  reIndexingOfGraphs(mappedDashboardCharts) {
    let updatedMappedDashboardCharts = []
    let index = 0;
    mappedDashboardCharts.forEach(innerCharts => {
      for (let chartIndex = 0; chartIndex < innerCharts.length; chartIndex++) {
        index++
        innerCharts[chartIndex].index = index;
        updatedMappedDashboardCharts.push(innerCharts[chartIndex]);
      }
    });

    console.log(updatedMappedDashboardCharts);
    return updatedMappedDashboardCharts;
  }

  bulkUpdateGraphs(updatedMappedDashboardCharts) {
    this.chartService.bulkUpdateCharts(updatedMappedDashboardCharts).subscribe((response) => {
      console.log(response);
      this.isConfigureActionCompleted = true;
    }, (error) => {
      console.log("Error in getChartConfigs method");
      console.log(error);
    })
  }

  getEnabledSortedCharts(charts) {
    let enabledChart = charts.filter(chart => chart.enabled == true);
    enabledChart.sort((a, b) => a.index - b.index);
    return enabledChart;
  }

  getDisabledSortedCharts(charts) {
    let disabledChart = charts.filter(chart => chart.enabled == false);
    disabledChart.sort((a, b) => a.index - b.index);
    return disabledChart;
  }

  generateSummaryData(summary) {
    this.summaryData = []
    switch (this.selectedTab.toLowerCase()) {
      case "extraction":
        if (summary && 'extraction_forever_summary' in summary) {
          const { extraction_forever_summary, extraction_current_summary } = summary;

          for (let key in extraction_forever_summary) {
            this.summaryData.push({
              name: key,
              currentValue: extraction_current_summary[key].Value,
              foreverValue: extraction_forever_summary[key].Value,
              unit: extraction_forever_summary[key].Unit
            })
          }
        }
        break;

      case "posting":
        if (summary && 'posting_forever_summary' in summary) {
          const { posting_forever_summary, posting_current_summary } = summary;

          for (let key in posting_forever_summary) {
            this.summaryData.push({
              name: key,
              currentValue: posting_current_summary[key].Value,
              foreverValue: posting_forever_summary[key].Value,
              unit: posting_forever_summary[key].Unit
            })
          }
        }
        break;
      default:
        break;
    }
  }

  // enableGraph(currentChart) {
  //   this.mappedDashboardCharts.filter((chart) => {
  //     chart.map((innerChart) => {
  //       if (innerChart.chartId == currentChart.chartId) {
  //         innerChart.enabled = true;
  //       }
  //     })
  //   })
  // }

  //<------------------------TAB RELATED METHODS STARTS------------------------->

  highlightTab(ind) {
    for (let i = 0; i < this.allTabs.length; i++) {
      if (i == ind) {
        this.allTabs[i].active = true;
      } else {
        this.allTabs[i].active = false;
      }
    }
  }

  switchTabs(tab) {
    this.selectedTab = tab.tab;
    //this.clearFilter();

    //rest calender filters added on 27-03-2023
    this.model2 = null;
    this.rangetime = null;
    this.toggleCal = false;
    this.setCalenderDefaults();

    this.router.navigate(["dashboard"], { queryParams: { selectedTab: this.selectedTab } });
  }
  //<------------------------TAB RELATED METHODS ENDS------------------------->

  // <----------- ###### SPINNER related method Starts #####-------------->

  showSpinner() {
    this.spinner.show();
  }

  hideSpinner() {
    this.spinner.hide();
  }

  // <----------- ###### SPINNER related method Starts #####-------------->

  //<----------------------FILTER RELATED METHODS STARTS------------------------>

  clearFilters() {
    // this.selectedPeriodValue = this.masterDataOfSelectPeriod[0].value;
    // this.docTypeSelect = "";
  }

  //On click of Primary Filter Dropdown
  updatePrimaryFilter() {
    this.toggleCal = false
  }

  filterList(value?) {
    this.selectedFilters[this.selectedFilter] = this.selectedFilterValue;
    this.getChartConfigs();
    // this.router.navigate(["dashboard"], { queryParams: this.selectedFilters });
  }

  setMaxDate() {
    const todayDate = new Date();
    this.maxDate = {
      year: todayDate.getFullYear(),
      month: todayDate.getMonth() + 1,
      day: todayDate.getDate()
    };
  }

  setDefaultDates() {
    if (this.prevMonthValue == null || this.prevMonthValue == undefined) {
      this.prevMonthValue = 1;
    }
    console.log(`Setting calender to ${this.prevMonthValue} months back from current month..`);

    this.fromDate = this.calendar.getPrev(this.calendar.getToday(), 'm', this.prevMonthValue); //show documents of last 1 month
    this.toDate = this.calendar.getToday();

    if (this.fromDate) {
      this.selectedStartDate = new Date(this.fromDate.year, this.fromDate.month - 1, this.fromDate.day, 0, 0, 0, 0);
    }
    if (this.toDate) {
      this.selectedEndDate = new Date();
    }
    this.rangetime = this.selectedStartDate.toLocaleDateString('en-UK') + " to " + this.selectedEndDate.toLocaleDateString('en-UK');
    this.selectedFilterValue = this.rangetime;
  }

  onDateSelection(date: NgbDate) {
    if (!this.fromDate && !this.toDate) {
      this.fromDate = date;
    }
    else if (this.fromDate && !this.toDate && date.after(this.fromDate)) {
      this.toDate = date;
    }
    else {
      this.toDate = null;
      this.fromDate = date;
    }
    // let startDate = this.fromDate.year + "-" + this.fromDate.month + "-" + this.fromDate.day;
    // let endDate = this.toDate.year + "-" + this.toDate.month + "-" + this.toDate.day;
    if (this.fromDate) {
      this.selectedStartDate = new Date(this.fromDate.year, this.fromDate.month - 1, this.fromDate.day, 0, 0, 0, 0);
    }
    if (this.toDate) {
      this.selectedEndDate = new Date(this.toDate.year, this.toDate.month - 1, this.toDate.day, 23, 59, 59, 59);
    }
    if (this.selectedStartDate && this.selectedEndDate && this.fromDate && this.toDate) {
      this.toggleDp();
      // this.rangetime = startDate + " to " + endDate; //pick startDate & endDate to form object for filter
      this.rangetime = this.selectedStartDate.toLocaleDateString('en-UK') + " to " + this.selectedEndDate.toLocaleDateString('en-UK');
      this.selectedFilterValue = this.rangetime//startDate + "_" + endDate;

      // this.selectedFilterValue = startDate + "_" + endDate;
      this.filterList();
    }
  }

  toggleDp() {
    this.toggleCal = !this.toggleCal;
  }

  onDateSelectionSingle(date: NgbDate) {
    this.model2 = date;
    this.selectedStartDate = (new Date(date.year, date.month - 1, date.day, 0, 0, 0, 0));
    this.selectedEndDate = (new Date(date.year, date.month - 1, date.day, 23, 59, 59, 59));
    this.selectedFilterValue = this.selectedStartDate.toLocaleDateString('en-UK');
    // this.selectedFilterValue = this.model2.year + "-" + this.model2.month + "-" + this.model2.day;
    this.filterList();
    this.toggleDp();
  }

  getCurrentFilter() {
    let data = [];

    if (this.selectedFilters) {
      const { submittedOn, stp, ace, sla_flag, doc_type, vendor_name, billing_state, posting_status } = this.selectedFilters;

      // stp check
      if (stp) {
        if (stp == "true") {
          data.push({
            "col_name": "stp",
            "operator": "in",
            "value": true
          })
        } else if (stp == "false") {
          data.push({
            "col_name": "stp",
            "operator": "in",
            "value": false
          })
        }
      }

      // ace check
      if (ace) {
        if (ace == "No") {
          data.push({
            "col_name": "ace",
            "operator": "in",
            "value": 0
          })
        } else if (ace == "Yes") {
          data.push({
            "col_name": "ace",
            "operator": "in",
            "value": 1
          })
        }
        else if (ace == "Not_Applicable") {
          data.push({
            "col_name": "ace",
            "operator": "in",
            "value": 2
          })
        }
      }

      // submittedOn check
      if (submittedOn && this.selectedTab) {
        data.push({
          "col_name": this.selectedTab.toLowerCase() == 'posting' ? "rpa_receive_time" : "submitted_on",
          "operator": "<=",
          "value": '' + this.selectedEndDate.getTime()
        },
          {
            "col_name": this.selectedTab.toLowerCase() == 'posting' ? "rpa_receive_time" : "submitted_on",
            "operator": ">=",
            "value": '' + this.selectedStartDate.getTime()
          })
      }

      // sla_flag check
      if (sla_flag) {
        if (sla_flag == "True") {
          data.push({
            "col_name": "sla_flag",
            "operator": "=",
            "value": "1"
          })
        } else if (sla_flag == "False") {
          data.push({
            "col_name": "sla_flag",
            "operator": "=",
            "value": "0"
          })
        } else if (sla_flag == "Not Applicable") {
          data.push({
            "col_name": "sla_flag",
            "operator": "=",
            "value": "2"
          })
        }
      }

      // vendor_name check
      if (vendor_name) {
        let val = this.convertArrayToString(this.selectedFilters.vendor_name);

        data.push({
          "col_name": "vendor_name",
          "operator": "IN",
          "value": val
        });
      }

      // billing_state check
      if (billing_state) {
        let val = this.convertArrayToString(this.selectedFilters.billing_state);

        data.push({
          "col_name": "billing_state",
          "operator": "IN",
          "value": val
        });
      }

      // posting_status check
      if (posting_status) {
        data.push({
          "col_name": "rpa_posting_status",
          "operator": "=",
          "value": posting_status
        })
      }

      // doc_type check
      if (doc_type) {
        let val = this.convertArrayToString(this.selectedFilters.doc_type);

        data.push({
          "col_name": "doc_type",
          "operator": "IN",
          "value": val
        });
      }
    }

    return data;
  }

  convertArrayToString(list) {
    let str = ""
    list.forEach((element, index) => {
      str = (index == 0 && !str) ? "'" + element + "'" : str + ",'" + element + "'"
    })
    str = '(' + str + ')'
    return str
  }

  isRange(date: NgbDate) {
    return (
      date.equals(this.fromDate) ||
      date.equals(this.toDate) ||
      this.isInside(date) ||
      this.isHovered(date)
    );
  }

  isHovered(date: NgbDate) {
    return (
      this.fromDate &&
      !this.toDate &&
      this.hoveredDate &&
      date.after(this.fromDate) &&
      date.before(this.hoveredDate)
    );
  }

  isInside(date: NgbDate) {
    return date.after(this.fromDate) && date.before(this.toDate);
  }

  get selectedFiltersList() {
    let filters = [];
    if (this.selectedFilters) {
      for (let key in this.selectedFilters) {
        if (key == "invoiceDate") {
          filters.push({
            key: "invoice date",
            value: this.selectedFilters[key].replace("_", " to "),
            id: key,
          });
        } else {
          if (key !== 'status') {
            filters.push({ key: key, value: this.selectedFilters[key], id: key });
          }
        }
      }
    }
    return filters;
  }

  deleteFilter(filter) {
    if (Object.keys(this.selectedFilters) &&
      (Object.keys(this.selectedFilters).length == 1 &&
        Object.keys(this.selectedFilters)[0] == "submittedOn")) {
      this.clearFilter();
    } else {
      delete this.selectedFilters[filter.id];
      this.getChartConfigs();
      // this.router.navigate(["dashboard"], { queryParams: this.selectedFilters });
    }
  }

  setCalenderDefaults() {
    this.fromDate = null; //this.calendar.getToday();
    this.toDate = null; //this.calendar.getNext(this.calendar.getToday(), "d", 10);
    //this.defaultRoute()
    this.setDefaultFilter();
  }

  setDefaultFilter() {
    this.selectedFilter = "submittedOn"
    this.selectedDateType = this.dateTypes[0];
    this.setDefaultDates();
    this.selectedFilters[this.selectedFilter] = this.selectedFilterValue;
  }

  defaultRoute() {
    this.setDefaultFilter()
    this.getChartConfigs();
  }

  clearFilter() {
    this.selectedFilter = null;
    this.selectedFilterValue = null;
    this.selectedFilters = {};

    // setting clearMainFiltersEmit in timeout func so that  
    // changes could be detect in dashboard-new-filters component added on 27-03-2023
    this.clearMainFiltersEmit = false;
    setTimeout(() => {
      this.clearMainFiltersEmit = true;
    }, 100)

    // for submitted date
    this.model2 = null
    this.rangetime = null
    this.toggleCal = false
    this.setCalenderDefaults()
    this.searchKey = null;
  }

  moreFilters() {
    this.dataService.setSelectedFilter('filters');
  }

  setEmittedFilters(event) {

    if (Object.keys(event).length === 0) {
      this.badgeHidden = true
      for (let filterKey in this.selectedFilters) {
        if (filterKey != 'submittedOn') {
          delete this.selectedFilters[filterKey]
        }
      }
    }
    else {
      this.badgeHidden = false
      for (let key in event) {
        this.selectedFilters[key] = event[key];
      }
    }
    this.badgeValue = Object.keys(event).length;
    this.getChartConfigs();
    // this.router.navigate(["dashboard"], { queryParams: this.selectedFilters });
  }

  toggleBadgeVisibility() {
    this.badgeHidden = !this.badgeHidden;
  }

  ngOnDestroy(): void {
    this.dataService.setSelectedFilter(null);
  }

  //<----------------------FILTER RELATED METHODS ENDS------------------------>

  //<---------------------- RIGHT SIDE PANEL RELATED METHODS STARTS ------------>

  fetchFiltersData() {
    this.dataService.filterObserver.subscribe((res) => {
      if (res) {
        this.toggleFilter = true;
      }
    });
  }

  closeSidePanel(event?) {
    if (event && event.save) { }
    this.toggleFilter = !this.toggleFilter;
    if (event && event.CloseVendorOnCancel) {
      this.toggleFilter = false;
    }
    if (event && event.CloseVendorOnCancelAsReviewDone) {

      this.toggleFilter = false;
    }
  }

  //<---------------------- RIGHT SIDE PANEL RELATED METHODS ENDS ------------>

  //<---------------------Other Graphs Related methods starts------------------->

  showDisabledGraphs() {
    if (this.disabledSortedCharts && this.disabledSortedCharts.length > 0) {
      const modalRef = this.modalService.open(DashboardNewDisabledGraphsComponent, {
        windowClass: "dashboard-model",
        // size: <any>"xl",
        size: 'lg',
        centered: true,
      });

      modalRef.componentInstance.modalData.Graphs = this.disabledSortedCharts;
      modalRef.componentInstance.closeModal.subscribe((res) => {
        if (res && res.modalClose) {
          console.log(res);
          this.defaultRoute();
        }
      });
    }
    else {
      this.dataService.showInfo("No Other Graphs", "");
    }
  }

  //<---------------------Other Graphs Related methods ends------------------->

  //<---------------------DRAG N DROP FUNCTIONS-------------------------------->
  drop(event: CdkDragDrop<string[]>) {
    //moveItemInArray(this.mappedDashboardCharts, event.previousIndex, event.currentIndex);
  }

  drop2(event: CdkDragDrop<string[]>) {
    // for (let i = 0; i < this.mappedDashboardCharts.length; i++) {
    //   moveItemInArray(this.mappedDashboardCharts[i], event.previousIndex, event.currentIndex);
    // }
    // if (event.previousContainer === event.container) {
    //   moveItemInArray(event.container.data,
    //     event.previousIndex, event.currentIndex);
    // } else {
    //   transferArrayItem(event.previousContainer.data,
    //     event.container.data,
    //     event.previousIndex,
    //     event.currentIndex);
    // }
  }
}
