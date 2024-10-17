import {
  Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import * as moment from "moment";
import { APIConfig } from "src/app/config/api-config";
import { AppConfig } from "src/app/config/app-config";
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from "src/app/services/data.service";
import { DeleteAlertComponent } from "../delete-alert/delete-alert.component";

@Component({
  selector: "app-upload-list",
  templateUrl: "./upload-list.component.html",
  styleUrls: ["./upload-list.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class UploadListComponent implements OnInit {
  @Input() dataset: any;
  @Input() itemsCount: number = 0;
  @Input() selectedFilters: any;
  @Input() pageNumber: number = 1; // ToDO declared to fix the pNumber issue by Gaurev 05-12-2022

  @Input() selectedFiltersList: any;
  @Input() showRPAChildrenRoute: any;

  @Output() currentPage = new EventEmitter();
  @Output() refresh = new EventEmitter();
  @Output() delete = new EventEmitter();
  @Output() extractedAll = new EventEmitter();
  @Output() public openOutput = new EventEmitter();
  @Output() afterRefresh = new EventEmitter();

  public dataOrginal: any;
  appConfig = AppConfig;
  apiConfig = APIConfig;

  itemsPerPage: number = 12;
  //pageNumber: number = 1;
  selectedItem;
  filterParam: string;
  selectAll: boolean = false;
  multipleSelect: boolean = false;

  statusTextMapping: any = {
    Submissions: "All Documents",
    NEW: "New",
    INVALID: "Invalid",
    REJECTED: "Rejected",
    PRE_PROCESSING: "In Pre-Processing",
    FAILED: "Failed",
    REASSIGN:"Reassigned",
    READY_FOR_EXTRACTION: "Ready For Extraction",
    EXTRACTION_INPROGRESS: "Extraction In Progress",
    EXTRACTION_DONE: "Extraction Completed",
    REVIEW: "Ready For Review",
    REVIEW_COMPLETED: "Review Completed",
    RPA_PROCESSING: "Posting In Progress",
    RPA_PROCESSED: "Posting Completed",
    RPA_FAILED: "Posting Failed",
    RPA_PENDING_APPROVAL: "Waiting for Approval",
    RPA_PENDING_APPROVAL_ASSIGNED: "Assigned to you only",
    DELETED: "Deleted",
    OTHERS: "All others Except Failed/Review/Review Completed/Deleted/Posted"
  };

  imgSrc: any = {
    dotMenuIcon: "../../../assets/images/dot-menu.svg",
    refreshIcon: "../../../assets/images/refreshing.png",
    deleteIcon: "../../../assets/images/icon-delete.svg",
    infoIcon: "../../../assets/images/info.svg",
    defaultIcon: "../../../assets/images/default-logo.png",
    warningIcon: "../../../assets/images/icon-warning.svg",
    extractionIcon: "../../../assets/images/icon-extraction.svg",
    reviewIcon: "../../../assets/images/icon-review.svg",
    viewIcon: "../../../assets/images/login-square-arrow-button-outline.svg",
    downloadIcon: "../../../assets/images/download_icon.svg",
    loadingIcon: "../../../assets/images/loadingGif.gif",
    commentIcon: "../../../assets/images/comment.png"
  };

  isDownloadClicked: boolean = false; // kanak
  documentId: any;
  userRole = localStorage.getItem("role");
  isDeletedTabSelected: boolean = false;
  isReviewer = false;
  selectedFilterTab;
  isReviewerDialogOpened: boolean = false;
  ACTIONS_VISIBILITY: any;
  isBadgeDivShown = false;
  isPostingTabShown = false;
  TAPP_CHANGES_VISIBILITY: any;
  showApproverFields: boolean = false;
  isAssignedTabSelected: boolean = false;
  isReassignedTabSelected: boolean = false;

  isDownloadAllDisabled = false;
  downloadAllThreshold = 0;
  currentFilters: any;
  STP_AND_ACE_VISIBILITY = 0;

  constructor(
    public dataService: DataService,
    private activatedRoute: ActivatedRoute,
    private authService: AuthService,
    private modalService: NgbModal,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.isReviewer = this.userRole == 'reviewer' ? true : false;
  }

  ngOnInit() {
    this.activatedRoute.queryParams.subscribe((res) => {
      //this.currentFilters = res;
      this.currentFilters = JSON.parse(JSON.stringify(res));

      this.selectedFilterTab = res.status;

      if (res.status == 'DELETED') {
        this.isDeletedTabSelected = true;
      }
      else {
        this.isDeletedTabSelected = false;
      }

      if (res.status == 'REASSIGN') {
        this.isReassignedTabSelected = true;
      }
      else {
        this.isReassignedTabSelected = false;
      }

      // if (res.status && res.approverEmail && res.approverEmail) {
      //   this.isAssignedTabSelected = true;
      // }
      // else {
      //   this.isAssignedTabSelected = false;
      // }

      //<--removing apporverEmail - bcp - new requirement-->
      if (res.status && res.approvalStatus && res.approvalStatus == 'Hold OR Pending') {
        this.isAssignedTabSelected = true;
      }
      else {
        this.isAssignedTabSelected = false;
      }
    });
    this.TAPP_CHANGES_VISIBILITY = this.authService.getUserSettings('TAPP_CHANGES_VISIBILITY');
    this.downloadAllThreshold = this.authService.getUserSettings('DOWNLOAD_ALL_THRESHOLD');
    this.STP_AND_ACE_VISIBILITY = this.authService.getUserSettings('STP_AND_ACE_VISIBILITY');
  }

  ngOnChanges(changes: SimpleChanges) {
    this.ACTIONS_VISIBILITY = this.authService.getUserSettings('ACTIONS_VISIBILITY');

    if (changes && changes.dataset && changes.dataset.currentValue) {
      this.reMappedDocsData();
      this.selectAll = false;
      this.multipleSelect = false;
      this.allowListViewDownload();
    }

    if (changes && changes.selectedFilters && changes.selectedFilters.currentValue) {
      this.selectAll = false;
      this.multipleSelect = false;
      if (changes.selectedFilters.currentValue === 'RPA_PENDING_APPROVAL') {
        this.showApproverFields = true;
      }
      else {
        this.showApproverFields = false;
      }
    }

    if (changes && changes.selectedFiltersList && changes.selectedFiltersList.currentValue) {
      //console.log(this.selectedFiltersList);
      if (this.selectedFiltersList && this.selectedFiltersList.length > 0) {
        this.isBadgeDivShown = true;
      }

      if (changes.selectedFiltersList.currentValue.length > 0 &&
        (changes.selectedFiltersList.currentValue[0].key === 'approverEmail' ||
          changes.selectedFiltersList.currentValue[0].key === 'approvalStatus')) {
        this.showApproverFields = true;
      }
      else {
        this.showApproverFields = false;
      }

    }
    else {
      if (!this.selectedFiltersList)
        this.isBadgeDivShown = false;
    }

    if (this.selectedFilterTab === 'RPA_PENDING_APPROVAL') {
      this.showApproverFields = true;
    }

    if (changes && changes.showRPAChildrenRoute && changes.showRPAChildrenRoute.currentValue) {
      if (this.showRPAChildrenRoute && this.showRPAChildrenRoute == true) {
        this.isPostingTabShown = true;
      }
    }
    else {
      if (!this.showRPAChildrenRoute)
        this.isPostingTabShown = false;
    }
  }

  allowListViewDownload() {
    if (this.dataset.length <= this.downloadAllThreshold) {
      this.isDownloadAllDisabled = false;
    }
    else {
      this.isDownloadAllDisabled = true;
    }
  }

  get showingItemCount() {
    let count =
      this.itemsCount - (this.pageNumber - 1) * this.itemsPerPage <
        this.itemsPerPage
        ? this.itemsCount
        : this.pageNumber * this.itemsPerPage;
    return count;
  }

  reMappedDocsData() {
    this.dataset = JSON.parse(JSON.stringify(this.dataset));
    // this.dataset = {} // remove later
    if (this.dataset.length > 0) {

      this.dataset.forEach((each) => {
        if (each) {
          each.selected = false;
          // newly added by gaurav to calculate extraction time
          if (each.lastProcessedOn != undefined && each.lastProcessedOn.toString().length == 10) {
            each.lastProcessedOn = each.lastProcessedOn * 1000;
            each.extractionTime = each.lastProcessedOn - each.submittedOn
          }
          else if (each.lastProcessedOn != undefined && each.lastProcessedOn.toString().length == 13) {
            each.extractionTime = each.lastProcessedOn - each.submittedOn
          }
        }
      });

      this.dataset.find((item, index) => {
        if (item) {
          if (item.submittedOn) {
            item.submittedOn = moment(this.epochToMili(item.submittedOn)).format("lll");
          }
          if (item.lastUpdatedOn) {
            item.lastUpdatedOn = moment(this.epochToMili(item.lastUpdatedOn)).format("lll");
          }
          if (item.deleteTime) {
            item.deleteTime = moment(this.epochToMili(item.deleteTime * 1000)).format("lll");
          }
          if (item.approvedOn) {
            item.approvedOn = moment(this.epochToMili(item.approvedOn * 1000)).format("lll");
          }
          if (item.sentToApprovalOn) {
            item.sentToApprovalOn = moment(this.epochToMili(item.sentToApprovalOn * 1000)).format("lll");
          }

          // if (
          //   item.invoiceDate &&
          //   (!item.invoiceDate.match(/[.]/g) ||
          //     (item.invoiceDate.match(/[.]/g) &&
          //       item.invoiceDate.match(/[.]/g).length != 2)) &&
          //   item.invoiceDate.length >= 10 &&
          //   item.invoiceDate.indexOf("-") == -1
          // )
          //  {
          //   item.invoiceDate = moment(
          //     this.epochToMili(Number(item.invoiceDate))
          //   ).format("ll");
          // }

          //commented on 21-03-2023 because dates are invalid in different date format.
          // if (item.invoiceDate && item.invoiceDate.length >= 10 && item.invoiceDate.indexOf("/") > -1) {
          //   const [day, month, year] = item.invoiceDate.split('/');
          //   const date = new Date(+year, month - 1, +day);
          //   item.invoiceDate = moment(date.getTime()).format("ll");
          // }
        }
      });
    }
    this.openReviewerDialog();
  }

  getButtonText(element) {

    if (element && element.status) {
      let statusMaster = {
        READY_FOR_EXTRACTION: "EXTRACT NOW",
        REVIEW: "START REVIEW",
        REASSIGN: "START REVIEW",
        RPA_PENDING_APPROVAL: "VIEW"
      };
      
      if (this.isAssignedTabSelected) {
        statusMaster = {
          READY_FOR_EXTRACTION: "EXTRACT NOW",
          REVIEW: "START REVIEW",
          REASSIGN: "START REVIEW",
          RPA_PENDING_APPROVAL: "APPROVE"
        };
      }

      this.appConfig.documentStatus.forEach((each) => {
        if (this.dataService.allowView(element)) {
          statusMaster[each] = "VIEW";
        }
      });

      if (statusMaster[element.status]) {
        return statusMaster[element.status];
      }
    }
  }


  getDocument(res) {
    if (res && res.length) {
      res.forEach((element) => {
        if (element && element.vendor && element.vendor[0])
          element.vendor = element.vendor[0];
        element["btnText"] = this.getButtonText(element);
      });
    } else {
      this.dataset = [];
    }
  }

  callInfoBox(selectedItem) {
    this.selectedItem = selectedItem;
    this.dataService.setVendorData(selectedItem);
    this.openOutput.emit(selectedItem);
  }

  extractAll() {
    let toExtract = this.dataset.filter((each) => {
      return each.selected;
    });
    this.callInfoBox(toExtract);
  }

  // setPageNumber(event) {
  //   this.pageNumber = event;
  //   this.currentPage.emit(this.pageNumber);
  // }

  toggleSelect() {
    this.multipleSelect = this.selectAll;
    this.dataset.forEach((each) => {
      each.selected = this.selectAll;
    });
  }

  toggleSelectSingle(i) {
    let allSelected = this.dataset.every((each) => each.selected);
    if (allSelected) {
      this.selectAll = true;
      this.multipleSelect = true;
    } else {
      this.selectAll = false;
      this.multipleSelect = true;
    }

    let noneSelected = this.dataset.every((each) => !each.selected);
    if (noneSelected) this.multipleSelect = false;
  }

  openAlertModel(docId) {
    const modalRef = this.modalService.open(DeleteAlertComponent, {
      windowClass: "delete-model",
      size: "sm",
      centered: true,
    });
    modalRef.componentInstance.id = docId;
    modalRef.componentInstance.calledFrom = 'delete_document';
    modalRef.componentInstance.action = 'delete';
    modalRef.componentInstance.item = 'Document';
    modalRef.componentInstance.submitData.subscribe((res) => {
      if (res) {
        this.delete.emit({ docId: docId, reason: res.reason });
      }
    });
  }

  getDocumentDataByDocId(docId, index) {
    this.refresh.emit({ docId: docId, index: index });
  }

  epochToMili(ts) {
    //console.log(this.dataService.epochTsToMili(ts));
    return this.dataService.epochTsToMili(ts);
  }

  getBooleanFlag(value) {
    if ([true, false].includes(value)) {
      if (value === true) return "Yes";
      else if (value === false) return "No";
    } else {
      return null;
    }
  }

  getACEValue(value) {
    if ([0, 1, 2].includes(value)) {
      if (value === 1) return "Yes";
      else if (value === 0) return "No";
      else if (value === 2) return "NA";
    } else {
      return null;
    }
  }

  secondsToHms(d) {
    d = Number(d);
    var h = Math.floor(d / 3600);
    var m = Math.floor(d % 3600 / 60);
    var s = Math.floor(d % 3600 % 60);

    var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
    var mDisplay = m > 0 ? m + (m == 1 ? " min, " : " mins, ") : "";
    var sDisplay = s > 0 ? s + (s == 1 ? " sec" : " secs") : "";
    return hDisplay + mDisplay + sDisplay;
  }

  // by kanak
  closeDialog() {
    this.isDownloadClicked = false;
  }

  openDialog(documentId: any) {
    if (this.userRole !== 'admin') {

      let userId = localStorage.getItem("userId");
      this.authService.checkDataExists(userId).subscribe((res: any) => {
        if (res && res.responseCode === 'OK' && res.result === 'NO') {
          this.isDownloadClicked = true;
          this.documentId = documentId;
        }
        else {
          this.getResultDownload(documentId);
        }
      }, err => {
        this.dataService.showError('Something went wrong.', 'Server Error');
        console.error('fetch data error', err);
      })
    }
    else {
      this.getResultDownload(documentId);
    }
  }

  getResultDownload(documentId: string) {
    this.dataService.getFileAvailability(documentId, 'singleResult').subscribe((res) => {
      if (res && res.responseCode == 'OK') {
        if (res.result && res.result.downloaded == 'true') {
          let fileName = documentId + '.xlsx';
          const downloadbleFolder = this.dataService.getUserSettings('DOWNLOAD_PATH');
          let downloadablePath = window.location.origin + "/static" + downloadbleFolder + fileName;
          console.log("Result FilePath:- " + downloadablePath);
          this.dataService.saveFile(fileName, downloadablePath);
        }
        else {
          this.dataService.showInfo("Unable to download Results", "Try Again");
        }
      }
    },
      err => {
        console.log(err);
        this.dataService.showError("Unable to download Results", "Server Error");
      });
  }

  downloadOriginalFile(documentId: string) {
    this.dataService.getFileAvailability(documentId, 'originalFile').subscribe((res) => {
      if (res && res.responseCode == 'OK') {
        if (res.result && res.result.downloaded == true) {
          let fileName = res.result.file_name;
          const downloadbleFolder = this.dataService.getUserSettings('DOWNLOAD_PATH');
          let downloadablePath = window.location.origin + "/static" + downloadbleFolder + fileName;
          console.log("Original FilePath:- " + downloadablePath);
          this.dataService.saveFile(fileName, downloadablePath);
        }
        else {
          this.dataService.showInfo("Unable to download File", "Try Again");
        }
      }
    },
      err => {
        console.log(err);
        this.dataService.showError("Unable to download File", "Server Error");
      });
  }

  downloadListViewFiles() {
    // if (this.currentFilters && this.currentFilters.documentType) { // added on 07-03-2023 by kanak
    //   this.currentFilters['docType'] = this.currentFilters.documentType;
    //   delete this.currentFilters.documentType;
    // }

    // if(this.showApproverFields){
    //   this.currentFilters.approvalStatus = { "nin": ['Rejected'], "exists": true }
    // }

    // if (this.currentFilters) {
    //   this.currentFilters = this.dataService.getAppropriateFilters(this.currentFilters);
    // }

    // added on 14-03-2023 by kanak to fix the download list issue
    this.currentFilters = JSON.parse(localStorage.getItem("CurrentFilter"));

    let endPoint;

    switch (this.userRole) {
      case 'reviewer':
        endPoint = `/${this.apiConfig.API.findDocsForReveiwer}`;
        break;
      case 'approver':
        endPoint = `/${this.apiConfig.API.findDocsForApprover}`;
        break;
      default: endPoint = `/${this.apiConfig.API.findDocument}`
        break;
    }

    let filtersObj = {
      filter: this.currentFilters,
      limit: 99999,
      token: localStorage.getItem("token"),
      emailId: localStorage.getItem("emailId"),
      endPoint
    }

    console.log("Filters sent for the ListView Download API is:- ");
    console.log(filtersObj);

    this.dataService.getAvailabilityForDownloadFiles(filtersObj).subscribe((res) => {
      if (res && res.responseCode == 'OK') {
        if (res.result && res.result.downloaded == true) {
          let fileName = res.result.download_path;
          const downloadbleFolder = this.dataService.getUserSettings('DOWNLOAD_PATH');
          let downloadablePath = window.location.origin + "/static" + downloadbleFolder + fileName;
          console.log("Download ListView FilePath:- " + downloadablePath);
          this.dataService.saveFile(fileName, downloadablePath);
        }
        else {
          this.dataService.showInfo("Unable to download File", "Try Again");
        }
      }
    },
      err => {
        console.log(err);
        this.dataService.showError("Unable to download File", "Server Error");
      });
  }

  //<=========================Reviewer Methods START===================================>

  openReviewerDialog() {

    if (this.isReviewer && (this.selectedFilterTab == 'REVIEW')) {

      let reviewState = localStorage.getItem("ReviewState")
      if (reviewState == 'NODATA' && this.dataset.length > 0) {
        localStorage.setItem("ReviewState", 'RELEASED');
        reviewState = localStorage.getItem("ReviewState");
      }
      if (reviewState == 'PAUSED') {
        this.dataService.setResponseMessageForReviewer('PAUSE');
        this.isReviewerDialogOpened = true;
      }
      else if (this.dataset.length == 0 || reviewState == 'NODATA') {
        this.dataService.setResponseMessageForReviewer('NODATA');
        this.isReviewerDialogOpened = true;
      }
      if (localStorage.getItem('_expiredTime') !== undefined) {
        setTimeout(() => {
          localStorage.removeItem('_expiredTime');
        }, 500);
      }
    }
  }

  closeReviewerDialog(calledFor) {
    if (this.isReviewer && this.dataset && this.dataset.length == 0) {
      this.isReviewerDialogOpened = true;
    }
    else {
      this.isReviewerDialogOpened = false;
    }
    if (calledFor == 'Home') {
      this.isReviewerDialogOpened = false;
    }
  }

  onActionPressedForReviewer(actionName) {
    this.GetDocsAvailabilityForReviewer();
    switch (actionName) {
      case 'REFRESH':
        break;
      case 'CANCEL':
        break;
      case 'RESUME':
        localStorage.setItem("ReviewState", "RELEASED");
        break;
      default:
        break;
    }
  }

  GetDocsAvailabilityForReviewer() {
    let currentFilter = { status: "REVIEW" }
    let pNumber = 1;
    this.dataService.findDocument(currentFilter, pNumber).subscribe(
      (res) => {
        if (res && res.result) {
          if (res.result.documents.length > 0) {
            this.dataset = res.result.documents;
            this.dataService.setResponseMessageForReviewer('AFTER_REFRESH');
            this.afterRefresh.emit(this.dataset);
            if (this.isReviewerDialogOpened)
              this.isReviewerDialogOpened = false;
          }
          else {
            this.dataService.setResponseMessageForReviewer('NODATA');
            this.dataset = [];
            if (!this.isReviewerDialogOpened) {
              this.isReviewerDialogOpened = true;
            }
          }
          this.dataset = JSON.parse(JSON.stringify(this.dataset));
        }
      }, (err) => {
        console.log(err);
      })
  }

  //<=========================Reviewer Methods ENDS===================================>
}
