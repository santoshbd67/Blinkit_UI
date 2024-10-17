import { ChangeDetectorRef, Component, OnInit, ViewChild } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { NgbCalendar, NgbDate, NgbDateStruct, NgbModal } from "@ng-bootstrap/ng-bootstrap";
import * as moment from "moment";
import { IDropdownSettings } from 'ng-multiselect-dropdown';
import { BehaviorSubject } from 'rxjs';
import { APIConfig } from 'src/app/config/api-config';
import { AppConfig } from "src/app/config/app-config";
import { AuthService } from "src/app/services/auth.service";
import { DataService } from "src/app/services/data.service";
import { UploadFileComponent } from "../../components/upload-file/upload-file.component";
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: "app-uploads",
  templateUrl: "./uploads.component.html",
  styleUrls: ["./uploads.component.scss"],
})
export class UploadsComponent implements OnInit {
  togglevendor: boolean = false;
  selectedItem: any;
  appConfig: any;
  day: any;
  model: NgbDateStruct;
  placement = "bottom";
  fromDate: NgbDate;
  toDate: NgbDate;
  hoveredDate: NgbDate;
  rangetime;
  month: string;
  startDate: any;
  endDate: any;
  toggleCal: boolean = false;
  closeResult: string;
  model2: NgbDateStruct;
  searchKey: string;

  filterParams = [
    { name: "Document", id: "search" },
    { name: "submitted date", id: "submittedOn" },
    { name: "STP", id: "stp" },
    { name: "ACE", id: "ace" },
    { name: "document Type", id: "documentType" },
    { name: "vendor Name", id: "vendorNameSearch" }
    // { name: "Doc Type", id: "docType" },
    // { name: "Org Type", id: "orgType" },
    // { name: "Vendor Id", id: "vendorId" },
    // { name: "status", id: "status" },
    // { name: "invoice date", id: "invoiceDate" },
    // { name: "extraction confidence", id: "overall_score" },
  ];

  vendorList: any;
  orgTypeList: any;
  docTypeList: any;

  filterValues = {
    status: [],
    docType: [],
    orgType: [],
    vendorId: [],
    invoiceDate: [],
    submittedOn: [],
    selectDay: [],
    Search: [],
    stp: [
      { name: "Yes", vendorId: true },
      { name: "No", vendorId: false },
    ],
    ace: [
      { name: "Yes", vendorId: 'Yes' },
      { name: "No", vendorId: 'No' },
      { name: "Not Applicable", vendorId: 'Not_Applicable' }
    ],
    extractionConfidence: [],
    approvalStatus: [
      { name: "Open", vendorId: 'Open' },
      { name: "Pending", vendorId: 'Pending' },
      { name: "Hold", vendorId: 'Hold' },
      { name: "Approved", vendorId: 'Approved' },
      // { name: "Rejected", vendorId: 'Rejected' }
    ],
    reassignReason: []
  };

  dateSelected: any;
  selectedFilter: string = null;
  selectedFilterValue: any = null;
  selectedFilters: any = {};
  currentViewType: string = "list";
  isShown: boolean = false;
  isUploadDisabled = 0;
  UI_VIEW = 0;

  documents: any[];
  isDocsFetched = false;
  totalItems: number = 0;
  currentFilter: any;
  pageNumber: number = 1;
  RPA_STATUS_LIST = ["RPA_PROCESSED", "RPA_PROCESSING", "RPA_FAILED", "RPA_PENDING_APPROVAL"];
  apiConfig: any = APIConfig

  allTabs: any[] = [
    { route: null, tab: "Submissions", active: true, enabled: false },
    { route: "FAILED", tab: "Failed", active: false, enabled: false },
    { route: "REVIEW", tab: "Verification", active: false, enabled: false },
    { route: "REVIEW_COMPLETED", tab: "Reviewed", active: false, enabled: false },
    { route: "DELETED", tab: "Rejected", active: false, enabled: false },
    { route: "OTHERS", tab: "Others", active: false, enabled: false }
  ];

  RPATabs: any[] = [
    { route: { status: "RPA_PROCESSED" }, tab: "COMPLETED", active: true },
    { route: { status: "RPA_PROCESSING" }, tab: "PROCESSING", active: false },
    { route: { status: "RPA_FAILED" }, tab: "FAILED", active: false },
    { route: { status: "RPA_PENDING_APPROVAL" }, tab: "APPROVAL", active: false },
  ];

  dropdownSettings_DocumentType: IDropdownSettings = {
    singleSelection: false,
    idField: 'item_id',
    textField: 'item_text',
    selectAllText: 'Select All',
    unSelectAllText: 'UnSelect All',
    itemsShowLimit: 1,
    allowSearchFilter: false
  };
  dropdownListOfDocumentType = [];
  selectedItemsInDocumentType = [];
  dropdownSettings_PriorityRanking: IDropdownSettings = {
    singleSelection: false,
    idField: 'item_id',
    textField: 'item_text',
    selectAllText: 'Select All',
    unSelectAllText: 'UnSelect All',
    itemsShowLimit: 1,
    allowSearchFilter: false
  };
  dropdownListOfPriorityRanking = [];
  selectedItemsInPriorityRanking = [];
  all = { active: false };

  consumedPages: any = localStorage.getItem('consumedPages') || 0;
  consumedPagesObsevable: BehaviorSubject<string> = new BehaviorSubject<string>(this.consumedPages);

  showRPAChildrenRoute: boolean = false;
  dateTypes = ["range", "date"];
  selectedDateType: string;
  selectedAccuracyType: string = 'value';
  accuracyFrom: number = 0;
  accuracyTo: number = 100;
  accuracySingle: number;
  intervalID: any;
  totalPages: number;
  userRole: string;
  consumtionMessageVisibility = 0;
  UPLOAD_BUTTON_VISIBILITY = 2;
  REASSIGN_BUTTON_VISIBILITY = 0;

  //isOnInitCalled = false;
  docTypeVisibility: number = 0;
  @ViewChild('multiSelect') multiSelect;
  tappChangesVisibility: any;

  defaultPageNumber = 1; // ToDO declared to fix the pageNumber issue by Gaurev 05-12-2022
  vendorNameSearchKey: string;

  CONSUMPTION_DATA: string;
  CONSUMPTION_UNIT: string;
  STP_AND_ACE_VISIBILITY = 1;
  PRIORITY_RANK_FILTER_VISIBILITY = 0;

  constructor(
    private router: Router,
    private dataService: DataService,
    private auth: AuthService,
    private calendar: NgbCalendar,
    private activatedRoute: ActivatedRoute,
    private modalService: NgbModal,
    private changeDetectorRef: ChangeDetectorRef,
    private spinner: NgxSpinnerService
  ) {
    this.userRole = localStorage.getItem("role");

    this.consumtionMessageVisibility = this.auth.getConsumptionVisibility();
    if (this.consumtionMessageVisibility == 1) {
      this.totalPages = this.auth.getMaximumAllowedPages();
    }

    if (this.consumtionMessageVisibility == 0 && (this.userRole == 'admin' || this.userRole == 'viewer')) {
      this.totalPages = this.auth.getMaximumAllowedPages();
    }

    this.docTypeVisibility = this.auth.getUserSettings('DOCTYPES_VISIBILITY');
    this.tappChangesVisibility = this.auth.getUserSettings('TAPP_CHANGES_VISIBILITY');
    this.UPLOAD_BUTTON_VISIBILITY = this.auth.getUserSettings('UPLOAD_BUTTON_VISIBILITY');
    this.REASSIGN_BUTTON_VISIBILITY = this.auth.getUserSettings('REASSIGN_BUTTON_VISIBILITY');
    this.UI_VIEW = this.auth.getUserSettings('UI_VIEW');

    this.getConsumptionData();

    if (this.tappChangesVisibility == '1') {
      this.allTabs = [
        { route: null, tab: "Submissions", active: true, enabled: false },
        { route: "FAILED", tab: "Failed", active: false, enabled: false },
        { route: "REVIEW", tab: "Verification", active: false, enabled: false },
        { route: "REVIEW_COMPLETED", tab: "Reviewed", active: false, enabled: false },
        { route: "DELETED", tab: "Rejected", active: false, enabled: false },
        { route: this.RPA_STATUS_LIST[0], tab: "POSTING", active: false, RPA: true, enabled: true },
        { route: "OTHERS", tab: "Others", active: false, enabled: false }
      ];
    }

    if(this.REASSIGN_BUTTON_VISIBILITY == 1){
      this.allTabs.splice(3,0,{ route: "REASSIGN", tab: "Reassigned", active: false, enabled: false })
    }

    this.STP_AND_ACE_VISIBILITY = this.auth.getUserSettings('STP_AND_ACE_VISIBILITY');
    if (this.STP_AND_ACE_VISIBILITY == 0) {
      this.filterParams = [
        { name: "Document", id: "search" },
        { name: "submitted date", id: "submittedOn" },
        { name: "document Type", id: "documentType" },
        { name: "vendor Name", id: "vendorNameSearch" }
      ];
    }

    this.PRIORITY_RANK_FILTER_VISIBILITY = this.auth.getUserSettings('PRIORITY_RANK_FILTER_VISIBILITY')
    if(this.PRIORITY_RANK_FILTER_VISIBILITY == 1){
      this.filterParams.push({ name: "Priority ranking", id: "priorityRanking" })
    }
  }

  getConsumptionData() {
    // let ACTUAL_CONSUMPTION = 0;
    // const CONSUMPTION_LIMIT = this.auth.getUserSettings('CONSUMPTION_LIMIT');
    // let initialDocsExtracted = this.auth.getUserSettings("INITIAL_DOCS_EXTRACTED");

    // if (!initialDocsExtracted) {
    //   initialDocsExtracted = 0;
    // }
    // this.dataService.getActualConsumptionData().subscribe((response) => {

    //   if (response && response.responseCode == 'OK' && response.result) {
    //     this.CONSUMPTION_DATA = initialDocsExtracted + response.result.ACTUAL_DATA + '/' + CONSUMPTION_LIMIT;
    //     this.CONSUMPTION_UNIT = response.result.CONSUMPTION_UNIT;
    //   }
    //   else {
    //     this.CONSUMPTION_DATA = initialDocsExtracted + ACTUAL_CONSUMPTION + '/' + CONSUMPTION_LIMIT;
    //     this.CONSUMPTION_UNIT = 'documents';
    //   }
    // },
    //   (err) => {
    //     console.log("Error in getConsumptionData method");
    //     console.log(err);
    //   })

    //added new way on 15-03-2023
    this.dataService.getActualConsumptionData().subscribe((response) => {
      if (response && response.responseCode == 'OK' && response.result && response.result.ACTUAL_DATA) {
        this.CONSUMPTION_DATA = response.result.ACTUAL_DATA;
        this.CONSUMPTION_UNIT = response.result.CONSUMPTION_UNIT;
      }
    },
      (err) => {
        console.log("Error in getConsumptionData method");
        console.log(err);
        this.CONSUMPTION_DATA = '-/-';
        this.CONSUMPTION_UNIT = 'documents';
      })
  }

  //<---------------------Lifecycle Method Starts ---------------------->

  ngOnInit() {

    this.selectedDateType = this.dateTypes[0];
    this.appConfig = AppConfig;
    this.fetchVendorData();

    //this.removeOrgType(); //To be Deleted
    //this.setStatusFilterValues(); //To be Deleted
    //this.getVendorList(); //To be Deleted
    //this.getOrgAndDocList();  //To be Deleted
    //this.setViewType();    //To be Deleted

    // on tab switched or router changes
    this.activatedRoute.queryParams.subscribe((res) => {

      this.selectedFilters = JSON.parse(JSON.stringify(res));

      this.setDocumentTypeDropdown();
      this.setSelectedItemsInDocumentType();
      this.setPriorityRankingDropdown();
      this.setSelectedItemsInPriorityRanking();

      this.toggleApprovalStatusFilter();
      this.setShowRPAStageFlag();

      this.showAssignedTab();
      this.showRejectedTab();

      this.switchTabs();

      if (Object.keys(res) && Object.keys(res).length) {
        if (this.selectedFilters.invoiceNumber || this.selectedFilters.documentId) {
          this.searchKey = this.selectedFilters.invoiceNumber || this.selectedFilters.documentId;
          //commented on 20-07-2022 bacause now we have implemented search inside find API
          //this.searchDocument(); 
        }
        if (this.selectedFilters.vendorName) {
          this.vendorNameSearchKey = this.selectedFilters.vendorName;
        }
        this.setDefaultActiveTab(res);
        this.getDocument();
      } else {
        this.currentFilter = {};
        this.clearFilters();
        this.getDocument(this.pageNumber);
        this.parentClicked(0);
      }
      this.selectDefaultRPAStageOnReload(); // Keep call this method here only
      const REASSIGN_REASON_FILTER = this.auth.getUserSettings('REASSIGN_REASON_FILTER')
      if(REASSIGN_REASON_FILTER == 1) this.toggleReassignReasonFilter()
    });

    this.filterValues.reassignReason = this.auth.getUserSettings("REASSIGN_REASON_OPTIONS").map(ele=>({name:ele.name,vendorId:ele.name}))
  }

  ngOnDestroy(): void {
    this.dataService.setVendorData(null);
  }

  //<---------------------Lifecycle Method Ends ---------------------->

  //show or hide Filters
  toggleShow() {
    this.isShown = !this.isShown;
  }

  //sets view to list or card
  setCurrentView(event) {
    this.currentViewType = event.view;
  }

  //called on Go Button
  searchFilters() {
    // this.selectedFilters = {};
    // this.selectedFilterValue = this.searchKey;
    if (this.searchKey !== null) {
      this.selectedFilters.documentId = this.searchKey;
      // this.selectedFilters.invoiceNumber = this.searchKey;
    }
    if (this.vendorNameSearchKey !== null && this.vendorNameSearchKey != undefined) {
      this.selectedFilters.vendorName = this.vendorNameSearchKey.toLocaleUpperCase();
    }
    this.router.navigate(["processing"], { queryParams: this.selectedFilters });
  }

  get selectedFiltersList() {
    let filters = [];
    if (this.selectedFilters) {
      for (let key in this.selectedFilters) {
        if (key == "vendorId") {
          let filteredVendor = this.filterValues.vendorId.filter((each) => {
            return each.vendorId == this.selectedFilters[key];
          });

          if (filteredVendor && filteredVendor.length) {
            filters.push({
              key: "vendor",
              value: filteredVendor[0].name,
              id: "vendorId",
            });
          }
        }

        else if (key == "orgType") {
          let filteredOrgType = this.filterValues.orgType.filter((each) => {
            return each.orgType == this.selectedFilters[key];
          });

          if (filteredOrgType && filteredOrgType.length) {
            filters.push({
              key: "orgType",
              value: filteredOrgType[0].name,
              id: "docType",
            });
          }
        }

        else if (key == "docType") {
          let filteredDocType = this.filterValues.docType.filter((each) => {
            return each.docType == this.selectedFilters[key];
          });

          if (filteredDocType && filteredDocType.length) {
            filters.push({
              key: "docType",
              value: filteredDocType[0].name,
              id: "docType",
            });
          }
        }

        else if (key == "invoiceDate") {
          filters.push({
            key: "invoice date",
            value: this.selectedFilters[key].replace("_", " to "),
            id: key,
          });
        }

        else if (key == 'overall_score') {
          let parsed = JSON.parse(this.selectedFilters[key]);

          if (typeof parsed == 'number') {
            filters.push({
              key: "extraction confidence",
              value: parsed + '',
              id: key
            })
          }
          else if (typeof parsed == 'object') {
            filters.push({
              key: "extraction confidence",
              value: parsed['>='] + ' to ' + parsed['<='],
              id: key
            })
          }
        }

        else if ((key == 'approvalStatus' || key == 'approverEmail') &&
          (this.selectedFilters['approvalStatus'] == 'Hold OR Pending' ||
            this.selectedFilters['approvalStatus'] == 'Rejected')) {
          filters.push({ key: key, value: this.selectedFilters[key], id: key, allowDelete: true });
        }
        else {
          if (key !== 'status') {
            filters.push({ key: key, value: this.selectedFilters[key], id: key });
          }
        }
      }
    }
    if (
      Object.keys(this.selectedFilters) &&
      ((Object.keys(this.selectedFilters).length == 1 &&
        Object.keys(this.selectedFilters)[0] == "status") ||
        (Object.keys(this.selectedFilters).length == 2 &&
          Object.keys(this.selectedFilters).includes("status") &&
          Object.keys(this.selectedFilters).includes("stage") &&
          this.selectedFilters.stage == "RPA"))
    ) {
      return null;
    } else return filters;
  }

  filterList(value?) {
    if (this.selectedFilter == "overall_score" && this.accuracySingle) {
      this.selectedFilterValue = this.accuracySingle;
    }
    else if (this.selectedFilter == "overall_score" && (this.accuracyFrom || this.accuracyTo)) {
      this.selectedFilterValue = JSON.stringify({
        ">=": this.accuracyFrom,
        "<=": this.accuracyTo,
      });
    }

    //this.resetSearchFilters();
    this.selectedFilters[this.selectedFilter] = this.selectedFilterValue;
    if (this.selectedFilter == 'status' && (this.selectedFilterValue == 'NEW' ||
      this.selectedFilterValue == 'PRE_PROCESSING' ||
      this.selectedFilterValue == 'EXTRACTION_INPROGRESS' ||
      this.selectedFilterValue == 'RPA_PROCESSED')) {
      this.router.navigate(["processing"], { queryParams: { status: 'OTHERS' } });
    }
    else {
      this.router.navigate(["processing"], { queryParams: this.selectedFilters });
    }
  }

  // Delete document by Id
  deleteDocumentById(data) {
    let deleteObj = {
      documentId: data.docId,
      deleteReason: data.reason,
      totalReviewTime: data.totalReviewTime
    }
    this.dataService.deleteDocument(deleteObj).subscribe(
      (res) => {
        if (res && res.responseCode === "OK" && res.result) {
          this.dataService.showSuccess("File was deleted successfully", "Deleted!", this.dataService.getAlertTimeOut());
        } else {
          this.dataService.showError("Error while deleting ", "Error", this.dataService.getAlertTimeOut());
        }

        if (this.selectedFilters.invoiceNumber || this.selectedFilters.documentId) {
          //this.searchDocument(this.searchDocument(this.pageNumber));
          this.getDocument(this.pageNumber);
        } else {
          this.getDocument(this.pageNumber);
        }
      },
      (err) => {
        this.dataService.showError("Error while deleting ", "Error", this.dataService.getAlertTimeOut());
      }
    );
  }

  //On click of Primary Filter Dropdown
  updatePrimaryFilter() {
    this.toggleCal = false
  }

  updateDatasetByReviewerOnRefresh(dataset) {
    if (dataset && dataset.length) {
      this.isShown = false;
      this.clearFilter();
      this.documents = dataset;
    }
  }

  //<-----------------$$$$$ RIGHT SIDE PANEL related methods $$$$$---------------->

  fetchVendorData() {
    this.dataService.vendorObserver.subscribe((res) => {
      if (res) {
        this.togglevendor = true;
      }
      this.selectedItem = res;
    });
  }

  closeInfoBox(event?) {
    if (event && event.save) {
      this.fetchDocuments(this.pageNumber);
    }
    this.togglevendor = !this.togglevendor;
    if (event && event.CloseVendorOnCancel) {
      this.togglevendor = false;
    }
    if (event && event.CloseVendorOnCancelAsReviewDone) {
      this.fetchDocuments(this.pageNumber);
      this.togglevendor = false;
    }
  }

  //<-----------------$$$$$ RIGHT SIDE PANEL related methods $$$$$---------------->

  // <----------- ###### MAIN TAB click related method Starts #####-------------->

  setDefaultActiveTab(res) {
    if (res.status) {
      this.allTabs.forEach((each) => {
        if (each.route == res.status) {
          each.active = true;
        } else {
          each.active = false;
        }
      });
    } else {
      this.allTabs.forEach((each) => {
        if (each.route) {
          each.active = false;
        } else {
          each.active = true;
        }
      });
    }
    // code to set the POSTING tab and APPROVAL tab when refresh
    if (res.status == 'RPA_PENDING_APPROVAL') {
      this.allTabs.filter((tab) => {
        if (tab.route == 'RPA_PROCESSED') {
          tab.active = true;
        }
        else {
          tab.active = false;
        }
      })

      this.RPATabs.filter((tab) => {
        if (tab.route.status == res.status && !res.approvalStatus) {
          tab.active = true;
        }
        else {
          tab.active = false;
        }
      })
    }
    this.currentFilter = JSON.parse(JSON.stringify(res));
    if(this.currentFilter.priorityRanking){
      const changePriorityRankingToNumber = typeof this.currentFilter.priorityRanking === 'string'? [Number(this.currentFilter.priorityRanking)]: this.currentFilter.priorityRanking.map(ele=>Number(ele))
      this.currentFilter.priorityRanking = changePriorityRankingToNumber
    }
  }

  // tab based filter method
  parentClicked(ind) {
    for (let i = 0; i < this.allTabs.length; i++) {
      if (i == ind) {
        this.allTabs[i].active = true;
      } else {
        this.allTabs[i].active = false;
      }
    }
  }

  // tab based filter method
  setMainTabFilter(status, RPA?) {
    this.resetSearchFilters();
    this.clearFilters();
    if (status) {
      this.showRPAChildrenRoute = RPA;
      if (!RPA) {
        this.showRPAChildrenRoute = false;
      }
      this.selectedFilters.status = status;
    } else delete this.selectedFilters.status;

    if (this.selectedFilters && this.selectedFilters.stage == "RPA") {
      delete this.selectedFilters.stage;
    }

    if (this.selectedFilters && this.selectedFilters.approverEmail) {
      delete this.selectedFilters.approverEmail;
    }

    if (this.selectedFilters && this.selectedFilters.approvalStatus == "Hold OR Pending") {
      delete this.selectedFilters.approvalStatus;
    }

    this.router.navigate(["processing"], { queryParams: this.selectedFilters });
  }

  switchTabs() {
    this.defaultPageNumber = 1;
    this.pageNumber = 1;
    this.isDocsFetched = false;
  }

  // <----------- ###### MAIN TAB click related method Ends #####-------------->

  // <----------- ###### UPLOAD related method Starts #####-------------->

  openUploadModal() {
    const modalRef = this.modalService.open(UploadFileComponent, {
      windowClass: "delete-model",
      size: "lg",
      centered: true,
    });

    modalRef.componentInstance.dataSubmitted.subscribe((res) => {
      if (res) {
        this.fetchDocuments(this.pageNumber);
      }
    });
  }

  // <----------- ###### UPLOAD related method Starts #####-------------->

  // <----------- ###### SPINNER related method Starts #####-------------->

  showSpinner() {
    this.spinner.show();
  }

  hideSpinner() {
    this.spinner.hide();
  }

  // <----------- ###### SPINNER related method Starts #####-------------->

  // <----------- ###### PAGINATION related method Starts #####-------------->

  setPageNumber(event) {
    this.isDocsFetched = false;
    this.pageNumber = event;
    this.fetchDocuments(this.pageNumber);
  }

  paginate(pageNumber) {
    // this.pageNumber = pageNumber;
    // this.fetchDocuments(pageNumber);
  }

  // <------------------- ###### PAGINATION related method Starts #####----------------------->

  // <----------- ###### Retrieve All or Single Document related method Starts #####-------------->

  fetchDocuments(pageNumber?) {
    if (!pageNumber) pageNumber = this.pageNumber;
    this.getDocument(pageNumber);
  }

  getDocument(pageNumber?) {
    this.showSpinner();

    //consumption page quota check
    if (this.consumtionMessageVisibility == 1) {
      this.dataService.checkConsumedQuota(); //added
      this.dataService.consumedPagesObservable.subscribe((consumedData) => {
        this.consumedPages = consumedData;
      })
    }

    // stp check
    if (this.currentFilter && this.currentFilter.stp == "true") {
      this.currentFilter.stp = true;
    } else if (this.currentFilter && this.currentFilter.stp == "false") {
      this.currentFilter.stp = false;
    }

    // ace check
    if (this.currentFilter && this.currentFilter.ace == "No") {
      this.currentFilter.ace = 0;
    } else if (this.currentFilter && this.currentFilter.ace == "Yes") {
      this.currentFilter.ace = 1;
    }
    else if (this.currentFilter && this.currentFilter.ace == "Not_Applicable") {
      this.currentFilter.ace = 2;
    }

    // overall_score check
    if (this.currentFilter.hasOwnProperty("overall_score")) {
      if (this.currentFilter.overall_score[0] == "{") {
        this.currentFilter.overall_score = JSON.parse(this.currentFilter.overall_score);
      } else {
        this.currentFilter.overall_score = Number(
          this.currentFilter.overall_score
        );
      }
    }

    // if filter contains documentId or InvoiceNumber && searchKey
    if (this.currentFilter && (this.currentFilter.documentId || this.currentFilter.invoiceNumber) && this.searchKey) { // added newly by gaurav on 20-07-2022
      this.currentFilter.documentId ? delete this.currentFilter.documentId : this.currentFilter.invoiceNumber
      this.currentFilter.searchKey = this.searchKey
    }

    if (this.currentFilter && this.currentFilter.documentType) { // renamed documentType to docType 29-09-2022
      this.currentFilter.docType = this.currentFilter.documentType;
      delete this.currentFilter.documentType;
    }

    //code for APPROVAL Tab
    if (this.userRole !== 'reviewer' && this.userRole !== 'approver') {
      let condition1 = this.allTabs.some(item => item.tab === "POSTING" && item.active == true);
      let condition2 = this.RPATabs.some(item => item.tab === "APPROVAL" && item.active == true);

      let condition3 = this.currentFilter && this.currentFilter.status == 'RPA_PENDING_APPROVAL'
      if (condition1 && condition2 && condition3) {
        this.currentFilter.approvalStatus = { "nin": ['Rejected'], "exists": true }
      }
    }

    if (!pageNumber) pageNumber = 1;

    this.dataService.findDocument(this.currentFilter, pageNumber).subscribe(
      (res) => {
        this.isDocsFetched = true;
        this.hideSpinner();

        if (res && res.result && res.result.documents) {
          this.totalItems = res.result.count;

          this.documents = res.result.documents;
          this.defaultPageNumber = this.pageNumber;

          //TODO for KGS document type
          if (this.userRole == 'reviewer' && (this.selectedFilters.status == 'REVIEW') && this.documents.length == 0) {
            this.multiSelect.defaultSettings.defaultOpen = false;
          }
          if (this.userRole !== 'approver') {
            // call a fuction which will filter out those documents that needs to be refreshed at an interval
            let autoRefreshTime = this.auth.getUserSettings('AUTO_REFRESH_IN')
            let intervalId = setInterval(() => {
              let refreshingDocs = this.dataService.getDocumentsToBeRefreshed(this.documents);
              this.checkStatusOfDocuments(refreshingDocs, intervalId);
            }, autoRefreshTime);
          }

        } else {
          this.documents = [];
        }
      },
      (err) => {
        this.documents = [];
        this.isDocsFetched = true;
        this.hideSpinner();
        console.log("error while fetching documents");
        console.log(err);
        this.dataService.showError("Error while fetching documents", "Server Error", this.dataService.getAlertTimeOut());
      }
    );
  }

  checkStatusOfDocuments(refreshingDocs, intervalId) {
    if (refreshingDocs && refreshingDocs.length > 0) {
      refreshingDocs.forEach(document => {
        this.getDocumentDataByDocId(document.documentId, document.index);
      });
    }
    else {
      clearInterval(intervalId);
    }
  }

  //Refresh single document
  refreshItem(event) {
    this.getDocumentDataByDocId(event.docId, event.index);
  }

  //Get single document on refresh
  getDocumentDataByDocId(docId, index) {
    let filter = {
      documentId: docId,
    };
    this.dataService.findDocument(filter, this.pageNumber).subscribe(
      (res) => {
        if (res && res.result) {
          let oldObj = this.documents;
          const data = res.result.documents[0];
          this.documents[index] = data;
          this.documents = JSON.parse(JSON.stringify(this.documents));
        }
      },
      (err) => {
        this.dataService.showError(
          "error while fetching the document",
          "Error!", this.dataService.getAlertTimeOut()
        );
      }
    );
  }

  // <----------- ###### Retrieve All or Single Document related method Starts #####-------------->

  // <-------------------- ###### Calender/Date related Method Starts---------------------->

  convertDateStringToObject(date) {
    const tempDate = new Date(date);
    return {
      year: tempDate.getFullYear(),
      month: tempDate.getMonth() + 1,
      day: tempDate.getDate(),
    };
  }

  convertDate(date) {
    const dateFormat = moment(date).format("DD-MMM-YYYY");
    return dateFormat;
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

    let startDate = this.fromDate.year + "-" + this.fromDate.month + "-" + this.fromDate.day;
    let endDate = this.toDate.year + "-" + this.toDate.month + "-" + this.toDate.day;

    if (startDate && endDate) {
      this.toggleDp();
    }

    this.rangetime = startDate + " to " + endDate; //pick startDate & endDate to form object for filter

    this.selectedFilterValue = startDate + "_" + endDate;
    this.filterList();
  }

  onDateSelectionSingle(date: NgbDate) {
    this.model2 = date;
    this.selectedFilterValue = this.model2.year + "-" + this.model2.month + "-" + this.model2.day;
    this.filterList();
    this.toggleDp();
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

  isRange(date: NgbDate) {
    return (
      date.equals(this.fromDate) ||
      date.equals(this.toDate) ||
      this.isInside(date) ||
      this.isHovered(date)
    );
  }

  toggleDp() {
    this.toggleCal = !this.toggleCal;
  }

  setCalenderDefaults() {
    this.fromDate = null; //this.calendar.getToday();
    this.toDate = null; //this.calendar.getNext(this.calendar.getToday(), "d", 10);
  }

  // <-------------------- ###### Calender/Date related Method Ends---------------------->

  //<--------------------------#######POSTING/RPA tab related method starts#######-------------------->

  // Posting tab internal filters
  setPostingTabFilters(filter) {
    this.resetSearchFilters();
    this.clearFilters();

    this.showRPAChildrenRoute = !this.showRPAChildrenRoute; // Keep call this line just after call clearFilters in this method.

    // to fix the issue - hides sub routes when clicks on the Clear button
    // let activeRPATab = this.RPATabs.filter(item => item.active == true);
    // if (activeRPATab && activeRPATab.length > 0) {
    //   if (activeRPATab[0].route.status === filter.status) {
    //     this.showRPAChildrenRoute = true;
    //   }
    // }

    if (filter) {
      if (filter.stage && filter.status) {
        this.selectedFilters.status = filter.status;
        //this.selectedFilters.stage = filter.stage;
      }
      else if (filter.approverEmail && filter.status) {
        this.selectedFilters.status = filter.status;
        this.selectedFilters.approverEmail = filter.approverEmail;
        this.selectedFilters.approvalStatus = filter.approvalStatus;
      }
      else if (filter.status && filter.status && filter.approvalStatus) {
        this.selectedFilters.status = filter.status;
        this.selectedFilters.approvalStatus = filter.approvalStatus;
      }
      else {
        delete this.selectedFilters.stage;
        delete this.selectedFilters.approverEmail;
        delete this.selectedFilters.approvalStatus;
        this.selectedFilters.status = filter.status;
      }
      this.router.navigate(["processing"], {
        queryParams: this.selectedFilters,
      });
    }
  }

  toggleReassignReasonFilter(){
    this.allTabs.forEach((ele)=>{
      if(ele.active){
            if(ele.tab==="Reassigned"){
              this.filterParams = this.filterParams.filter(ele=>ele.id!=="reassignReason")
              this.filterParams.push({ name: "reassign reason", id: "reassignReason" })
            }else{
              this.filterParams = this.filterParams.filter(ele=>ele.id!=="reassignReason")
            }
      }
    })
  }

  selectDefaultRPAStageOnReload() {
    let index = this.allTabs.findIndex(object => object.tab === 'POSTING');
    switch (this.selectedFilters.status) {
      case 'RPA_PROCESSED':
        this.rpaClicked(0);
        this.parentClicked(index);
        break;
      case 'RPA_PROCESSING':
        this.rpaClicked(1);
        this.parentClicked(index);
        break;
      case 'RPA_FAILED':
        this.rpaClicked(2);
        this.parentClicked(index);
        break;
      case 'RPA_PENDING_APPROVAL':
        // if (this.selectedFilters.approverEmail && this.userRole === 'approver') {
        //   this.rpaClicked(4); // For Assigned Tab to be selected
        // }
        // else if (this.selectedFilters.approvalStatus && (this.userRole === 'admin' || this.userRole === 'clientadmin')) {
        //   let isFound = this.filterParams.some(item => item.name === "Approval Status");
        //   if (isFound) {
        //     this.rpaClicked(3); //For Approval Tab to be selected 
        //   }
        //   else {
        //     this.rpaClicked(4); //For Rejected Tab to be selected 
        //   }
        // }
        // else {
        //   this.rpaClicked(3); // For Approval Tab to be selected
        // }
        // this.parentClicked(index);

        //<--removing apporverEmail - bcp - new requirement-->
        if (this.selectedFilters.approvalStatus && this.selectedFilters.approvalStatus == 'Hold OR Pending' && this.userRole === 'approver') {
          this.rpaClicked(4); // For Assigned Tab to be selected
        }
        else if (this.selectedFilters.approvalStatus && (this.userRole === 'admin' || this.userRole === 'clientadmin')) {
          let isFound = this.filterParams.some(item => item.name === "Approval Status");
          if (isFound) {
            this.rpaClicked(3); //For Approval Tab to be selected 
          }
          else {
            this.rpaClicked(4); //For Rejected Tab to be selected 
          }
        }
        else {
          this.rpaClicked(3); // For Approval Tab to be selected
        }
        this.parentClicked(index);
        break;
      default:
        break;
    }
  }

  rpaClicked(ind) {
    for (let i = 0; i < this.RPATabs.length; i++) {
      if (this.showRPAChildrenRoute) {
        if (i == ind) {
          this.RPATabs[i].active = true;
        } else {
          this.RPATabs[i].active = false;
        }
      }
    }
  }

  toggleApprovalStatusFilter() {
    let isFound = this.filterParams.some(item => item.name === "Approval Status");

    if (this.selectedFilters && this.selectedFilters.status == 'RPA_PENDING_APPROVAL' &&
      !this.selectedFilters.approverEmail && !this.selectedFilters.approvalStatus
      && !isFound) {
      this.filterParams.push({ name: "Approval Status", id: "approvalStatus" })
    }
    else {
      let isFound = this.RPATabs.some(item => item.tab === "APPROVAL" && item.active == true);
      if (!isFound) {
        this.filterParams = this.filterParams.filter((tab) => {
          return tab.name !== 'Approval Status'
        })
      }
    }
    // added below code becoz if we were on Approval tab and user clicks on Posting tab then 
    // filter of ApprovalStatus still remains in PrimaryFilter dropdown while tab is selected Completed 
    // So, to fix this now removing approvalStatus filter from filterParams - on 06-04-2023 kanak
    if (isFound && this.selectedFilters && this.selectedFilters.status != 'RPA_PENDING_APPROVAL') {
      this.filterParams = this.filterParams.filter((tab) => {
        return tab.name !== 'Approval Status'
      })
    }
  }

  setShowRPAStageFlag() {
    let allRPATabNames = ["RPA_PROCESSED", "RPA_PROCESSING", "RPA_FAILED", "RPA_PENDING_APPROVAL"];
    if (this.selectedFilters && allRPATabNames.includes(this.selectedFilters.status)) {
      this.showRPAChildrenRoute = true;
    } else {
      this.showRPAChildrenRoute = false;
    }
  }

  showAssignedTab() {
    // if (this.userRole === 'approver') {
    //   let assignedTab = { route: { status: "RPA_PENDING_APPROVAL", approvalStatus: "Hold OR Pending", approverEmail: localStorage.getItem('emailId') }, tab: "ASSIGNED", active: false };
    //   let isFound = this.RPATabs.some(item => item.tab === "ASSIGNED");
    //   if (!isFound) {
    //     this.RPATabs.push(assignedTab);
    //   }
    // }

    //removing apporverEmail - bcp - new requirement
    if (this.userRole === 'approver') {
      let assignedTab = { route: { status: "RPA_PENDING_APPROVAL", approvalStatus: "Hold OR Pending" }, tab: "ASSIGNED", active: false };
      let isFound = this.RPATabs.some(item => item.tab === "ASSIGNED");
      if (!isFound) {
        this.RPATabs.push(assignedTab);
      }
    }
  }

  showRejectedTab() {
    if (this.userRole === 'admin' || this.userRole === 'clientadmin') {
      let rejectedTab = { route: { status: "RPA_PENDING_APPROVAL", approvalStatus: "Rejected" }, tab: "REJECTED", active: false };
      let isFound = this.RPATabs.some(item => item.tab === "REJECTED");
      if (!isFound) {
        this.RPATabs.push(rejectedTab);
      }
    }
  }

  //<--------------------------#######POSTING/RPA tab related method ends#######---------------------->

  //<--------------------------$$$$$$$ Document type related method STARTS $$$$$---------------------->

  onItemSelectInDocumentType(item: any) {
    this.selectedFilterValue = this.selectedItemsInDocumentType
    this.selectedFilters[this.selectedFilter] = this.selectedFilterValue;
    this.router.navigate(["processing"], { queryParams: this.selectedFilters });
  }

  onItemDeSelectDocumentType(item: any): void {
    this.selectedFilterValue = this.selectedItemsInDocumentType
    this.selectedFilters[this.selectedFilter] = this.selectedFilterValue;
    this.router.navigate(["processing"], { queryParams: this.selectedFilters });
  }

  onSelectAllInDocumentType(items: any) {
    this.selectedFilterValue = items;
    this.selectedFilters[this.selectedFilter] = this.selectedFilterValue;
    this.router.navigate(["processing"], { queryParams: this.selectedFilters });
  }

  onDeSelectAllDocumentType(items: any) {
    this.selectedFilterValue = items;
    this.selectedFilters[this.selectedFilter] = this.selectedFilterValue;
        this.router.navigate(["processing"], { queryParams: this.selectedFilters });
  }

  setDocumentTypeDropdown() {
    if (this.docTypeVisibility == 1 && this.userRole == 'reviewer') {
      this.auth.userObserver.subscribe((userData) => {
        if (userData && userData.documentType) { // TODO for KGS document-type
          this.dropdownListOfDocumentType = userData.documentType;
        }
      })
    }
    else {
      let docTypes = this.auth.getUserSettings('DOCUMENT_TYPES_LIST');
      this.dropdownListOfDocumentType = [];
      if (docTypes) {
        docTypes.map((item) => {
          this.dropdownListOfDocumentType.push(item.name);
        })
      }
    }
  }

  setSelectedItemsInDocumentType() {
    if (this.selectedFilters && this.selectedFilters.documentType) {
      if (this.selectedFilters && typeof (this.selectedFilters.documentType) == 'object') {
        this.selectedItemsInDocumentType = this.selectedFilters.documentType
      }
      else {
        this.selectedItemsInDocumentType.push(this.selectedFilters.documentType)
        this.selectedFilters.documentType = this.selectedItemsInDocumentType
      }
    }
      }

  //<--------------------------$$$$$$$ Document type related method ENDS $$$$$---------------------->
  //<--------------------------$$$$$$$ Priority Ranking related method STARTS $$$$$---------------------->

  onItemSelectInPriorityRanking(item: any) {
    this.selectedFilterValue = this.selectedItemsInPriorityRanking
    this.selectedFilters[this.selectedFilter] = this.selectedFilterValue;
    this.router.navigate(["processing"], { queryParams: this.selectedFilters });
  }
  
  onItemDeSelectPriorityRanking(item: any): void {
    this.selectedFilterValue = this.selectedItemsInPriorityRanking
    this.selectedFilters[this.selectedFilter] = this.selectedFilterValue;
    this.router.navigate(["processing"], { queryParams: this.selectedFilters });
  }
  
  onSelectAllInPriorityRanking(items: any) {
    this.selectedFilterValue = items;
    this.selectedFilters[this.selectedFilter] = this.selectedFilterValue;
    this.router.navigate(["processing"], { queryParams: this.selectedFilters });
  }
  
  onDeSelectAllPriorityRanking(items: any) {
    this.selectedFilterValue = items;
    this.selectedFilters[this.selectedFilter] = this.selectedFilterValue;
    this.router.navigate(["processing"], { queryParams: this.selectedFilters });
  }

  setPriorityRankingDropdown() {
      let priorityRankings = this.auth.getUserSettings('PRIORITY_RANKING_LIST');
      this.dropdownListOfPriorityRanking = [];
      if (priorityRankings) {
        priorityRankings.map((item) => {
          this.dropdownListOfPriorityRanking.push(item.name);
        })
      }
  }

  setSelectedItemsInPriorityRanking() {
    if (this.selectedFilters && this.selectedFilters.priorityRanking) {
      if (this.selectedFilters && typeof (this.selectedFilters.priorityRanking) == 'object') {
        this.selectedItemsInPriorityRanking = this.selectedFilters.priorityRanking
      }
      else {
        this.selectedItemsInPriorityRanking.push(this.selectedFilters.priorityRanking)
        this.selectedFilters.priorityRanking = this.selectedItemsInPriorityRanking
      }
    }
  }

  //<--------------------------$$$$$$$ Priority Ranking related method ENDS $$$$$---------------------->

  //<--------------------%%%%%% RESET/CLEAR/DELETE FILTER METHOD STARTS %%%%%% -------------------------------->

  clearFilter() {
    this.searchKey = null;
    this.vendorNameSearchKey = null;

    let selectedTab = this.allTabs.filter((tab) => {
      if (tab.active) {
        return tab;
      }
    })
    this.clearFilters();
    this.selectedFilters.status = selectedTab[0].route;
    this.router.navigate(["processing"], { queryParams: { status: selectedTab[0].route } });
  }

  resetSearchFilters() {
    this.searchKey = null;
    this.vendorNameSearchKey = null;
    delete this.selectedFilters.invoiceNumber;
    delete this.selectedFilters.documentId; //TODO
    this.accuracyFrom = 0;
    this.accuracyTo = 100;
    this.accuracySingle = null;
    this.selectedAccuracyType == 'value';
  }

  clearFilters() {
    this.showRPAChildrenRoute = false;
    this.currentFilter = {};
    this.selectedFilter = null;
    this.selectedFilterValue = null;
    this.selectedFilters = {};

    // for submitted date
    this.model2 = null
    this.rangetime = null
    this.toggleCal = false
    this.setCalenderDefaults()
    this.searchKey = null;
    this.vendorNameSearchKey = null;

    this.selectedItemsInDocumentType = [];
    this.selectedItemsInPriorityRanking = [];
  }

  deleteFilter(filter) {

    delete this.selectedFilters[filter.id];
    if (filter.id == 'documentType') {
      this.selectedItemsInDocumentType = [];
    }
    if (filter.id == 'priorityRanking') {
      this.selectedItemsInPriorityRanking = [];
    }
    if (Object.keys(this.selectedFilters) &&
      (Object.keys(this.selectedFilters).length == 1 &&
        Object.keys(this.selectedFilters)[0] == "status")) {
      this.clearFilter();
    }
    this.router.navigate(["processing"], { queryParams: this.selectedFilters });
  }


  //<--------------------%%%%%% RESET/CLEAR FILTER METHOD ENDS %%%%%%-------------------------------->

  //<--------------------------XXXXXXXX-Unused methods starts XXXXXXx ------------------------------------->

  getVendorList() {
    let filter = {};
    let page = 0;
    let perItem = 0;
    let vendorObj = {
      filter: filter,
      page: page,
      offset: 0,
      limit: perItem,
    };
    this.dataService.getVendorList(vendorObj).subscribe(
      (res) => {
        if (
          res &&
          res.result &&
          res.result.documents &&
          res.result.documents.length > 0
        ) {
          this.filterValues.vendorId = res.result.documents;
        }
      },
      (err) => {
        this.dataService.showInfo("No vendor found", "Info");
      }
    );
  }

  setStatusFilterValues() {
    this.filterValues.status = [];

    this.appConfig.documentStatus.forEach((each) => {
      this.filterValues.status.push({ name: each, vendorId: each });
    });
  }

  getOrgAndDocList() {
    let orgAndDocType = this.dataService.getOrgAndDocType();

    let orgTypeOptions = JSON.parse(orgAndDocType.ORGTYPE_OPTIONS).map(item => {
      return { name: item.orgType, vendorId: item.orgType }
    })
    let docTypeOptions = JSON.parse(orgAndDocType.DOCTYPE_OPTIONS).map(item => {
      return { name: item.docType, vendorId: item.docType }
    })

    this.filterValues.orgType = orgTypeOptions;
    this.filterValues.docType = docTypeOptions;
  }

  setViewType() {
    let viewType = localStorage.getItem("view");
    if (viewType) {
      this.currentViewType = viewType;
    }
  }

  searchDocument(pageNumber?) {
    if (!pageNumber) pageNumber = 1;
    this.dataService
      .searchDocument(this.searchKey, pageNumber)
      .subscribe((res) => {
        if (res && res.result) {
          this.totalItems = res.result.count;
          if (res.result.documents) {
            this.documents = res.result.documents;
          } else {
            this.documents = [];
          }
        }
      });
  }

  removeOrgType() {
    if (this.userRole !== 'admin') {
      this.filterParams = this.filterParams.filter((item) => {
        return item.id !== 'orgType'
      })
    }
  }

  setChildFilter(filters) {
    for (let key in filters) {
      this.selectedFilters[key] = filters[key];
    }

    this.router.navigate(["processing"], {
      queryParams: this.selectedFilters,
    });
  }

  //<--------------------------XXXXXXXX-Unused methods ends XXXXXXx ------------------------------------->
}
