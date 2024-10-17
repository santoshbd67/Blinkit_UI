import { AppConfig } from "src/app/config/app-config";
import {
  Component,
  OnInit,
  ViewEncapsulation,
  SimpleChanges,
  Input,
  Output,
  EventEmitter,
} from "@angular/core";
import { Router } from "@angular/router";
import { DataService } from "src/app/services/data.service";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { DeleteAlertComponent } from "../delete-alert/delete-alert.component";
import { environment } from "src/environments/environment";
import * as moment from "moment";
import { AuthService } from 'src/app/services/auth.service';
@Component({
  selector: "app-alluploads",
  templateUrl: "./alluploads.component.html",
  styleUrls: ["./alluploads.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class AlluploadsComponent implements OnInit {
  @Input() dataset: any;
  @Input() itemsCount: number = 0;
  @Input() selectedFilters: any;
  @Input() pageNumber: number = 1; // ToDO declared to fix the pNumber issue by Gaurev 05-12-2022

  @Output() currentPage = new EventEmitter();
  @Output() refresh = new EventEmitter();
  @Output() delete = new EventEmitter();

  togglevendor: boolean = false;
  closeResult: string;
  itemsPerPage: number = 12;
  selectedItem: any;
  //pageNumber: number = 1;
  appConfig: any = AppConfig;

  isDownloadClicked: boolean = false; // kanak
  documentId: any;
  userRole = localStorage.getItem("role");

  statusTextMapping: any = {
    Submissions: "All Documents",
    NEW: "New",
    INVALID: "Invalid",
    REJECTED: "Rejected",
    PRE_PROCESSING: "In Pre-Processing",
    FAILED: "Failed",
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
    OTHERS: "All others except Failed/Review/Review Completed/Deleted/Posted"
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
    downloadIcon: "../../../assets/images/download_xlsx.svg"
  };

  ACTIONS_VISIBILITY: any;

  defaultIcon(event) {
    return (event.target.src = this.imgSrc.defaultIcon);
  }

  //get local blob logo path
  getVendorLogo(str) {
    if (str) {
      let substring = "http";
      if (str.includes(substring)) {
        return str;
      } else {
        return (
          environment.baseAPI + environment.imageBaseAPIPath + "assets/" + str
        );
      }
    } else {
      return this.imgSrc.defaultIcon;
    }
  }

  showView(field) {
    if (field && field.status) {
      return this.dataService.allowView(field);
    } else return false;
  }

  statusMaster = {
    READY_FOR_EXTRACTION: {
      text: "EXTRACT NOW",
      textClass: "text-warning",
      icon: this.imgSrc.extractionIcon,
    },
    REVIEW: {
      text: "START REVIEW",
      textClass: "text-success",
      icon: this.imgSrc.reviewIcon,
    },
  };

  setStatusMaster() {
    this.appConfig.documentStatus.forEach((each) => {
      // if (this.dataService.allowView(each)) {
      this.statusMaster[each] = {
        text: "VIEW",
        textClass: "text-secondary",
        icon: this.imgSrc.viewIcon,
      };
      // }
    });
  }

  // getButtonText(element) {
  //   if (element && element.status) {
  //     if (this.statusMaster[element.status]) return this.statusMaster[element.status];
  //     else if (this.dataService.allowView(element))
  //       return { text: 'VIEW', textClass: 'text-secondary', icon: this.imgSrc.viewIcon };
  //   }
  // }

  getButtonText(element) {
    if (element && element.status) {
      let statusMaster = {
        READY_FOR_EXTRACTION: {
          text: "EXTRACT NOW",
          textClass: "text-warning",
          icon: this.imgSrc.extractionIcon,
        },
        REVIEW: {
          text: "START REVIEW",
          textClass: "text-success",
          icon: this.imgSrc.reviewIcon,
        },
      };

      this.appConfig.documentStatus.forEach((each) => {
        if (this.dataService.allowView(element)) {
          statusMaster[each] = {
            text: "View",
            textClass: "text-secondary",
            icon: this.imgSrc.viewIcon,
          };
        }
      });

      if (statusMaster[element.status]) {
        return statusMaster[element.status];
      }
    }
  }

  getStageName(invoice) {
    if (
      ["RPA_PROCESSING", "PROCESSED"].includes(invoice.status) ||
      invoice.stage === "RPA"
    ) {
      return "in " + invoice.rpaStage + ", ";
    } else if (invoice.stage) {
      return "in " + invoice.stage + ", ";
    } else {
      return "";
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

  infoBox(selectedItem) {
    this.selectedItem = selectedItem;
    this.togglevendor = true;
    this.dataService.setVendorData(selectedItem);
  }

  constructor(
    private router: Router,
    private dataService: DataService,
    private authService: AuthService,
    private modalService: NgbModal
  ) { }

  // review actionable status list
  noActionStatus() {
    this.dataset.forEach((each) => {
      each.noActionStatus = [
        "NEW",
        "REJECTED",
        "PRE_PROCESSING",
        "CORRECTION",
      ].includes(each.status);
    });
  }

  ngOnInit() { }

  closeInfoBox() {
    this.togglevendor = !this.togglevendor;
  }

  openInfoBox(selectedItem) {
    this.selectedItem = selectedItem;
    this.togglevendor = true;
  }

  ngOnChanges(changes: SimpleChanges) {

    this.ACTIONS_VISIBILITY = this.authService.getUserSettings('ACTIONS_VISIBILITY');

    if (changes) {
      if (changes.dataset && changes.dataset.currentValue) {
        this.remapDataset();
        // if (this.dataset && this.dataset.length) {
        // this.noActionStatus();
        // this.setStatusMaster();
        // this.getButtonText();
        // }
      } else {
        this.dataset = [];
      }
    }
  }

  remapDataset() {
    if (this.dataset) {
      this.dataset = JSON.parse(JSON.stringify(this.dataset));
      if (this.dataset.length > 0) {
        this.dataset.find((item, index) => {
          item.submittedOn = moment(this.epochToMili(item.submittedOn)).format("LL");
          item.lastUpdatedOn = moment(this.epochToMili(item.lastUpdatedOn)).format("LL");

          if (item.invoiceDate && (!item.invoiceDate.match(/[.]/g) || (item.invoiceDate.match(/[.]/g) && item.invoiceDate.match(/[.]/g).length != 2)) && item.invoiceDate.length >= 10 && item.invoiceDate.indexOf('-') == -1) {
            item.invoiceDate = moment(
              this.epochToMili(Number(item.invoiceDate))
            ).format("LL");
          }
        });
        this.noActionStatus();
        this.setStatusMaster();
      }
    }
  }

  // setPageNumber(event) {
  //   this.pageNumber = event;
  //   this.currentPage.emit(this.pageNumber);
  // }

  openAlertModel(docId) {
    const modalRef = this.modalService.open(DeleteAlertComponent, {
      windowClass: "delete-model",
      size: "sm",
      centered: true,
    });
    modalRef.componentInstance.id = docId;
    modalRef.componentInstance.submitData.subscribe((res) => {
      if (res) {
        this.delete.emit(docId);
      }
    });
  }

  getDocumentDataByDocId(docId, index) {
    this.refresh.emit({ docId: docId, index: index });
  }

  epochToMili(ts) {
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

  getBlobURL(relativePath) {
    const fileName = relativePath.substring(
      relativePath.lastIndexOf("/"),
      relativePath.length
    );

    let data = {
      container: "export",
      blobName: fileName,
      fullPath: relativePath,
      storageType: "azure",
    };

    return this.dataService
      .getBlobURL(data)
      .toPromise()
      .then((res) => {
        let urlFinal = res.result.blobURL.split('export/')[0] + 'export/' + relativePath.split('export/')[1];
        window.open(urlFinal, '_blank');
      });
  }
}
