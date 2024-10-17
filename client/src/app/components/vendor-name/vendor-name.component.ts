import {
  Component,
  OnInit,
  Output,
  OnChanges,
  EventEmitter,
  Input,
  SimpleChanges,
  ViewEncapsulation
} from "@angular/core";
import { DataService } from "src/app/services/data.service";
import { Router } from "@angular/router";
import { AppConfig } from "src/app/config/app-config";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { AuthService } from './../../services/auth.service';
import { UrlService } from './../../services/url.service';
import { Location } from "@angular/common";

@Component({
  selector: "app-vendor-name",
  templateUrl: "./vendor-name.component.html",
  styleUrls: ["./vendor-name.component.scss"],
  encapsulation: ViewEncapsulation.None
})
export class VendorNameComponent implements OnInit, OnChanges {
  @Output() public closeOutput = new EventEmitter();
  @Input() selectedData: any; //check input -> from metadata
  @Input() togglevendor: boolean;

  statusList: any = {
    RPA: [
      { status: "REVIEW", stage: "EXTRACTION" },
      { status: "READY_FOR_EXTRACTION", stage: "PRE-PROCESSOR" },
      { status: "NEW" }
    ],
    EXTRACTION: [
      { status: "READY_FOR_EXTRACTION", stage: "PRE-PROCESSOR" },
      { status: "NEW" }
    ],
    "PRE-PROCESSOR": [{ status: "NEW" }],
    REVIEW_COMPLETED: [
      { status: "REVIEW" }
      // { status: "NEW" }
    ],
    DELETED: [
      { status: "REVIEW" }
      // { status: "NEW" }
    ],
  };

  possibleResetValues: any[];
  showList: boolean = false;
  resetApprovalStatusTo: any;

  setPossibleResetValues() {
    if (this.selectedData && (this.selectedData.status == 'REVIEW_COMPLETED' || this.selectedData.status == 'DELETED')) {
      this.possibleResetValues = this.statusList[this.selectedData.status];
    }
    else if (this.selectedData && this.selectedData.stage)
      this.possibleResetValues = this.statusList[this.selectedData.stage];
    else this.possibleResetValues = [];
  }

  resetApprovalValues = [{ approvalStatus: "Open" }]
  showApprovalList: boolean = false;

  failed: any = {
    case: false,
    msg: ""
  };

  retrySuccess: boolean = false;
  appConfig: any;
  docIdentifier: string;
  documentInfo: any; //check document info -> from result

  allStatus: any[] = [];

  extractionStarted: boolean = false;
  extractionError: string = null;
  extractionSuccess: string = null;

  extractionStatus: any[] = [];
  extractionCount: number = 0;
  isReviewerDialogOpened: boolean;
  isFailedRetryDisabled: boolean = true;

  infoDataMapping = [
    {
      label: "File Name",
      data: "fileName",
      cssClass: "col-6"
    },
    {
      label: "No. of pages",
      data: "pageCount",
      cssClass: "col-6"
    },
    {
      label: "Invoice Date",
      //data: "submittedOn",
      data:"invoiceDate",
      cssClass: "col-6"
    },
    {
      label: "Currency",
      data: "currency",
      cssClass: "col-6"
    },
    {
      label: "Status",
      data: "status",
      cssClass: "col-6"
    },
    {
      label: "Stage",
      data: "stage",
      cssClass: "col-6"
    },
    {
      label: "Status Message",
      data: "statusMsg",
      cssClass: "col-12"
    }
  ];

  closeIcon = "../../../assets/images/cross-sign.png";
  failedIcon = "../../../assets/images/icon-warning.svg";
  extractionIcon = "../../../assets/images/icon-extraction.svg";

  resetTo: string;
  userRole = localStorage.getItem('role');
  isReviewer = this.userRole == 'reviewer' ? true : false;
  isResetAllowed = (this.userRole == 'admin' || this.userRole == 'clientadmin') ? true : false;

  approvalCondition = false;

  constructor(
    public dataService: DataService,
    private auth: AuthService,
    private router: Router,
    private modalService: NgbModal,
    private location: Location,
    private urlService: UrlService
  ) { }

  ngOnInit() {
    this.getDocumentResult();
    this.appConfig = AppConfig;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes && changes.selectedData && changes.selectedData.currentValue) {
      this.setupWorkflowData();
    }
  }

  validateApprovalCondition() {
    if ((this.userRole == 'admin' || this.userRole == 'clientadmin') && this.selectedData &&
      this.selectedData.status && this.selectedData.status === 'RPA_PENDING_APPROVAL'
      && this.selectedData.approvalStatus && this.selectedData.approvalStatus == 'Rejected') {
      this.approvalCondition = true;
    }
    else {
      this.approvalCondition = false;
    }
  }

  setupWorkflowData() {
    this.retrySuccess = false;
    this.extractionStarted = false;
    this.extractionError = null;
    this.extractionSuccess = null;

    this.docIdentifier = this.selectedData.documentId;
    this.getDocumentResult();
    this.disableRetryForFailed();
    this.setPossibleResetValues();
    this.setResetTo(null);
    // this.showList = false;
    this.validateApprovalCondition();
  }

  //Workflow Related
  getDocumentResult() {
    if (this.selectedData && this.selectedData.status) {
      let currIndex = this.appConfig.documentStatus.indexOf(
        this.selectedData.status
      );
      let threshold = this.appConfig.documentStatus.indexOf("EXTRACTION_DONE");
      // if (currIndex >= threshold || this.selectedData.stage == "RPA") {
      this.dataService.getDocumentResult(this.docIdentifier).subscribe(
        res => {
          if (res && res.result && res.result.document) {

            if (res.result.document.documentInfo && res.result.document.documentInfo.length > 0) {
              res.result.document.documentInfo = res.result.document.documentInfo.filter((field) => {
                return field.fieldId !== 'Document'
              })
            }

            this.documentInfo = res.result.document.documentInfo;
          } else {
            this.documentInfo = null;
            this.resultNotFound();
          }
        },
        err => {
          this.documentInfo = null;
          this.resultNotFound();
        }
      );
    }
  }

  startExtraction() {
    this.extractionReset();
    this.callExtractionService(this.selectedData).subscribe(
      res => {
        if (res && res.status !== "error") {
          // if (res.status == "error") {
          //   this.handleExtractionFail();
          // } else {
          this.handleExtractionSuccess();
          // }
        } else {
          this.handleExtractionFail();
        }
      },
      err => this.handleExtractionFail(err)
    );
  }

  extractAll() {
    this.extractionReset();
    this.extractionStatus = [];
    this.selectedData.forEach(data => {
      this.extractionStatus.push(this.callExtractionService(data).toPromise());
    });

    Promise.all(this.extractionStatus)
      .then(res => {
        this.extractionCount = res.filter(each => {
          return each;
        }).length;

        this.handleExtractionSuccess();
      })
      .catch(err => this.handleExtractionFail(err));
  }

  //Auxiliary Methods
  extractionReset() {
    this.extractionStarted = true;
    this.extractionError = null;
    this.extractionSuccess = null;
  }

  callExtractionService(data) {
    const payload = {
      documentId: data.documentId,
      tiffUrl: data.tiffUrl,
      mimeType: data.mimeType
    };

    return this.dataService.startExtraction(payload);
  }

  handleExtractionSuccess() {
    this.extractionSuccess = "Extraction Started..";
    this.extractionStarted = true;
    this.dataService.showSuccess("Extraction Started Successfully", "success");
    this.closeDelay();
  }

  handleExtractionFail(err?) {
    this.extractionStarted = false;
    this.extractionError =
      "Error while calling the extraction service. Please try again later";
    this.dataService.showSuccess(this.extractionError, "error");
    this.closeDelay();
  }

  disableRetryForFailed() {
    if (
      this.selectedData.status == "FAILED" &&
      (this.selectedData.stage == "EXTRACTION" ||
        this.selectedData.stage == "RPA")
    ) {
      this.isFailedRetryDisabled = false;
    } else {
      this.isFailedRetryDisabled = true;
    }
  }

  get metadataFields() {
    let fields = [];
    if (this.selectedData && this.infoDataMapping) {
      this.infoDataMapping.forEach(each => {
        if (this.selectedData && this.selectedData[each.data]) {
          fields.push({
            label: each.label,
            data: this.selectedData[each.data],
            cssClass: each.cssClass
          });
        }
      });
    }
    return fields;
  }

  showView(data) {
    if (data && data.status) {
      return ((data.status === 'FAILED' && ['EXTRACTION', 'RPA'].includes(data.stage)) ||
        (this.appConfig.documentStatus.indexOf(data.status) >=
          this.appConfig.documentStatus.indexOf("EXTRACTION_DONE") &&
          data.status !== "REVIEW") ||
        (data.stage && data.stage == "RPA")
      );
    }

    else return false;
  }

  showData(data) {
    if (data && data.status)
      return ((data.status === 'FAILED' && ['EXTRACTION', 'RPA'].includes(data.stage)) ||
        this.appConfig.documentStatus.indexOf(data.status) >=
        this.appConfig.documentStatus.indexOf("EXTRACTION_DONE") ||
        (data.stage && data.stage == "RPA")
      );
    else return false;
  }

  modifyTitle(title) {
    if (title && typeof title) {
      return title.replace(/([A-Z])/g, " $1");
    } else {
      return "";
    }
  }

  formatName(name) {
    if (name) {
      return "in " + name.replace(/[-,_]/g, " ").toLowerCase();
    }
  }

  closeforReview() {
    this.closeOutput.emit({ close: true, save: false });
  }

  closeDelay() {
    setTimeout(() => {
      this.closeOutput.emit({ close: true, save: true });
    }, 2000);
  }

  resultNotFound() {
    this.failed = {
      case: true,
      msg: "Error while loading results.Try again later"
    };
    setTimeout(() => {
      this.failed = {
        case: false,
        msg: ""
      };
    }, 2000);

  }

  openUploadModal(modalRef) {
    this.modalService.open(modalRef, {
      windowClass: "delete-model",
      size: "lg",
      centered: true
    });
  }

  startPreprocessing(document) {
    this.callPreprocessingService(document).subscribe(
      res => {
        if (res && res.status !== "error") {
          this.dataService.showSuccess(
            "started preprocessing successfully",
            "success"
          );
        } else {
          this.dataService.showError(
            "error while calling the preprocessing service",
            "error"
          );
        }
      },
      err => {
        this.dataService.showError(
          "error while calling the preprocessing service",
          "error"
        );
      }
    );
  }

  callPreprocessingService(data) {
    // const payload = {
    //   documentId: data.documentId,
    //   location: data.uploadUrl,
    //   mimeType: data.mimeType
    // };

    return this.dataService.startPreprocessing(data);
  }

  setResetTo(status) {
    this.resetTo = status;
    if (!status) this.showList = false;
  }

  setApprovalTo(approvalStatus) {
    this.resetApprovalStatusTo = approvalStatus;
    if (!approvalStatus) this.showApprovalList = false;
  }

  onResetApproval() {
    let payload = {
      documentId: this.selectedData.documentId,
      approvalStatus: this.resetApprovalStatusTo,
      reOpened: 1
    };

    console.log(payload);

    this.dataService.updateDocumentData(payload).subscribe(
      res => {
        console.log(res);
        this.handleDocumentResetSuccess();
      },
      err => {
        console.log(err);
        this.handleDocumentResetFailure();
      }
    );
  }

  resetStatusTo() {
    let value = this.resetTo;
    let filteredStatus = this.possibleResetValues.filter(
      each => each.status == value
    );

    if (filteredStatus && filteredStatus.length) {
      if (filteredStatus[0].status === "NEW") {
        let cachedDoc = JSON.parse(JSON.stringify(this.selectedData));
        cachedDoc.stage = "";
        cachedDoc.status = "NEW";
        cachedDoc.extraction_completed = 0;
        cachedDoc.statusMsg = "";

        let updateAsNew = [];
        updateAsNew.push(this.dataService.updateDocumentData(cachedDoc).toPromise());
        //updateAsNew.push(this.callPreprocessingService(cachedDoc).toPromise());

        Promise.all(updateAsNew)
          .then(res => this.handleDocumentResetSuccess())
          .catch(err => this.handleDocumentResetFailure());
      } else if (
        ["READY_FOR_EXTRACTION", "REVIEW"].includes(filteredStatus[0].status)
      ) {
        let payload = {
          documentId: this.selectedData.documentId,
          stage: filteredStatus[0].stage,
          status: filteredStatus[0].status
        };

        this.dataService.updateDocumentData(payload).subscribe(
          res => {
            this.handleDocumentResetSuccess();
          },
          err => {
            this.handleDocumentResetFailure();
          }
        );
      }
    }
  }

  //show toast
  //close the modal
  //close sidebar view
  handleDocumentResetSuccess() {
    this.dataService.showSuccess(
      "reset document status successfully",
      "success"
    );
    this.modalService.dismissAll();
    this.closeDelay();
  }

  handleDocumentResetFailure() {
    this.dataService.showError(
      "error while resetting the document status",
      "error"
    );
    this.modalService.dismissAll();
    this.closeDelay();
  }

  retryForFailed() {
    if (
      this.selectedData &&
      this.selectedData.documentId &&
      this.selectedData.status == "FAILED" &&
      (this.selectedData.stage == "EXTRACTION" ||
        this.selectedData.stage == "RPA")
    ) {
      this.dataService.retryExraction(this.selectedData).subscribe(
        res => {
          if (res) {
            this.dataService.showSuccess(
              "document status reset successful",
              "Success"
            );
            this.closeDelay();
          } else {
            this.dataService.showError(
              "failed while resetting document status",
              "Failed"
            );
            this.retrySuccess = false;
          }
        },
        err => {
          this.closeDelay();
        }
      );
    }
  }

  goToCorrectionPage() {
    if (!this.documentInfo) {
      this.dataService.showError("Error while loading results.Try again later", "error");
      // this.resultNotFound();
    } else {
      this.isReviewer ? this.CheckDocStatusBeforeOpenReviewPage() : this.openReviewPage();
    }
  }

  openReviewPage() {
    if (this.userRole == 'approver') {
      this.urlService.setPreviousUrl(this.location.path());
    }

    this.router.navigate(["/ready-for-review"], {
      queryParams: {
        docIdentifier: this.docIdentifier
      },
      state: { calledFor: 'VendorName' }
    });
  }

  //<=========================Reviewer Methods START===================================>

  CheckDocStatusBeforeOpenReviewPage() {
    this.dataService.getDocumentReviewStatus(this.docIdentifier).subscribe(res => {
      if (res && res.responseCode == 'OK' && res.result) {
        if (res.result.DocumentStatus == 'UNDER REVIEW') {
          this.closeforReview();
          this.dataService.setResponseMessageForReviewer('UNDER_REVIEW');
          this.isReviewerDialogOpened = true;
        }
        // else if (res.result.DocumentStatus == 'REVIEW_COMPLETED') {
        //   this.closeforReview();
        //   this.dataService.setResponseMessageForReviewer('REVIEW_COMPLETED');
        //   this.isReviewerDialogOpened = true;
        // }
        else {
          // update document_review_status to "UNDER REVIEW" for Current Document and then open review page 
          if (this.selectedData && this.selectedData.status == 'REVIEW') {
            this.resetStatusToForReviewer(this.docIdentifier);
          }
          this.openReviewPage();
        }
      }
    }, err => {
      console.log(err);
    })
  }

  resetStatusToForReviewer(documentId) {
    let payload = {
      documentId: documentId,
      document_review_status: 'UNDER REVIEW'
    };

    this.dataService.updateDocumentData(payload).subscribe(
      res => {
        // console.log("document updated");
      },
      err => {
        console.error(err);
      }
    );
  }

  closeReviewerDialog() {
    this.isReviewerDialogOpened = false;
  }

  onActionPressedForReviewer(actionName) {
    this.GetDocsAvailabilityForReviewer();
    switch (actionName) {
      case 'REFRESH':
        break;
      case 'CANCEL': this.closeOutput.emit({ close: true, save: true, CloseVendorOnCancelAsReviewDone: true });
        break;
      case 'PAUSE':
        break;
      default:
        break;
    }
    //this.GetDocsAvailabilityForReviewer();
    //this.closeReviewerDialog();
  }

  GetDocsAvailabilityForReviewer() {
    let currentFilter = { status: "REVIEW" }
    let pageNumber = 1;
    this.dataService.findDocument(currentFilter, pageNumber).subscribe(
      (res) => {
        if (res && res.result) {
          if (res.result.documents.length > 0) {
            // this.docIdentifier = res.result.documents[0].documentId;
            // this.openReviewPage();
            this.dataService.setResponseMessageForReviewer('AFTER_REFRESH');
            //this.isReviewerDialogOpened = false;
            this.isReviewerDialogOpened = !this.isReviewerDialogOpened;
          }
          else {
            this.dataService.setResponseMessageForReviewer('NODATA');
            this.isReviewerDialogOpened = !this.isReviewerDialogOpened;
          }
        }
      }, (err) => {
        console.log(err);
      })
  }

  //<=========================Reviewer Methods ENDS===================================>

}
