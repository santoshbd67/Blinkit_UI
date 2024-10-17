import { Component, HostListener, OnInit, ViewChild } from "@angular/core";
import { DataService } from "src/app/services/data.service";
import { ActivatedRoute, Router } from "@angular/router";
import { AppConfig } from "src/app/config/app-config";
import { ToastrManager } from "ng6-toastr-notifications";
import { Location } from "@angular/common";
import { filter } from 'rxjs/operators';
import { DeleteAlertComponent } from './../delete-alert/delete-alert.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { APIConfig } from './../../config/api-config';
import { AuthService } from 'src/app/services/auth.service';
import { UrlService } from './../../services/url.service';
import { ApproverDialogComponent } from './../approver-dialog/approver-dialog.component';

@Component({
  selector: "app-ready-for-review",
  templateUrl: "./ready-for-review.component.html",
  styleUrls: ["./ready-for-review.component.scss"],
  host: {
    "(document:keyup)": "handleKeyboardEvent($event)"
  }
})
export class ReadyForReviewComponent implements OnInit {
  appConfig: any;
  IssueAction: string;
  pageSplit = [60, 40];
  fieldStats: any;

  issues: any = {
    all: 0,
    selected: 0
  };

  // templateId: string;
  docIdentifier: string;
  lineItems: any;
  documentResult: any;
  invoiceImages: any;
  filteredInvoiceImages: any;

  rowId: any;
  loading = true;
  fullPathInvoiceImages: any;
  show = false;
  action: string;
  lineItemsRowData: any[] = [];
  docStatus: any;
  boundingBoxData: any;

  documentMetadata: any;
  fieldsData: any[] = [];

  isMasterdataValidated = false;
  validate_btnText: string = 'Validate';
  linesVisibility = "invisible";
  startReviewTime: any;

  imgSrc: any = {
    deleteIcon: "../../../assets/images/icon-delete.svg",
    commentIcon: "../../../assets/images/comment.png",
    reassignIcon: "../../../assets/images/reassign.png"
  };

  apiConfig: any = APIConfig;

  userRole = localStorage.getItem('role');
  isReviewer = this.userRole == 'reviewer' ? true : false;
  isApprover = this.userRole == 'approver' ? true : false;
  showApproverActions: boolean = false;

  shouldRejectButtonDisabled: boolean = false;
  modalRef: any;
  goBackAlreadyCalled: boolean;
  statusOfEnableZoom: any;
  confidenceThreshold: number;
  toggleFunctionality = '';
  POINT_AND_SHOOT_VISIBILITY;
  REASSIGN_BUTTON_VISIBILITY;
  splitSizes: any = { image: 50, invoice: 50 }

  constructor(
    private dataService: DataService,
    private auth: AuthService,
    private modalService: NgbModal,
    private activatedRoute: ActivatedRoute,
    public toastr: ToastrManager,
    private location: Location,
    private router: Router,
    private urlService: UrlService
  ) {
    this.checkPreviousRoute();
  }

  checkPreviousRoute() {
    this.urlService.previousUrl$.subscribe((previousUrl: string) => {
      // console.log('previous url: ', previousUrl);
      // this.showApproverActions = (previousUrl && previousUrl.includes('approverEmail')) ? true : false;

      //<--removing apporverEmail - bcp - new requirement-->
      this.showApproverActions = false;
      if (this.userRole == 'approver' && previousUrl && previousUrl.includes('approvalStatus')) {
        let splitted = previousUrl.split("approvalStatus=");
        if (splitted && splitted.length > 1) {
          if (splitted[1].substring(0, 19) == 'Hold%20OR%20Pending') {
            this.showApproverActions = true;
          }
        }
      }
    });
  }

  get FieldStats() {
    let allStats = [];
    if (this.fieldStats) {
      for (let key in this.fieldStats) {
        allStats.push(this.fieldStats[key]);
      }
    }
    return allStats;
  }

  showView(field) {
    if (field && field.status)
      return this.dataService.allowReviewView(field);
    else return false;
  }

  ngOnInit() {
    this.fetchConfidence();
    this.appConfig = JSON.parse(JSON.stringify(AppConfig));
    this.getLineItem();
    // this.dataService.showSuccess();

    this.POINT_AND_SHOOT_VISIBILITY = this.auth.getUserSettings('POINT_AND_SHOOT_VISIBILITY')
    this.REASSIGN_BUTTON_VISIBILITY = this.auth.getUserSettings('REASSIGN_BUTTON_VISIBILITY');
    // console.log(this.REASSIGN_BUTTON_VISIBILITY)
    if (this.auth.getUserSettings('DEFAULT_FUNCTIONALITY') == 'pointAndShoot') {
      this.toggleFunctionality = 'Zoom'
    } else {
      this.toggleFunctionality = 'Point And Shoot'
    }
  }

  enableZoom(event) {
    console.log(event);
    if (event) {
      this.statusOfEnableZoom = true;
    }
    else {
      this.statusOfEnableZoom = false;
    }
  }

  emitEnableZoom(event) {
    if (this.auth.getUserSettings('DEFAULT_FUNCTIONALITY') == 'pointAndShoot') {
      if (event.checked) {
        this.statusOfEnableZoom = true  // Default POINT_AND_SHOOT_VISIBILITY is True and we enable Zoom     
      } else {
        this.statusOfEnableZoom = false // Default POINT_AND_SHOOT_VISIBILITY is True and we disable Zoom      
      }
    } else {
      if (event.checked) {
        this.statusOfEnableZoom = false    // Default POINT_AND_SHOOT_VISIBILITY is false and we enable POINT_AND_SHOOT_VISIBILITY   
      } else {
        this.statusOfEnableZoom = true  // Default POINT_AND_SHOOT_VISIBILITY is false and we disable POINT_AND_SHOOT_VISIBILITY
      }
    }
  }

  fetchConfidence() {
    this.confidenceThreshold = (!isNaN(this.dataService.getConfidence()) && typeof this.dataService.getConfidence() == 'string') ? Number(this.dataService.getConfidence()) : this.dataService.getConfidence();
  }

  getLineItem(event?) {
    if (event && event.submitted) {
      this.setUpWorkflowVariables();
      this.getDocumentMetadata();
      this.getDocumentResult();
    } else {
      this.loading = true;
      this.activatedRoute.queryParams.subscribe((res: any) => {
        this.docIdentifier = res.docIdentifier;
        this.setUpWorkflowVariables();
        this.getDocumentMetadata();
        this.getDocumentResult();
      });
    }
  }

  switchIssue(whichCase) {
    if (whichCase) {
      if (whichCase == "next") {
        if (this.issues.selected < this.issues.all - 1) {
          this.issues.selected++;
          this.IssueAction = "next" + this.issues.selected;
        }
      } else if (whichCase == "previous") {
        if (this.issues.selected > 0) {
          this.issues.selected--;
          this.IssueAction = "previous" + this.issues.selected;
        }
      }
    }
  }

  getDocumentMetadata() {
    if (this.docIdentifier) {
      this.dataService.getDocument(this.docIdentifier).subscribe(res => {
        if (res && res.result && res.result.document) {
          this.documentMetadata = res.result.document;
          if (this.documentMetadata.status == 'REVIEW_COMPLETED' || this.documentMetadata.status == 'RPA_PENDING_APPROVAL') {
            this.shouldRejectButtonDisabled = true;
          }
          else {
            this.shouldRejectButtonDisabled = false;
          }
          if (res.result.document.pages) {
            this.filteredInvoiceImages = [];
            let allImagesFetch = [];
            res.result.document.pages.forEach(element => {
              allImagesFetch.push(this.getBlobURL(element.url).toPromise());
            });

            Promise.all(allImagesFetch)
              .then(res2 => {
                this.filteredInvoiceImages = res2.map((each, index) => {
                  return { index: index, url: each.result.blobURL };
                });
              })
              .catch(err => {
                this.dataService.showError("error while fetching invoice images", "Error");
              });
          }

          if (res.result.document.status) {
            this.docStatus = res.result.document.status;
          }
        }
      });
    } else {
      this.dataService.showError("error loading the document", "Error");
    }
  }

  getBlobURL(relativePath) {
    const fileName = relativePath.substring(relativePath.lastIndexOf('/'), relativePath.length);

    let data = {
      container: 'preprocessor',
      blobName: fileName,
      fullPath: relativePath,
      storageType: "azure"
    };

    return this.dataService.getBlobURL(data);
  }

  setUpWorkflowVariables() {
    this.fieldStats = {
      totalFields: { label: "Total Fields", value: 0, cssClass: "" },
      highConfidence: {
        label:
          "fields with confidence >" + this.confidenceThreshold + "%",
        value: 0,
        cssClass: "primary-text"
      },
      lowConfidence: {
        label:
          "fields with confidence <" + this.confidenceThreshold + "%",
        value: 0,
        cssClass: "danger-text"
      }
    };
  }

  getDocumentResult() {
    this.dataService.getDocumentResult(this.docIdentifier).subscribe(
      res => {
        if (res && res.result) {
          this.loading = false;
          this.documentResult = res.result;
          this.startReviewTime = Math.round(new Date().getTime())//res.ts
          this.aggregateStats();
        }
      },
      err => {
        console.log("Error in getDocumentResult method:- ");
        console.log(err);
        // this.dataService.showError("error loading the document", "Error");
      }
    );
  }

  closeToast() {
    this.show = false;
  }

  openToast(status?) {
    if (status == "status") {
      this.action = "submit" + this.dataService.generateTimestamp();
    } else if (status == 'Done & Next') {
      this.action = "submit&Next" + this.dataService.generateTimestamp();
    } else {
      this.action = "save" + this.dataService.generateTimestamp();
    }
    console.log("ACTION PRESSED ON REVIEW PAGE IS:- " + this.action);

    this.show = true;
    setTimeout(() => {
      this.closeToast();
    }, 3000);
  }

  // move to a service later
  testConfidence(confidence) {
    return confidence < this.confidenceThreshold;
    //this.appConfig.confidenceThreshold;
  }

  aggregateStats() {
    this.fieldStats = {
      totalFields: { label: "Total Fields", value: 0, cssClass: "" },
      highConfidence: {
        label:
          "fields with confidence >" + this.confidenceThreshold + "%",
        value: 0,
        cssClass: "primary-text"
      },
      lowConfidence: {
        label:
          "fields with confidence <" + this.confidenceThreshold + "%",
        value: 0,
        cssClass: "danger-text"
      }
    };

    let totalConfidence = 0;

    if (this.documentResult && this.documentResult.document) {
      if (this.documentResult.document.documentInfo && this.documentResult.document.documentInfo.length) {
        this.documentResult.document.documentInfo.forEach(each => {

          if (!this.fieldsData.some(e => e.fieldValue === each.fieldId)) {
            this.fieldsData.push({
              fieldValue: each.fieldId,
              fieldValueData: [],
              state: { focused: false, resetFieldValueData: false }
            })
          }

          this.fieldStats.totalFields.value++;

          if (each && each.confidence) {
            if (this.testConfidence(each.confidence)) {
              this.fieldStats.lowConfidence.value++;
            } else {
              this.fieldStats.highConfidence.value++;
            }
          } else {
            this.fieldStats.lowConfidence.value++;
          }
          if (each.confidence) {
            totalConfidence = Number(totalConfidence) + Number(each.confidence);
          }
        });
      }
      if (this.documentResult.document.documentLineItems && this.documentResult.document.documentLineItems.length) {
        this.documentResult.document.documentLineItems.forEach(row => {
          row.fieldset.forEach(each => {

            if (!this.fieldsData.some(e => e.fieldValue === each.fieldId + '_' + row.rowNumber)) {
              this.fieldsData.push({
                fieldValue: each.fieldId + '_' + row.rowNumber,
                fieldValueData: [],
                state: { focused: false, resetFieldValueData: false }
              })
            }

            this.fieldStats.totalFields.value++;

            if (each && each.confidence) {
              if (this.testConfidence(each.confidence)) {
                this.fieldStats.lowConfidence.value++;
              } else {
                this.fieldStats.highConfidence.value++;
              }
            } else {
              this.fieldStats.lowConfidence.value++;
            }
            if (each.confidence) {
              totalConfidence = Number(totalConfidence) + Number(each.confidence);
            }
          });
        });
      }
    }


    this.issues.all = this.fieldStats.lowConfidence.value;
  }

  onBoundingBoxDataReady(data) {
    this.dataService.hideCroppedImageContainer();
    this.boundingBoxData = data;
    this.linesVisibility = 'visible';
  }

  goBack() {
    if (this.isReviewer && this.docStatus == 'REVIEW') {
      this.goBackAlreadyCalled = true;
      this.router.navigateByUrl("/processing?status=REVIEW");
      // reset document_review_status to REVIEW_CANCELED from REVIEW
      this.resetStatusToForReviewer(this.docIdentifier, 'REVIEW_CANCELED');
      this.dataService.setResponseMessageForReviewer('PAUSE');
      localStorage.setItem("ReviewState", "PAUSED");
    }
    else {
      this.location.back();
    }
  }

  ngOnDestroy() {
    this.modalService.dismissAll();
    if (this.isReviewer && this.docStatus == 'REVIEW' && !this.goBackAlreadyCalled) {
      this.goBack();
    }
  }

  closePreview(id) {
    document.getElementById(id).style.display = "none";
    localStorage.setItem("extractedLines", "invisible");
    this.linesVisibility = 'invisible'//localStorage.getItem("extractedLines");
    this.dataService.hideHighligherDiv();
  }

  setLineText(objectInfo) {
    let rowNumber = 0;
    let mappedArray = [];

    if (objectInfo.index != undefined) { // if point and shoot called for LineItems
      mappedArray = this.documentResult.document.documentLineItems[objectInfo.index].fieldset;
      rowNumber = objectInfo.index + 1;
    }
    else { //for documentInfo
      mappedArray = this.documentResult.document.documentInfo;
    }

    mappedArray.forEach(element => {

      if (element.fieldId == objectInfo.selectedTextField.fieldId) {

        this.fieldsData.forEach(elementData => {

          if (elementData.state.resetFieldValueData) {
            elementData.state.resetFieldValueData = false;
            elementData.fieldValueData = [];
          }

          if (!rowNumber) { // for docInfo
            if (elementData.fieldValue == objectInfo.selectedTextField.fieldId) {
              this.updateElementData(elementData, objectInfo, element);
            }
          } else { // for LineItems
            if (elementData.fieldValue == objectInfo.selectedTextField.fieldId + '_' + rowNumber) {
              this.updateElementData(elementData, objectInfo, element);
            }
          }
        })
        this.documentResult = JSON.parse(JSON.stringify(this.documentResult));
        return;
      }
    })
  }

  updateElementData(elementData, objectInfo, element) {
    if (!elementData.fieldValueData.some(e => e._id === objectInfo.selectedboxObj.ID)) {

      elementData.fieldValueData.push({
        _id: objectInfo.selectedboxObj.ID,
        fieldValue: objectInfo.selectedBoxText,
        lineNum: objectInfo.selectedboxObj.line_num,
        pageNum: objectInfo.selectedboxObj.page_num,
        boundingBox: objectInfo.selectedboxObj.boundingBox
      })
    }
    else {
      const index: number = elementData.fieldValueData.findIndex(x => x.fieldValue === objectInfo.selectedBoxText);
      elementData.fieldValueData.splice(index, 1)
    }
    element.editField = '';
    elementData.fieldValueData.sort((a, b) => { return a.lineNum - b.lineNum });
    elementData.fieldValueData.sort((a, b) => { return a.pageNum - b.pageNum });
    let text_Seprator = " ";
    elementData.fieldValueData.forEach(elementFieldValueData => { element.editField = element.editField ? (element.editField + text_Seprator + elementFieldValueData.fieldValue) : (element.editField + elementFieldValueData.fieldValue) });
    element.calledfor = 'pointAndShoot';
  }

  handleKeyboardEvent(event) {
    if (event.keyCode === 27) {
      this.closePreview("cropped-image-container");
    }
  }

  currentSize(data) {
    if (data) {
      this.splitSizes = data// this.splitSizes.image=event.sizes[0]
      // this.splitSizes.invoice=event.sizes[1]
    }
  }

  openAlertModel() {
    this.modalRef = this.modalService.open(DeleteAlertComponent, {
      windowClass: "delete-model",
      size: "sm",
      centered: true,
    });
    this.modalRef.componentInstance.id = this.docIdentifier;
    this.modalRef.componentInstance.calledFrom = 'delete_document'
    this.modalRef.componentInstance.action = 'delete';
    this.modalRef.componentInstance.item = 'Document';
    this.modalRef.componentInstance.submitData.subscribe((res) => {
      if (res) {
        let deleteObj = {
          documentId: this.docIdentifier,
          deleteReason: res.reason,
          totalReviewTime: this.dataService.calculateTotalReviewTime(this.documentMetadata, this.startReviewTime)
        }
        this.dataService.deleteDocument(deleteObj).subscribe(
          (res) => {
            if (res && res.responseCode === "OK" && res.result) {

              this.dataService.showSuccess(
                "File was deleted successfully",
                "Deleted!", this.dataService.getAlertTimeOut()
              );
              this.goBack();
            } else {
              this.dataService.showError("Error while deleting ", "Error", this.dataService.getAlertTimeOut());
            }
            // this.getDocument(this.pageNumber);
          },
          (err) => {
            this.dataService.showError("Error while deleting ", "Error", this.dataService.getAlertTimeOut());
          }
        );
      }
    });
  }
  openReassignAlertModel() {
    this.modalRef = this.modalService.open(DeleteAlertComponent, {
      windowClass: "assign-model",
      size: "sm",
      centered: true,
    });
    this.modalRef.componentInstance.id = this.docIdentifier;
    this.modalRef.componentInstance.calledFrom = 'reassign_document'
    this.modalRef.componentInstance.action = 'reassign';
    this.modalRef.componentInstance.item = 'Document';
    this.modalRef.componentInstance.submitData.subscribe((res) => {
      if (res) {
        let reassignObject = {
          documentId: this.docIdentifier,
          reassignReason: res.reason,
          status:"REASSIGN",
          totalReviewedTime:this.dataService.calculateTotalReviewTime(this.documentMetadata, this.startReviewTime)
        }

        if(res.reassignComment) reassignObject["reassignComment"] = res.reassignComment;
        
        this.dataService.updateDocumentData(reassignObject).subscribe(
          (res) => {
            if (res && res.responseCode === "OK" && res.result) {

              this.dataService.showSuccess(
                "File assigned successfully",
                "Assigned!", this.dataService.getAlertTimeOut()
              );
              this.goBack();
            } else {
              this.dataService.showError("Error while Assigning ", "Error", this.dataService.getAlertTimeOut());
            }
            // this.getDocument(this.pageNumber);
          },
          (err) => {
            this.dataService.showError("Error while Assigning ", "Error", this.dataService.getAlertTimeOut());
          }
        );
      }
    });
  }

  openCommentModel() {
    this.modalRef = this.modalService.open(DeleteAlertComponent, {
      windowClass: "comment-model",
      size: "sm",
      centered: true,
    });
    this.modalRef.componentInstance.documentId = this.docIdentifier;
    this.modalRef.componentInstance.calledFrom = 'add_comment'
    this.modalRef.componentInstance.action = 'add';
    this.modalRef.componentInstance.item = 'Comment';
    this.modalRef.componentInstance.submitData.subscribe((res) => {
      if (res) {
        let payload = {
          documentId: this.docIdentifier,
          comment: res.comment,
          commentAddedAt: this.dataService.generateTimestamp(),
          commentAddedBy: localStorage.getItem('userId')
        };
        this.dataService.updateDocumentData(payload).subscribe(
          res => {
            if (res && res.responseCode === "OK" && res.result) {
              this.dataService.showSuccess(
                "Comment added successfully",
                "Success!", this.dataService.getAlertTimeOut()
              );
            }
          },
          err => {
            console.error(err);
            this.dataService.showError("Error while adding comment", "Error", this.dataService.getAlertTimeOut());
          }
        );
      }
    });
  }

  openModelForApprover(status) {
    this.modalRef = this.modalService.open(ApproverDialogComponent, {
      windowClass: "approver-model",
      size: "sm",
      centered: true,
    });
    this.modalRef.componentInstance.headerText = `Set Approval Status - ${status}`;
    this.modalRef.componentInstance.bodyContent.showTemplate = true;
    this.modalRef.componentInstance.bodyContent.message = 'add_comment'
    this.modalRef.componentInstance.bodyContent.documentId = this.docIdentifier;

    this.modalRef.componentInstance.submitData.subscribe((res) => {
      if (res) {
        let payload = {
          documentId: this.docIdentifier,
          approverComment: res.approveComment,
          approvedOn: this.dataService.generateTimestamp(),
          approvalStatus: status,
          approverEmail: localStorage.getItem("emailId") //added on 28-03-2023 bcp - new requirement
        };
        this.dataService.updateDocumentData(payload).subscribe(
          res => {
            if (res && res.responseCode === "OK" && res.result) {
              this.dataService.showSuccess(
                "Document approved successfully",
                "Success!", this.dataService.getAlertTimeOut()
              );
              this.goBack();
            }
          },
          err => {
            console.error(err);
            this.dataService.showError("Error while approving document", "Error", this.dataService.getAlertTimeOut());
          }
        );
      }
    });
  }

  //<=========================Reviewer Methods START===================================>

  // on click of Done&Next
  docFetchedOnNextForReviewer(obj) {
    if (obj.isNextDocAvailable) {
      this.docIdentifier = obj.documentId;

      this.router.navigate(["/ready-for-review"], {
        queryParams: {
          docIdentifier: this.docIdentifier
        },
        replaceUrl: true,
        state: { calledFor: 'VendorName' },
      });
      this.resetStatusToForReviewer(this.docIdentifier, 'UNDER REVIEW');
    }
    else {
      this.dataService.setResponseMessageForReviewer('NODATA');
      this.router.navigateByUrl("/processing?status=REVIEW");
      localStorage.setItem("ReviewState", "NODATA");
      // this.resetStatusToForReviewer(this.docIdentifier, 'REVIEW_COMPLETED');
    }
    this.fieldsData = []; // to empty global fields data for point and shoot
  }

  performAutoPause(documentId) {
    this.docIdentifier = documentId;
    this.pauseReviewProcess();
  }

  pauseReviewProcess() {
    this.goBack();
  }

  resetStatusToForReviewer(documentId, lockStatus) {
    let payload = {
      documentId: documentId,
      document_review_status: lockStatus
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

  //<=========================Reviewer Methods END===================================>
}
