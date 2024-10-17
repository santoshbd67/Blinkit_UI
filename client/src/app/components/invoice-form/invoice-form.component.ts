import { Location } from "@angular/common";
import {
  AfterContentChecked, AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, SimpleChanges, ViewChild, ViewEncapsulation
} from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { APIConfig } from 'src/app/config/api-config';
import { AppConfig } from "src/app/config/app-config";
import { DataService } from "src/app/services/data.service";
import { ExtractionAssistService } from 'src/app/services/extraction-assist.service';
import { environment } from 'src/environments/environment';
import { DeleteAlertComponent } from "../delete-alert/delete-alert.component";
import { AuthService } from './../../services/auth.service';
import { Query } from "./model/query.model";
import { MatAutocompleteSelectedEvent, MatChipInputEvent, MatAutocomplete } from '@angular/material';
import { map, startWith } from 'rxjs/operators';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { FormControl } from '@angular/forms';
import IdleTimer from "../../shared/IdleTimer";

@Component({
  selector: "app-invoice-form",
  templateUrl: "./invoice-form.component.html",
  styleUrls: ["./invoice-form.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class InvoiceFormComponent implements OnInit, AfterContentChecked, OnDestroy {
  @ViewChild("invoiceForm") mainForm: ElementRef;
  @ViewChild("headerItems") basicForm: ElementRef;
  @ViewChild("lineItems") invoiceForm: ElementRef;
  @ViewChild("lineItemRow") lineItemRow: ElementRef;
  @ViewChild("tabSet") tabSet;

  @Output() public rowData = new EventEmitter();
  @Output() submitted = new EventEmitter();
  @Output() onBoundingBoxDataReady = new EventEmitter();
  @Output() onTabChanged = new EventEmitter();
  @Output() onDoneAndNextClickForReviewer = new EventEmitter();
  @Output() autoPausedForReviewer = new EventEmitter();
  @Output() enableZoom = new EventEmitter();

  @Input() issues: any;
  @Input() issuesPassed: any;
  @Input() documentResult: any;
  @Input() submit: any;
  @Input() docStatus: string;

  @Input() documentMetadata: any;
  @Input() confidenceThreshold: any;
  @Input() fieldsData: any;
  @Input() startReviewBtnClickedAt: any;

  searchAndSelectCtrl = new FormControl();
  @ViewChild('searchAndSelectInput') searchAndSelectInput: ElementRef<HTMLInputElement>;
  @ViewChild('auto') matAutocomplete: MatAutocomplete;

  searchAndSelectSelectable = true;
  searchAndSelectRemovable = true;
  searchAndSelectAddOnBlur = true;
  separatorKeysCodes: number[] = [ENTER, COMMA];
  searchAndSelect = {}

  //basic info & invoice data to be used in form
  resultBasicInfo: any;
  resultInvoiceData: any;

  //selected documentId
  docIdentifier: string;

  //sidebar data selected row
  selectedLineItem: number;
  lineItemsRowData: any[] = [];
  showSidebar: boolean = false;

  appConfig = AppConfig;
  apiConfig: any = APIConfig;

  //all for next & previous issues
  allIssues: number;
  basicFormIssues: any[];
  lineItemsIssues: any[];
  lineItemRowIssues: any[];
  selectedClass: number = -1;
  currentTab = "header";
  textAreaValue =
    "Nexus House\n2 Owlcoles Court\n141 Richardshaw Lane\nLeeds↵LS28";

  imgSrc: any = {
    dotMenuIcon: "../../../assets/images/dot-menu.svg",
    refreshIcon: "../../../assets/images/refreshing.png",
    deleteIcon: "../../../assets/images/icon-delete.svg",
    resetIcon: "../../../assets/images/reset3.png",
    crossIcon: "../../../assets/images/cross-sign.png",
    plusIcon: "../../../assets/images/icon-plus.svg",
  };

  queries: Query[] = [];
  activeQuery: Query;
  query_master = AppConfig.queryTypesOnResult;
  pageMaster = [];
  addingQuery: boolean = false;
  queryWorkflowActive = environment.queryWorkflowActive;
  targetResultInvoiceData: any;
  isSelect = false;
  fieldIds: any[];
  isInputSelect: boolean = false;
  addCustomFieldValue = '';
  documentLines = [];
  idleTimerRef: any;
  title: string;
  autoClosePopupTimer: NodeJS.Timer;
  ticktickCounter: number = 0;
  autoPauseModalRef: any;
  isReviewer = localStorage.getItem("role") === 'reviewer' ? true : false;
  isError = true;
  fields_list = []
  ALERT_DISSMISS_REVIEWER: number;
  isTraceActivityCalled: boolean = false;
  tipsVisibility: number = 0;
  lineItemsVisibility: number = 0;
  toggleFunctionality = '';
  POINT_AND_SHOOT_VISIBILITY;
  rawPredictionStatus: boolean = false;

  constructor(
    public dataService: DataService,
    private auth: AuthService,
    private extractionService: ExtractionAssistService,
    private activatedRoute: ActivatedRoute,
    private location: Location,
    private modalService: NgbModal
  ) {
    this.activeQuery = this.defaultQueryValue;
  }

  @HostListener('window:scroll', ['$event'])
  scrollHandler(event) {
    this.hidePreview('cropped-image-container');
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes) {
      if (changes.documentResult) {
        this.processResultData(); // call process Result  function
      }

      if (changes.submit && changes.submit.currentValue) { // On click of Done/Save/done&Next
        let actionValue = changes.submit.currentValue;

        if (actionValue.includes('submit') || actionValue.includes('submit&Next')) { // done or done&Next

          if (this.auth.getUserSettings('BUZ_RULE_API_VISIBILITY') == 1) {
            this.createPayload('save', actionValue);
          } else {
            this.createPayload(actionValue);
          }
        }
        else {
          this.createPayload(actionValue); // save
        }
      }

      if (changes.issues && changes.issues.currentValue) {
        if (changes.issues.currentValue.search("next") > -1) {
          if (this.issues) this.nextIssue();
        } else if (changes.issues.currentValue.search("previous") > -1) {
          this.prevIssue();
        }
      }

      if (changes.issuesPassed && changes.issuesPassed.currentValue) {
        this.aggregateIssues();
      }

      if (this.documentMetadata) {
        // let resolve = [];
        // this.documentMetadata.pages.forEach((page) => {
        //   resolve.push(this.getBlobURL(page.url).toPromise());
        // });
        // Promise.all(resolve).then((res) => {
        //   this.documentMetadata.pages = res.map((each, index) => {
        //     return { index: index, url: each.result.blobURL };
        //   });
        //   this.pageMaster = [];
        //   this.documentMetadata.pages.forEach((each) => {
        //     let cachedItem = JSON.parse(JSON.stringify(each));
        //     cachedItem.index = +cachedItem.index;
        //     cachedItem.value = cachedItem.index + 1 + "&&val=" + cachedItem.url;
        //     this.pageMaster.push(cachedItem);
        //   });
        // });

        // this.getBlobURL(this.documentMetadata.uploadUrl)
        // .toPromise()
        // .then((res) => {
        //   this.documentMetadata.uploadUrl = res.result.blobURL;
        // });

        // start timer when logged in with Reviewer
        if (this.isReviewer && this.documentMetadata.status == 'REVIEW' && !this.isTraceActivityCalled) {
          this.ALERT_DISSMISS_REVIEWER = this.auth.getUserSettings('ALERT_DISSMISS_REVIEWER');
          this.isTraceActivityCalled = true;
          console.log("AUTO-PAUSE TIMER STARTED AT:- " + this.dataService.generateTimestamp());
          this.traceActivityForReviewer();
        }
      }
    }
  }

  ngOnInit() {
    this.searchAndSelect = this.auth.getUserSettings('SEARCH_AND_SELECT')
    this.POINT_AND_SHOOT_VISIBILITY = this.auth.getUserSettings('POINT_AND_SHOOT_VISIBILITY')
    this.activatedRoute.queryParams.subscribe((res) => {
      // get query prams form URL
      this.docIdentifier = res.docIdentifier; // docID
      if(this.POINT_AND_SHOOT_VISIBILITY===1){
        this.checkRawPredictionExistance(this.docIdentifier);
      }
    });

    this.fieldIds = this.auth.getUserSettings('UNEXTRACTED_FIELDS_LIST');
    this.resultBasicInfo.forEach(element => {
      this.fieldIds = this.fieldIds.filter((key) => { return key.toLowerCase() != element.fieldId.toLowerCase() })
      if(!this.isDropDown(element) && this.searchAndSelect[element.fieldId]) this.searchAndSelectConfig(element)
    });

    this.tipsVisibility = this.auth.getUserSettings('TIPS_VISIBILITY');
    this.lineItemsVisibility = this.auth.getUserSettings('LINE_ITEMS_VISIBILITY');

    //update the tab-content height according to tips visibility
    let element = document.getElementsByClassName('tab-content')
    if (element && element.length > 0) {
      let tabElement = <HTMLElement>element[0];
      tabElement.style.height = this.tipsVisibility == 0 ? 'calc(100vh - 200px)' : 'calc(100vh - 350px)'
    }


    if (this.auth.getUserSettings('DEFAULT_FUNCTIONALITY') == 'pointAndShoot') {
      this.toggleFunctionality = 'Zoom'
    } else {
      this.toggleFunctionality = 'Point And Shoot'
    }
  }

  ngAfterContentChecked() {
    this.aggregateIssues();
  }

  private _searchAndSelectFilter(value: string, fieldId): string[] {
    const pointer = this.searchAndSelect[fieldId];
    const filterValue = value.toLowerCase();
    return pointer["values"].filter((option) => option.toLowerCase().indexOf(filterValue) === 0);
  }

  searchAndSelectConfig({ fieldId, correctedValue, fieldValue }) {
    const pointer = this.searchAndSelect[fieldId];
    if(correctedValue){ //setting selected options
      pointer["selected"] = correctedValue.split(",")
    }else if(fieldValue && correctedValue !== ""){
      pointer["selected"] = fieldValue.split(",")
    }else{
      pointer["selected"] = []
    }

    pointer["selected"].forEach((item) => { // filter selected options from searchAndSelect values
      pointer["values"] = pointer["values"].filter((ele) => ele.toLowerCase() != item.toLowerCase());
      pointer["values"].sort()
    });

    pointer["filteredValues"] = this.searchAndSelectCtrl.valueChanges.pipe(startWith(null),map((option: string | null) =>option ? this._searchAndSelectFilter(option, fieldId) : pointer["values"].slice()));
  }

  searchAndSelectSelectOption(event: MatAutocompleteSelectedEvent, data): void {
    const pointer = this.searchAndSelect[data.fieldId];
    if (pointer["selectOption"] === "single" && pointer["selected"].length > 0) {
      pointer["values"].push(pointer["selected"].pop());
    }
    pointer["selected"].push(event.option.viewValue);
    data.editField = pointer["selected"].join(",");
    this.searchAndSelectInput.nativeElement.value = "";
    this.searchAndSelectCtrl.setValue(null);
    pointer['values'] = pointer['values'].filter(el=>el !== event.option.viewValue)
    pointer["values"].sort()
  }

  searchAndSelectAdd(event: MatChipInputEvent): void {
    // Add option only when MatAutocomplete is not open
    // To make sure this does not conflict with OptionSelected Event
    if (!this.matAutocomplete.isOpen) {
      const input = event.input;
      if (input) input.value = ""; // Reset the input value
      this.searchAndSelectCtrl.setValue(null);
    }
  }

  searchAndSelectRemove(option: string, data): void {
    const pointer = this.searchAndSelect[data.fieldId];
    pointer["selected"] = pointer["selected"].filter(el=>el !== option)
    pointer["values"].push(option);
    pointer["values"].sort();
    data.editField = pointer["selected"].join(",");
    this.searchAndSelectCtrl.setValue(null);
  }

  emitEnableZoom(event) {
    if (this.auth.getUserSettings('DEFAULT_FUNCTIONALITY') == 'pointAndShoot') {
      if (event.checked) {
        this.enableZoom.emit(1);  // Default POINT_AND_SHOOT_VISIBILITY is True and we enable Zoom     
      } else {
        this.enableZoom.emit(0); // Default POINT_AND_SHOOT_VISIBILITY is True and we disable Zoom      
      }
    } else {
      if (event.checked) {
        this.enableZoom.emit(0);    // Default POINT_AND_SHOOT_VISIBILITY is false and we enable POINT_AND_SHOOT_VISIBILITY   
      } else {
        this.enableZoom.emit(1);  // Default POINT_AND_SHOOT_VISIBILITY is false and we disable POINT_AND_SHOOT_VISIBILITY
      }
    }
  }

  switchTab(id) {
    this.tabSet.select(id);
  }

  get defaultQueryValue() {
    return {
      queryUserId: localStorage.getItem("userId"),
      queryUserName: localStorage.getItem("emailId"), //From TAPP system,
      queryType: "", //Tax Query | Vendor GSTN query | Price Query | GRN Query,
      queryText: null, //User can type a text for clarification to Sharepoint WF,
      queryStatus: "Initiated",
      fieldLabel: "",
      fieldId: "",
      pageUrl: "", //page selection
      pageCount: null, //page selection
      pageIndex: "", //page selection
      dateCreated: null, //--payload
      documentId: "", //doc
      documentType: "", //doc
      uploadUrl: "", //doc
      invoiceDate: "", //doc
      invoiceNumber: "", //doc
      totalAmount: "", //doc
      currency: "", //doc
      documentName: "",
    }; //doc
  }

  nextIssue() {
    if (this.selectedClass < this.allIssues - 1) {
      this.selectedClass++;

      if (
        this.basicFormIssues &&
        this.basicFormIssues.length &&
        this.selectedClass < this.basicFormIssues.length
      ) {
        Array.from(this.basicFormIssues).forEach((each, index) => {
          if (index == this.selectedClass) {
            each.classList.add("highlight-error");
            each.focus();
          } else {
            each.classList.remove("highlight-error");
            each.blur();
          }
        });
      } else if (
        this.lineItemsIssues &&
        this.lineItemsIssues.length &&
        this.selectedClass - this.basicFormIssues.length <
        this.lineItemsIssues.length
      ) {
        Array.from(this.lineItemsIssues).forEach((each, index) => {
          if (index == this.selectedClass - this.basicFormIssues.length) {
            each.classList.add("highlight-error");
            each.focus();

            let rowParent = each.parentNode;
            let tableParent = rowParent.parentNode;
            let rowChildren = rowParent.children;
            let tableChildren = tableParent.children;
            let selectedRow = Array.from(tableChildren).indexOf(rowParent);
            this.getEachRowData(selectedRow, "next");
          } else {
            each.classList.remove("highlight-error");
            each.blur();
          }
        });
      } else {
      }
    }
  }

  aggregateIssues() {
    this.basicFormIssues = Array.from(
      this.basicForm
        ? this.basicForm.nativeElement.getElementsByClassName(
          "custom-input-invoice-form-error"
        )
        : []
    );

    this.lineItemsIssues = Array.from(
      this.invoiceForm
        ? this.invoiceForm.nativeElement.getElementsByClassName(
          "correction-box"
        )
        : []
    );

    this.allIssues =
      (this.basicFormIssues ? this.basicFormIssues.length : 0) +
      (this.lineItemsIssues ? this.lineItemsIssues.length : 0);
  }

  prevIssue() {
    if (this.selectedClass > 0) {
      this.selectedClass--;

      if (
        this.basicFormIssues &&
        this.basicFormIssues.length &&
        this.selectedClass < this.basicFormIssues.length
      ) {
        Array.from(this.basicFormIssues).forEach((each, index) => {
          if (index == this.selectedClass) {
            each.classList.add("highlight-error");
            each.focus();
          } else {
            each.classList.remove("highlight-error");
            each.blur();
          }
        });
      } else if (
        this.lineItemsIssues &&
        this.lineItemsIssues.length &&
        this.selectedClass - this.basicFormIssues.length <
        this.lineItemsIssues.length
      ) {
        Array.from(this.lineItemsIssues).forEach((each, index) => {
          if (index == this.selectedClass - this.basicFormIssues.length) {
            each.classList.add("highlight-error");
            each.focus();

            let rowParent = each.parentNode;
            let tableParent = rowParent.parentNode;
            let rowChildren = rowParent.children;
            let tableChildren = tableParent.children;
            let selectedRow = Array.from(tableChildren).indexOf(rowParent);
            this.getEachRowData(selectedRow, "prev");
          } else {
            each.classList.remove("highlight-error");
            each.blur();
          }
        });
      }
    }
  }

  // process the Document result Data for doc
  processResultData() {
    if (this.documentResult) {
      /* hide document field --11/01/2022 */
      if (this.documentResult.document.documentInfo && this.documentResult.document.documentInfo.length > 0) {
        this.documentResult.document.documentInfo = this.documentResult.document.documentInfo.filter((field) => {
          return field.fieldId !== 'Document'
        })
      }

      /* Assign the basic info and Line items */
      this.resultBasicInfo = this.documentResult.document.documentInfo;
      this.resultInvoiceData = this.documentResult.document.documentLineItems;
      this.queries = this.documentResult.document.query;
      this.addEditFieldInBasicInfo(this.resultBasicInfo);
      this.addEditFieldLineItems(this.resultInvoiceData);
    }

    this.aggregateIssues();
  }

  /* add edit field value in line items array for showing processed value of field value */
  addEditFieldLineItems(resultInvoiceData) {
    if (resultInvoiceData && resultInvoiceData.length) {
      this.targetResultInvoiceData = resultInvoiceData[0]
      resultInvoiceData.forEach((row) => {
        if (this.targetResultInvoiceData.fieldset.length <= row.fieldset.length) {
          this.targetResultInvoiceData = row
        }
      })
      resultInvoiceData.forEach((row) => {
        for (let InvoiceDataIndex = 0; InvoiceDataIndex < this.targetResultInvoiceData.fieldset.length; InvoiceDataIndex++) {
          let updated = false
          if (row && row.fieldset && row.fieldset.length) {
            row.fieldset.forEach((element, index) => {
              if (this.targetResultInvoiceData.fieldset[InvoiceDataIndex].fieldId == element.fieldId) {

                if (element.calledfor !== 'pointAndShoot') {
                  if (element.correctedValue) {
                    element.editField = element.correctedValue;
                  } else if (element.fieldValue) {
                    element.editField = element.fieldValue;
                  } else {
                    element.editField = "";
                  }
                }
                else {
                  // this.showSidebar = false;
                  // this.processRowData(this.selectedLineItem);
                  this.lineItemsRowData = this.resultInvoiceData[this.selectedLineItem].fieldset;
                }

                row.fieldset.splice(index, 1)
                row.fieldset.splice(InvoiceDataIndex, 0, element)
                updated = true
              }
            }
            );
            if (!updated) {
              row.fieldset.splice(InvoiceDataIndex, 0, '')
            }
          }
        }
      });
      this.resultInvoiceData = resultInvoiceData;
      //this.resultInvoiceData = JSON.parse(JSON.stringify(this.resultInvoiceData)); //TODO
    }
  }

  /* Add Edit field in Basic */
  addEditFieldInBasicInfo(resultBasicInfo) {
    if (resultBasicInfo && resultBasicInfo.length) {
      resultBasicInfo.forEach((element) => {
        if (element.calledfor !== 'pointAndShoot') {
          if (element.correctedValue || element.correctedValue == '') {
            element.editField = element.correctedValue;
          } else if (element.fieldValue) {
            element.editField = element.fieldValue;
          } else {
            element.editField = "";
          }
        }
        // this.isTextArea(element); //comeback here once textarea logic works
        if(!this.isDropDown(element) && this.searchAndSelect[element.fieldId]) this.searchAndSelectConfig(element)
      });
      this.resultBasicInfo = resultBasicInfo;
    }
  }

  /* show side bar details for line items info*/
  toggleSidebar() {
    this.showSidebar = !this.showSidebar;
  }
  /* get a single row data on click*/
  getEachRowData(index, action?) {
    if (
      !(
        this.resultInvoiceData[index] && this.resultInvoiceData[index].isDeleted
      )
    ) {
      this.processRowData(index, action);
    }
  }

  selectedRowIndex: number = 0;
  selectedItemIndex: number = -1;

  /* process row data of line items*/
  processRowData(index, action?) {
    if (this.resultInvoiceData) {
      this.selectedLineItem = index;

      this.lineItemsRowData = this.resultInvoiceData[index].fieldset;

      // this.addEditFieldLineItems();

      setTimeout(() => {
        this.lineItemRowIssues = this.lineItemRow.nativeElement.getElementsByClassName(
          "custom-input-invoice-form-error"
        );

        if (this.lineItemRowIssues && this.lineItemRowIssues.length) {
          this.selectSidebarFields(index, action);
        }
      }, 200);
    } else {
      this.lineItemsRowData = null;
    }
    this.showSidebar = true;
  }

  //traverse through selcted row & item & select the next or prev item according to the action
  selectSidebarFields(index, action?) {
    if (this.selectedRowIndex === index) {
      if (action == "next") {
        this.selectedItemIndex++;
        this.focusSidebarFields(this.selectedItemIndex);
      } else if (action == "prev") {
        this.selectedItemIndex--;
        this.focusSidebarFields(this.selectedItemIndex);
      }
    } else {
      if (action == "next") {
        this.selectedItemIndex = 0;
        this.focusSidebarFields(this.selectedItemIndex);
      } else if (action == "prev") {
        this.selectedItemIndex = this.lineItemRowIssues.length - 1;
        this.focusSidebarFields(this.selectedItemIndex);
      }
    }

    this.selectedRowIndex = index;
  }

  //Focus item of selected index on sidebar form
  focusSidebarFields(itemIndex) {
    if (this.lineItemRowIssues && this.lineItemRowIssues.length) {
      Array.from(this.lineItemRowIssues).forEach((item, index) => {
        if (itemIndex == index) {
          item.classList.add("highlight-error");
          item.focus();
        } else {
          item.classList.remove("highlight-error");
          item.blur();
        }
      });
    }
  }

  // get Form Changed values
  getChangedValue(rowItem, itemIndex) {
    this.resultInvoiceData[this.selectedLineItem].fieldset[itemIndex] = rowItem;
  }

  // business Rule Validation API 
  validateResult(actionName) {
    let payload = {
      documentId: this.docIdentifier
    }
    this.dataService.validateDocumentResult(payload).subscribe((res:any) => {
      if (res && res.responseCode == "OK") {
        
        const {document_result_updated, docResult} = res.result
        if(document_result_updated && docResult && document_result_updated == 1 ){ // reload docResult if there any error
          this.documentResult = docResult.result
          this.processResultData()
        }

        if (res.result.status_code == 200) {
          this.updateDocument(this.dataService.calculateTotalReviewTime(this.documentMetadata, this.startReviewBtnClickedAt), actionName);
        }
        else if (res.result.status_code == 500) {
          this.fields_list = res.result.list_fields;
          // Auto Reassign Document in case of Reassign validation error
          let reassignErrMsg = 0;
          let normalErrMsg = 0;
          let reassignReason = "Auto Reassigned"
          let reassignComment = ""
          this.fields_list.forEach(ele=>{
            if(ele.error_message.includes("REASSIGN")){
              reassignErrMsg++
              reassignComment += ele.error_message + "; "
            }else if(!('warning_flag' in ele)){
              normalErrMsg++
            }
          })

          let AUTO_REASSIGN_DOCUMENT = this.auth.getUserSettings("AUTO_REASSIGN_DOCUMENT") // Not tested with this flag

          if(AUTO_REASSIGN_DOCUMENT == 1 && reassignErrMsg > 0 && normalErrMsg === 0){
            // move document to REASSIGN queue
            let reassignObject = {
              documentId: this.docIdentifier,
              reassignReason: reassignReason,
              reassignComment: reassignComment,
              status:"REASSIGN",
              totalReviewedTime:  this.dataService.calculateTotalReviewTime(this.documentMetadata, this.startReviewBtnClickedAt)            
            }
            this.reassignDocument(reassignObject)  
            return      
          }

          this.warningMsgPopUp() // warning msg pop-up
        }
        else {
          this.dataService.showError("Business Rule Validation Service Error", "Service Error");
        }
      }
    }, error => {
      this.dataService.showError("Business Rule Validation Service Error", "Service Error");
    })
  }

  warningMsgPopUp(){
    let popUpCondition = true;
    let warningMsg = [];
    this.fields_list.forEach(ele=>{
      if(ele.warning_flag === 1){
        warningMsg.push(ele.error_message);
      }else{
        popUpCondition = false;
      }
    })

    if(popUpCondition){
      this.fields_list = [];
      this.openWarningPopUp(warningMsg);
    }else{
      this.fields_list = this.fields_list.filter(ele=>ele.warning_flag !== 1);
    }
  }

  openWarningPopUp(warningMsg) {
    const modalRef = this.modalService.open(DeleteAlertComponent, {
      windowClass: "assign-model",
      size: "lg",
      centered: true,
    });
    modalRef.componentInstance.id = this.docIdentifier;
    modalRef.componentInstance.action = 'warning';
    modalRef.componentInstance.warningMsg = warningMsg;
    modalRef.componentInstance.submitData.subscribe(() => {
      this.updateDocument(this.dataService.calculateTotalReviewTime(this.documentMetadata, this.startReviewBtnClickedAt), this.isReviewer?"submit&Next":"submit")
    });
  }
  
  reassignDocument(reassignObject){
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
  /* create payload for correction of basic and line items info */
  createPayload(actionName, originalAction?) {
    // let isRequiredField = false;
    // this.resultBasicInfo.forEach((each) => {
    //   if (each.mandatory && each.mandatory == 1 && each.editField == '') {
    //     this.dataService.showInfo("Please fill all the Mandatory fields.", "Validation Error.");
    //     isRequiredField = true;
    //     return;
    //   }
    // })

    // documentInfo
    if (this.resultBasicInfo) {
      this.resultBasicInfo.forEach((each) => {

        // if (each.correctedValue) {
        //   if (each.correctedValue != each.editField) {
        //     each = this.assignValueToEachField(each);
        //   }
        // } else if (!each.fieldValue || (each.fieldValue && each.fieldValue != each.editField)) {
        //   each = this.assignValueToEachField(each);
        // }
        // else if (each.fieldValue == '' && each.editField !== '') {
        //   each = this.assignValueToEachField(each);
        // }

        this.validateResultBasicInfo(each);
        if (each.calledfor == 'pointAndShoot') {
          let data = this.createListForSelectedLines(each);
          each.correctedBoundingBox = data.correctedBoundingBox;
          each.selectedLines = data.selectedLines;
          delete each.calledfor; /* delete the calledfor fields*/
        }

        delete each.editField; /* delete the edit fields*/
      });
    }

    // documentLineItems
    if (this.resultInvoiceData) {
      this.resultInvoiceData.forEach((each) => {
        each.fieldset = each.fieldset.filter((current) => { return current !== '' })
        each.fieldset.forEach((field, index) => {

          // if (each.correctedValue) {
          //   if (field.correctedValue != field.editField) {
          //     each = this.assignValueToEachField(each);
          //   }
          // } else if (field.fieldValue == '' && field.editField == '') {

          // } else if (!field.fieldValue || (field.fieldValue && field.fieldValue != field.editField)) {
          //   field = this.assignValueToEachField(field);
          // }

          this.validateResultInvoiceData(field);
          if (field.calledfor == 'pointAndShoot') {
            let data = this.createListForSelectedLines(field, 'lineItems', each.rowNumber);
            field.correctedBoundingBox = data.correctedBoundingBox;
            field.selectedLines = data.selectedLines;
            delete field.calledfor; /* delete the calledfor fields*/
          }

          delete field.editField;
        });
      });
    }

    if (this.resultBasicInfo && this.resultInvoiceData && this.documentResult && this.documentResult.document) {
      this.documentResult.document.documentInfo = this.resultBasicInfo;
      this.documentResult.document.documentLineItems = this.resultInvoiceData;
      this.documentResult.document.vendorId = this.documentMetadata.vendorId; //Gaurav
      let totalReviewedTime = this.dataService.calculateTotalReviewTime(this.documentMetadata, this.startReviewBtnClickedAt);
      this.updateDocument(totalReviewedTime, actionName, originalAction); /* call the update correction api for the basic and info items */
      this.hidePreview('cropped-image-container');
    }
  }

  validateResultBasicInfo(each) {
    if (each.correctedValue != null && each.correctedValue != undefined) {
      if (each.editField !== each.correctedValue) {
        each = this.assignValueToEachField(each);
      }
    }
    else if (each.fieldValue != null && each.fieldValue != undefined) {
      if (each.editField !== each.fieldValue) {
        each = this.assignValueToEachField(each);
      }
    }
  }

  validateResultInvoiceData(field) {
    if (field.correctedValue != null && field.correctedValue != undefined) {
      if (field.editField !== field.correctedValue) {
        field = this.assignValueToEachField(field);
      }
    }
    else if (field.fieldValue != null && field.fieldValue != undefined) {
      if (field.editField !== field.fieldValue) {
        field = this.assignValueToEachField(field);
      }
    }
  }

  assignValueToEachField(each) {
    each.previousValue = each.correctedValue || each.fieldValue;
    each.correctedValue = each.editField;
    each.correctedBy = "system";
    each.correctedOn = this.dataService.generateTimestamp();
    if (this.rawPredictionStatus) {
      each.extractionAssist = 0; // added on 28/04/2022 by kanak
    }
    return each;
  }

  checkRawPredictionExistance(documentId: any) {
    this.dataService.getRawPredictionExistance(documentId).subscribe(res => {
      if (res && res.result && res.result.count > 0) {
        this.rawPredictionStatus = true;
      }
      else {
        this.rawPredictionStatus = false;
      }
      console.log(`For documentId ${documentId} RawPredictionStatus is:-  ${this.rawPredictionStatus} at ${new Date()}`);
    }, (error) => {
      console.log(`Got error while checkRawPredictionExists at ${new Date()}`);
      console.log(error);
    })
  }

  hidePreview(id) {
    document.getElementById(id).style.display = "none";
  }

  createListForSelectedLines(currentInfo, calledFrom?, rowNumber?) {
    let linesList = { selectedLines: [], correctedBoundingBox: {}, pageNumber: 0 }
    let selectedfields
    if (calledFrom == 'lineItems') {
      selectedfields = this.fieldsData.filter(field => { return (field.fieldValue == currentInfo.fieldId + '_' + rowNumber) })

    } else {
      selectedfields = this.fieldsData.filter(field => { return field.fieldValue == currentInfo.fieldId })
    }

    if (selectedfields && selectedfields.length > 0 && selectedfields[0].fieldValueData.length > 0) {
      selectedfields[0].fieldValueData.forEach(element => {
        linesList.selectedLines.push({
          page_num: element.pageNum ? element.pageNum : 0,
          line_num: element.lineNum ? element.lineNum : 0,
          line_text: element.fieldValue ? element.fieldValue : '',
          line_left: element.boundingBox.left ? element.boundingBox.left : 0,
          line_right: element.boundingBox.right ? element.boundingBox.right : 0,
          line_top: element.boundingBox.top ? element.boundingBox.top : 0,
          line_down: element.boundingBox.down ? element.boundingBox.down : 0
        })
        if (element && currentInfo && currentInfo.pageNumber !== String(element.pageNum + 1)) {
          currentInfo.pageNumber = String(element.pageNum + 1)
        }
      })
      linesList.correctedBoundingBox = this.correctedBoundingBox(linesList.selectedLines)
    }
    return linesList
  }

  correctedBoundingBox(line) {
    let boundingBox = {
      left: Math.min.apply(Math, line.map(data => data.line_left)),
      right: Math.max.apply(Math, line.map(data => data.line_right)),
      top: Math.min.apply(Math, line.map(data => data.line_top)),
      bottom: Math.max.apply(Math, line.map(data => data.line_down))
    }
    return boundingBox;
  }

  /* update the basic and line item info*/
  updateDocument(storedTime?, actionName?, originalAction?) {
    console.log("ACTION CLICKED AND PAYLOAD (only documentInfo) SENT FROM CLIENT IS :-" + this.auth.generateTimestamp());
    console.log("ACTION:- " + actionName + " PAYLOAD:-" + JSON.stringify(this.documentResult.document.documentInfo));

    let reassignReviewTime;
    if(this.documentMetadata.status === 'REASSIGN'){
      reassignReviewTime = this.dataService.calculateReassignReviewTime(this.documentMetadata, this.startReviewBtnClickedAt)
    }

    this.dataService.updateDocumentResult(this.documentResult.document, actionName, storedTime, reassignReviewTime).toPromise().then((res) => {

      this.submitted.emit({ submitted: true });
      if (actionName.search("submit") > -1 && !actionName.includes('submit&Next')) {
        this.goBack();
      }
      if (originalAction && actionName == 'save' && this.auth.getUserSettings('BUZ_RULE_API_VISIBILITY') == 1) {
        this.validateResult(originalAction);
      }
      else {
        this.fields_list = [];
        this.showSidebar = false;
        if (actionName.includes('save')) {
          this.dataService.showSuccess("Updated Successfully", "Updated", this.dataService.getAlertTimeOut());
        }
        else {
          this.dataService.showSuccess("Successfully Submitted", "Submitted", this.dataService.getAlertTimeOut());
        }
        if (actionName && actionName.includes('submit&Next')) {
          //get Next Document and Refresh Page for the Reviewer Role user
          this.getNextDocumentForReviewer();
        }
      }
    })
      .catch((err) => {
        console.log(`Got Error while updateDocument in InvoiceForm Component at ${new Date().toUTCString()}`);
        console.error(err);
        if (actionName && actionName.includes('save')) {
          this.dataService.showError("Error while updating", "Update Document Failed", this.dataService.getAlertTimeOut());
        }
        if (actionName && actionName.includes('submit')) {
          this.dataService.showError("Error while submitting", "Submission Failed", this.dataService.getAlertTimeOut());
        }
        if (actionName.search("submit") > -1 && !actionName.includes('submit&Next')) {
          this.goBack();
        }
      });
  }

  createfileforlogs(data) {
    let filename
    if (!this.documentResult.document) {
      console.log('Console.save: No data')
      return;
    }

    if (!filename) filename = 'console.json'

    if (typeof this.documentResult.document === "object") {
      data = JSON.stringify(data, undefined, 4)
    }

    var blob = new Blob([data], { type: 'text/json' }),
      e = document.createEvent('MouseEvents'),
      a = document.createElement('a')

    a.download = filename
    a.href = window.URL.createObjectURL(blob)
    a.dataset.downloadurl = ['text/json', a.download, a.href].join(':')
    e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
    a.dispatchEvent(e)
  }

  /* check  if the field value id define   */
  isValueDefined(field) {
    if (field) {
      return field && field.trim() && field.length;
    } else return false;
  }

  allowReset(data) {
    if (
      data &&
      this.documentMetadata &&
      this.documentMetadata.status === "REVIEW"
    ) {
      return data && data.correctedBy && data.correctedOn;
    } else return false;
  }

  /* Reset Basic Info Field Value*/
  resetBasicInfoFieldValue(ind) {
    this.resultBasicInfo[ind].editField = this.resultBasicInfo[ind].fieldValue;
    this.resultBasicInfo[ind].previousValue = this.resultBasicInfo[ind].correctedValue;
    // this.resultBasicInfo[ind].correctedValue = "";
    // this.resultBasicInfo[ind].correctedOn = "";
    // this.resultBasicInfo[ind].correctedBy = "";

    // delete these value on Reset as per Hari's request on 29/06/2022
    delete this.resultBasicInfo[ind].correctedValue;
    delete this.resultBasicInfo[ind].correctedOn;
    delete this.resultBasicInfo[ind].correctedBy;
    delete this.resultBasicInfo[ind].extractionAssist;

    // added for updating bounding box - by gaurav
    delete this.resultBasicInfo[ind].correctedBoundingBox
    delete this.resultBasicInfo[ind].selectedLines

    const {fieldId,fieldValue} = this.resultBasicInfo[ind]
    if(this.searchAndSelect[fieldId] && this.searchAndSelect[fieldId]['selected']){
      this.searchAndSelect[fieldId]['selected'] = fieldValue? fieldValue.split(','):[]
    }
  }

  /* Reset line items Info Field Value*/
  resetInvoiceValue(index) {
    this.lineItemsRowData[index].editField = this.lineItemsRowData[index].fieldValue;
    // this.lineItemsRowData[index].correctedValue = "";
    // this.lineItemsRowData[index].correctedOn = "";
    // this.lineItemsRowData[index].correctedBy = "";

    delete this.lineItemsRowData[index].correctedValue;
    delete this.lineItemsRowData[index].correctedOn;
    delete this.lineItemsRowData[index].correctedBy;
    delete this.lineItemsRowData[index].extractionAssist;

    delete this.lineItemsRowData[index].correctedBoundingBox;
    delete this.lineItemsRowData[index].selectedLines
  }

  /* set bounding box data */
  setBoundingBoxData(event, fieldData,showBoundingBox=true,id?) {
    localStorage.setItem("extractedLines", showBoundingBox?"visible":"invisible");

    let index;
    if (this.selectedLineItem != undefined) {
      const fieldSetIndex: number = this.resultInvoiceData[this.selectedLineItem].fieldset.findIndex(x => x.fieldId === fieldData.fieldId)
      if (fieldSetIndex >= 0) {
        index = this.selectedLineItem
      }
    }

    const data = {
      index: index,
      fieldData: fieldData,
      event: event,
      globalFieldsData: this.fieldsData
    };

    this.onBoundingBoxDataReady.emit(data);
    if(id){ //hiding cropped-image-container for select and search
      const temp = document.getElementById(id)
      setTimeout(()=>temp.style.display = 'none',0)
    }
  }

  updatefield($event, fieldData) {
    let index;
    if (this.selectedLineItem != undefined) {
      const fieldSetIndex: number = this.resultInvoiceData[this.selectedLineItem].fieldset.findIndex(x => x.fieldId === fieldData.fieldId)
      if (fieldSetIndex >= 0) {
        index = this.selectedLineItem
      }
    }
    this.fieldsData.forEach(element => {
      let previousState = element.state.focused
      if (this.selectedLineItem != undefined) {

        if (element.fieldValue == fieldData.fieldId + '_' + (index + 1)) {
          element.state.focused = true
          if (previousState != element.state.focused && element.state.focused) {
            element.state.resetFieldValueData = true
          } else {
            element.state.resetFieldValueData = false
          }

        } else {
          element.state.focused = false
          element.state.resetFieldValueData = false
        }
      }
      else {
        if (element.fieldValue == fieldData.fieldId) {
          element.state.focused = true
          if (previousState != element.state.focused && element.state.focused) {
            element.state.resetFieldValueData = true
          } else {
            element.state.resetFieldValueData = false
          }

        } else {
          element.state.focused = false
          element.state.resetFieldValueData = false
        }
      }
    });
  }

  /* on tab changed 'Header' and Items */
  tabChanged(ev) {
    this.onTabChanged.emit();
    this.aggregateIssues();
    this.selectedClass = -1;
  }

  transFormHeader(header: string) {
    if (header) return header.replace(/([A-Z])/g, " $1").toLocaleUpperCase();
    else return "";
  }
  
  /* Added for dropdown CR */
  isDropDown({dropDown,dropDownOptions,fieldValue, correctedValue}){
    const DROPDOWN_VISIBILITY = this.auth.getUserSettings('DROPDOWN_VISIBILITY');
    let flag = false
    if(DROPDOWN_VISIBILITY===1 && dropDown===1 && dropDownOptions && dropDownOptions.length>0){
      if(correctedValue){
        flag = dropDownOptions.includes(correctedValue)?true:false;
      }else{
        flag = dropDownOptions.includes(fieldValue)?true: false
      }
    }
    return flag
  }
  
  isTextArea(field) {
    if (field && field.editField) {
      let lines = field.editField.match(/\n/g);
      if (lines && lines.length)
        return { textarea: lines.length > 0, rows: lines.length };
      else return { textarea: false, rows: 0 };
    }
  }

  goBack() {
    this.location.back();
  }

  // check the confidence score for every fields
  testConfidence(confidence) {
    return confidence < this.confidenceThreshold;
    // this.appConfig.confidenceThreshold;
  }

  isAnIssue(field) {
    return (!(field.correctedValue) && (!field.confidence || field.confidence < this.confidenceThreshold));
  }

  addRow() {
    let blankObject = {
      pageNumber: "-1",
      rowNumber: this.resultInvoiceData.length + 1,
      fieldset: [],
      isInserted: true,
    };

    if (this.resultInvoiceData && this.resultInvoiceData.length > 0 && this.resultInvoiceData[0].fieldset) {
      blankObject.fieldset = JSON.parse(
        JSON.stringify(this.resultInvoiceData[0].fieldset)
      );
    }
    else {
      blankObject.fieldset = JSON.parse(
        JSON.stringify({})
      );
    }

    blankObject.fieldset.forEach((field) => {
      let deleteKeys = [
        "confidence",
        "suspiciousSymbols",
        "boundingBox",
        "correctedBy",
        "correctedOn",
        "correctedValue",
      ];
      for (let key in field) {
        if (deleteKeys.includes(key)) {
          delete field[key];
        } else if (key !== "fieldId") {
          field[key] = "";
        }
      }
      if (!this.fieldsData.some(e => e.fieldValue === field.fieldId + '_' + blankObject.rowNumber)) {
        this.fieldsData.push({
          fieldValue: field.fieldId + '_' + blankObject.rowNumber,
          fieldValueData: [],
          state: { focused: false, resetFieldValueData: false }
        })
      }
    });

    this.resultInvoiceData.push(blankObject);
  }

  openAlertModel(docId) {
    const modalRef = this.modalService.open(DeleteAlertComponent, {
      size: "sm",
      centered: true,
    });

    modalRef.componentInstance.id = docId;

    if (this.resultInvoiceData[docId] && !this.resultInvoiceData[docId].isInserted) {
      modalRef.componentInstance.message =
        "You can restore it anytime even after deletion by clicking on restore icon.";
    }
    else if (
      this.resultInvoiceData[docId] && this.resultInvoiceData[docId].isInserted) {
      modalRef.componentInstance.message =
        "This will be temporarily deleted from the list. Once Info alert pops-up(If you choose Yes), then click on Save button to permanently delete.";
    }

    modalRef.componentInstance.item = "Delete Invoice Row";

    modalRef.componentInstance.submitData.subscribe((res) => {
      if (res) {
        this.deleteRow(docId);
      }
    });
  }

  deleteRow(ind) {
    if (this.resultInvoiceData[ind] && !this.resultInvoiceData[ind].isInserted) {
      this.resultInvoiceData[ind].isDeleted = true;
      this.dataService.showSuccess("Invoice row deleted successfully", "success", this.dataService.getAlertTimeOut());
    }
    else { // for manually added row deleting permanantly from the database
      this.dataService.showInfo("Please click on the Save button to save changes", "Info");

      this.resultInvoiceData.splice(ind, 1);
    }

    // this.dataService.showSuccess("Invoice row deleted successfully", "success", this.dataService.getAlertTimeOut());
    this.showSidebar = false;
  }

  restoreRow(ind) {
    this.resultInvoiceData[ind].isDeleted = false;
  }

  get availableFields() {
    return this.resultBasicInfo.concat(this.resultInvoiceData[0].fieldset);
  }

  addQuery(queryForm, element) {
    if (queryForm.dirty) {
      if (queryForm.valid) {
        this.activeQuery.fieldLabel = this.transFormHeader(
          this.activeQuery.fieldId
        );
        if (!this.activeQuery.fieldId) this.activeQuery.fieldId = "NA";
        if (!this.activeQuery.fieldLabel) this.activeQuery.fieldLabel = "NA";

        let now = new Date();
        this.activeQuery.pageCount = this.pageMaster.length + "";
        if (this.activeQuery.pageIndex) {
          let all: any = this.activeQuery.pageIndex.split("&&val=");
          this.activeQuery.pageIndex = all[0];
          this.activeQuery.pageUrl = all[1];
        } else {
          this.activeQuery.pageIndex = "1";
          this.activeQuery.pageUrl = this.pageMaster[0].url;
        }

        this.activeQuery.documentId = this.docIdentifier;
        this.activeQuery.dateCreated = this.formatDate(now);
        this.activeQuery.documentType = this.documentMetadata.documentType;
        this.activeQuery.uploadUrl = this.documentMetadata.uploadUrl;
        (this.activeQuery.invoiceDate = this.formatDate(
          +this.documentMetadata.invoiceDate
        )),
          // this.activeQuery.invoiceDate = this.formatDate(now);
          (this.activeQuery.invoiceNumber = this.documentMetadata.invoiceNumber);
        this.activeQuery.totalAmount = this.documentMetadata.totalAmount;
        this.activeQuery.currency = this.documentMetadata.currency
          ? this.documentMetadata.currency
          : "INR";
        this.activeQuery.documentName = this.documentMetadata.fileName;

        this.dataService.addQueryForResult(this.activeQuery).subscribe(
          (res) => {
            if (res && res.responseCode === "OK") {
              this.dataService.showSuccess(
                "Query added successfully",
                "Success", this.dataService.getAlertTimeOut()
              );
              this.activeQuery = this.defaultQueryValue;
              this.addingQuery = false;
              element.scrollTop = 0;
              this.submitted.emit({ submitted: true });
            } else {
              this.dataService.showError(
                "Unable to add query to the workflow app, some validation failed.",
                "Error", this.dataService.getAlertTimeOut()
              );
            }
          },
          (err) => {
            this.dataService.showError(
              "Error While Adding Query, Please Try Again Later",
              "Error", this.dataService.getAlertTimeOut()
            );
          }
        );
      } else {
        this.dataService.showError(
          "Please fill all the mandatory fields to proceed",
          "Validation Error", this.dataService.getAlertTimeOut()
        );
      }
    } else {
      this.dataService.showInfo("Nothing to save", "");
    }
  }

  formatDate(date) {
    if (typeof date === "string") {
      date = parseInt(date);
    }

    let fixDate = date;

    let obj = new Date(fixDate);

    let formattedDate =
      (obj.getDate().toLocaleString(undefined, { minimumIntegerDigits: 2 })) +
      "/" +
      ((obj.getMonth() + 1).toLocaleString(undefined, { minimumIntegerDigits: 2 })) +
      "/" +
      obj.getFullYear();
    return formattedDate;
  }

  // getBlobURL(relativePath) {
  //   const fileName = relativePath.substring(
  //     relativePath.lastIndexOf("/"),
  //     relativePath.length
  //   );

  //   let data = {
  //     container: "preprocessor",
  //     blobName: fileName,
  //     fullPath: relativePath,
  //     storageType: "azure",
  //   };

  //   return this.dataService.getBlobURL(data);
  // }

  deleteQuery(queryId) {
    if (queryId) {
      this.dataService
        .deleteQueryForResult(this.docIdentifier, queryId)
        .subscribe(
          (res) => {
            if (res && res.responseCode === "OK") {
              this.dataService.showSuccess(
                "Query deleted successfully",
                "Success", this.dataService.getAlertTimeOut()
              );
              this.submitted.emit({ submitted: true });
            } else {
              this.dataService.showError(
                "Unable to delete the query. This document was not found in the workflow application.",
                "Error", this.dataService.getAlertTimeOut()
              );
            }
          },
          (err) => {
            this.dataService.showError(
              "Error while deleting query, please try again later",
              "Error", this.dataService.getAlertTimeOut()
            );
          }
        );
    }
  }

  confirmDeleteQuery(queryId) {
    const modalRef = this.modalService.open(DeleteAlertComponent, {
      size: "sm",
      centered: true,
    });

    modalRef.componentInstance.id = queryId;

    // modalRef.componentInstance.message =
    //   "Are ";

    modalRef.componentInstance.item = "Query";

    modalRef.componentInstance.submitData.subscribe((res) => {
      if (res) {
        this.deleteQuery(queryId);
      }
    });
  }

  showView(field) {
    if (field && field.status)
      return this.dataService.allowReviewView(field);
    else return false;
  }

  refreshPage() {
    this.submitted.emit({ submitted: true });
  }

  changeSelect() {
    this.resultBasicInfo.forEach(element => {
      this.fieldIds = this.fieldIds.filter((key) => { return key.toLowerCase() != element.fieldId.toLowerCase() })
    });
    this.isSelect = true
    this.isInputSelect = false
  }

  addNewField(event) {
    if (event.target.value == 'addCustomField') {
      this.isInputSelect = true
      this.isSelect = false
    } else {
      this.isSelect = false
      this.isInputSelect = false
      let blankObject;

      if (this.resultBasicInfo && this.resultBasicInfo.length > 0) {
        blankObject = JSON.parse(
          JSON.stringify(this.resultBasicInfo[0])
        );
      }
      else {
        blankObject = JSON.parse(
          JSON.stringify({})
        );
      }

      blankObject.fieldId = event.target.value;
      blankObject.fieldValue = blankObject.editField = '';
      blankObject.confidence = 0;
      blankObject.boundingBox = { left: 0, right: 1, top: 0, bottom: 1 };
      blankObject.vendorMasterdata = 0;
      if (blankObject.correctedBoundingBox) {
        delete blankObject.correctedBoundingBox;
      }
      if (blankObject.selectedLines) {
        delete blankObject.selectedLines;
      }
      blankObject.OCRConfidence = 0;
      if(this.searchAndSelect[blankObject.fieldId]) this.searchAndSelectConfig(blankObject)
      this.resultBasicInfo.push(blankObject);

      if (!this.fieldsData.some(e => e.fieldValue === event.target.value)) {
        this.fieldsData.push({
          fieldValue: event.target.value,
          fieldValueData: [],
          state: { focused: false, resetFieldValueData: false }
        })
      }
    }
  }

  addCustomField() {
    if (this.resultBasicInfo.filter((Obj) => {
      if (Obj.fieldId.toLowerCase() == this.addCustomFieldValue.toLowerCase()) {
        return Obj;
      }
    }).length > 0) {
      alert('With this name field already present.Please try with different name.')
    }
    else {
      if (this.addCustomFieldValue == '') {
        alert("Please type field name.")
        return;
      }
      this.isInputSelect = false
      this.isSelect = false

      let blankObject;
      if (this.resultBasicInfo && this.resultBasicInfo.length > 0) {
        blankObject = JSON.parse(
          JSON.stringify(this.resultBasicInfo[0])
        );
      }
      else {
        blankObject = JSON.parse(
          JSON.stringify({})
        );
      }

      blankObject.fieldId = this.addCustomFieldValue
      blankObject.fieldValue = blankObject.editField = ''
      blankObject.confidence = 0
      blankObject.boundingBox = { left: 0, right: 1, top: 0, bottom: 1 }
      if (blankObject.correctedBoundingBox) {
        delete blankObject.correctedBoundingBox
      }
      if (blankObject.selectedLines) {
        delete blankObject.selectedLines
      }
      blankObject.OCRConfidence = 0;
      this.resultBasicInfo.push(blankObject);
      if (!this.fieldsData.some(e => e.fieldValue === this.addCustomFieldValue)) { // added to add PAS in custom field
        this.fieldsData.push({
          fieldValue: this.addCustomFieldValue,
          fieldValueData: [],
          state: { focused: false, resetFieldValueData: false }
        })
      }
      this.addCustomFieldValue = '';
    }
  }

  ngOnDestroy(): void {
    this.cleanIdleTimer();
  }

  //<=========================Reviewer Methods START===================================>
  // on click of Done&Next
  getNextDocumentForReviewer() {
    this.dataService.getSingleDocumentForReviewer().subscribe(res => {
      let onNextObj = { documentId: '', isNextDocAvailable: false }

      if (res && res.responseCode == 'OK' && res.result && res.result.length > 0) {

        let documentId = res.result[0].documentId;

        this.resetStatusToForReviewer(this.docIdentifier, 'REVIEW_COMPLETED');
        this.docIdentifier = documentId;
        onNextObj.documentId = documentId;
        onNextObj.isNextDocAvailable = true;
        //this.resetStatusToForReviewer(this.docIdentifier,'UNDER REVIEW');
      } else { // if no more documents found
        onNextObj.documentId = 'NoDoc';
        onNextObj.isNextDocAvailable = false;
      }
      this.onDoneAndNextClickForReviewer.emit(onNextObj);
    }, err => {
      console.error(err);
    })
  }

  resetStatusToForReviewer(documentId: string, lockStatus: string) {
    let payload;
    if (lockStatus == 'UNDER REVIEW') {
      payload = {
        documentId: documentId,
        document_review_status: lockStatus,
      };
    }
    else {
      payload = {
        documentId: documentId,
        status: 'REVIEW_COMPLETED',
        document_review_status: lockStatus
      };
    }
    this.dataService.updateDocumentData(payload).subscribe(
      res => {
        //console.log("document updated");
      },
      err => {
        console.error(err);
      }
    );
  }

  traceActivityForReviewer() {
    let timeoutIn = this.auth.getUserSettings('ACTIVITY_TIME_REVIEWER');
    this.idleTimerRef = new IdleTimer({
      timeout: timeoutIn, //expired after given seconds in config
      onTimeout: () => {
        this.openInActivityModel();

        this.autoClosePopupTimer = setInterval(() => {
          this.ticktickCounter += 1;

          //update closingIn value in every second
          if (this.autoPauseModalRef !== null && this.autoPauseModalRef._contentRef !== null) {
            if (this.autoPauseModalRef.componentInstance !== null) {
              this.autoPauseModalRef.componentInstance.closingIn -= 1;
            }
          }

          //close dialog in 10 seconds automatically if not pressed YES
          if (this.ticktickCounter == this.ALERT_DISSMISS_REVIEWER) {
            this.stopTracking();
            if (this.autoPauseModalRef) {
              this.autoPauseModalRef.close();
            }
            this.autoPausedForReviewer.emit(this.docIdentifier);
          }
        }, 1000)
      }
    });
  }

  stopTracking() {
    if (this.autoClosePopupTimer) {
      clearInterval(this.autoClosePopupTimer)
    }
  }

  createInsatnce() {
    this.autoPauseModalRef = this.modalService.open(DeleteAlertComponent, {
      windowClass: "delete-model",
      size: "sm",
      centered: true,
      backdrop: 'static',
      keyboard: false
    });
  }

  openInActivityModel() {
    this.createInsatnce();

    this.autoPauseModalRef.componentInstance.calledFrom = 'InActivity'
    this.autoPauseModalRef.componentInstance.action = 'No Activity';
    this.autoPauseModalRef.componentInstance.item = 'Traced';
    this.autoPauseModalRef.componentInstance.message = 'Are you still Reviewing?';
    this.autoPauseModalRef.componentInstance.closingIn = this.ALERT_DISSMISS_REVIEWER//10;

    this.autoPauseModalRef.componentInstance.submitData.subscribe((res) => {
      if (res) {
        // on click of YES
        this.stopTracking();
        this.idleTimerRef = null;
        this.ticktickCounter = 0;
        this.traceActivityForReviewer();
      }
    });
  }

  cleanIdleTimer() {
    if (this.isReviewer && this.idleTimerRef != null) {
      this.idleTimerRef.cleanUp();
      this.stopTracking();
      this.idleTimerRef = null;
      this.ticktickCounter = 0;
    }
  }

  //<=========================Reviewer Methods ENDS===================================>

}
