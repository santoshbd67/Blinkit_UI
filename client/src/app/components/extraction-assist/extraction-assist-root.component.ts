import { Component, OnInit, ViewChild } from "@angular/core";
import { DataService } from "src/app/services/data.service";
import { ActivatedRoute, Router } from "@angular/router";
import { AppConfig } from "src/app/config/app-config";
import { ToastrManager } from "ng6-toastr-notifications";
import { Location } from "@angular/common";
import { ExtractionAssistService } from "src/app/services/extraction-assist.service";
import { APIConfig } from 'src/app/config/api-config';
import { DeleteAlertComponent } from './../delete-alert/delete-alert.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: "app-extraction-assist-root",
  templateUrl: "./extraction-assist-root.component.html",
  styleUrls: ["./extraction-assist-root.component.scss"],
  host: {
    "(document:keyup)": "handleKeyboardEvent($event)"
  }
})
export class ExtractionAssistRootComponent implements OnInit {
  appConfig: any;
  apiConfig: any = APIConfig;

  IssueAction: string;
  pageSplit = [50, 50];
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
  pageCalledFor: any;
  isMasterdataValidated = false;
  //validate_btnText: string = 'VALIDATE';
  template_btnText: string = 'VALIDATE';
  score: number = 100;
  masterDataCreateStatus = false;
  isValidateBtnClicked = false;
  requiredObject_PathFinder;
  selectedfields;
  isResultValid = false;
  TemplateValidationResult = {
    Data: {
      field: '',
      currentState: {}
    },
    extractedValue: '',
    Confidence: 0
  }
  showApproveButton: boolean = false;
  ticketRaisedObj;
  linesVisibility = "invisible";
  setLineTextField;
  activeLineText: any;
  isRevertBtnClicked: boolean = false;
  splitSizes: any = { image: 50, invoice: 50 }
  confidenceThreshold: number;

  isPointAndShootActive: boolean;
  routeInputs;
  templatePagecalledFrom;
  vendorPagecalledFrom;

  constructor(
    private dataService: DataService,
    private modalService: NgbModal,
    private auth: AuthService,
    private extractionService: ExtractionAssistService,
    private activatedRoute: ActivatedRoute,
    public toastr: ToastrManager,
    private location: Location,
    private router: Router,
  ) {
    if (this.router.getCurrentNavigation().extras.state) {
      this.routeInputs = this.router.getCurrentNavigation().extras.state.calledFor;
      this.pageCalledFor = this.routeInputs.redirectTo;

      if (this.routeInputs.calledFrom == 'RULES') {
        this.templatePagecalledFrom = this.routeInputs.calledFrom;
      }

      if (this.routeInputs.calledFrom == 'ML_Identifier') {
        this.vendorPagecalledFrom = this.routeInputs.calledFrom;
      }
      console.log(this.routeInputs);
    }

    this.selectedfields = []

    if (!this.pageCalledFor) {
      this.pageCalledFor = localStorage.getItem('reviewPageCalledFor') ? localStorage.getItem('reviewPageCalledFor') : ''
    }

    if (!this.vendorPagecalledFrom) {
      this.vendorPagecalledFrom = localStorage.getItem('vendorPagecalledFrom') ? localStorage.getItem('vendorPagecalledFrom') : ''
    }

    if (!this.templatePagecalledFrom) {
      this.templatePagecalledFrom = localStorage.getItem('templatePagecalledFrom') ? localStorage.getItem('templatePagecalledFrom') : ''
    }
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
    window.onbeforeunload = () => this.ngOnDestroy();
    window.onhashchange = () => {
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
                this.dataService.showError(
                  "error while fetching invoice images",
                  "Error"
                );
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

  ngOnDestroy() {
    localStorage.setItem("reviewPageCalledFor", this.pageCalledFor);
  }

  closeMasterDataSuggestion() {
    this.selectedfields = []
    this.pageCalledFor = 'RuleCreation';
    this.isMasterdataValidated = false;
    this.score = 100;
    //this.location.go('extraction-assitance?docIdentifier=doc_1645717648459_bb9988a88b9');
  }

  closeMasterDataCreation() {
    this.pageCalledFor = 'masterdata-suggestion';
    this.isMasterdataValidated = false;
    this.score = 100;
    this.isResultValid = false;
    this.emptyRuleCreationData();
  }

  approveSuggestion(approved) {
    if (approved) {
      this.showApproveButton = true
    }
    else {
      this.showApproveButton = false//false // change to false later
    }
  }

  closeTemplate() {
    if (!this.requiredObject_PathFinder) {
      let storedObject = JSON.parse(localStorage.getItem("TemplateFields"));
      if (storedObject) {
        this.selectedfields = storedObject;
      }
    }
    else {
      this.selectedfields = this.requiredObject_PathFinder
    }
    this.pageCalledFor = 'RuleCreation';
    this.masterDataCreateStatus = true;
    this.dataService.hideHighligherDiv();
  }

  resetTemplateFields(fieldName) {
    let storedObject = JSON.parse(localStorage.getItem("TemplateFields"));
    if (storedObject) {
      storedObject.Fields = storedObject.Fields.filter(element => {
        return element.fieldId !== fieldName;
      });
      this.requiredObject_PathFinder = storedObject;
      localStorage.setItem("TemplateFields", JSON.stringify(storedObject));
      this.updateDocumentInfo(fieldName);

      if (storedObject.Fields.length == 0) {
        this.showRedirctionWarning();
      }
    }
  }

  showRedirctionWarning() {
    const modalRef = this.modalService.open(DeleteAlertComponent, {
      windowClass: "delete-model",
      size: "sm",
      centered: true,
    });
    modalRef.componentInstance.action = 'Redirecting';
    modalRef.componentInstance.item = 'to ExtractionAssist Screen';

    setTimeout(() => {
      this.router.navigate(["extraction-assist"], {});
      modalRef.close();
    }, 5000);

    modalRef.componentInstance.submitData.subscribe((res) => {
      if (res) {
        this.router.navigate(["extraction-assist"], {});
      }
    });
  }

  onRevertActionTaken(event) {
    this.isRevertBtnClicked = false;
  }

  callRevertButton() {
    this.isRevertBtnClicked = true;
  }

  updateDocumentInfo(fieldName) {
    if (this.documentResult && this.documentResult.document) {
      if (this.documentResult.document.documentInfo && this.documentResult.document.documentInfo.length) {

        this.documentResult.document.documentInfo = this.documentResult.document.documentInfo.filter(each => {
          return each.fieldId !== fieldName;

        })
      }
    }
  }

  onActionCompleted(actionObj) {
    if (actionObj && actionObj.fieldsList) {
      actionObj.fieldsList.forEach(element => {
        //this.updateDocumentInfo(element);
        this.resetTemplateFields(element);
      });
    }
  }

  // on click of Proceed Button
  openMasterDataSuggestion() {
    this.dataService.hideCroppedImageContainer();
    this.dataService.setImageScrollToTop();
    this.pageCalledFor = 'masterdata-suggestion';
    this.dataService.hideHighligherDiv();
  }

  openMasterDataComponent() {
    this.pageCalledFor = 'masterdata-creation';
  }

  approveMasterdata() {
    this.masterDataCreateStatus = true;
    this.selectedfields = [];
    this.pageCalledFor = 'RuleCreation';
  }

  setObject_PathFinder(object) {
    this.requiredObject_PathFinder = object;
  }

  openTemplateCreationPage() {
    if (this.requiredObject_PathFinder && this.requiredObject_PathFinder.Fields && this.requiredObject_PathFinder.Fields.length > 0) {
      this.dataService.setImageScrollToTop();
      this.dataService.hideCroppedImageContainer();
      this.dataService.hideHighligherDiv();
      this.pageCalledFor = 'template-creation';
      localStorage.setItem("TemplateFields", JSON.stringify(this.requiredObject_PathFinder));
    }
    else {
      this.dataService.showInfo("At least one field must be selected", "Data Required!");
    }
  }

  onToggleSaveBtn(message) {
    if (message === 'Hide') {
      this.isResultValid = false;
    }
  }

  emptyRuleCreationData() {
    this.extractionService.ruleCreationData.vendorName = '';
    this.extractionService.ruleCreationData.identifiertext = '';
  }

  getData() {
    let data = {
      vendor_name: this.extractionService.ruleCreationData.vendorName,
      identifier_text: this.extractionService.ruleCreationData.identifiertext,
      document_id: this.docIdentifier
    }
    return data;
  }

  doubleCheckData() {
    if (this.extractionService.ruleCreationData.vendorName.trim() == '' || this.extractionService.ruleCreationData.identifiertext.trim() == '') {
      this.dataService.showInfo("Enter data for all the inputs and then try again.", "Data Required!");
      return false;
    }
    if ((this.extractionService.ruleCreationData.identifiertext.match(/ /g) || []).length < 9) {
      //alert("At least 10 space seprated words should be entered in the Identifier Text field")
      return false;
    }
    return true;
  }

  validateMasterdata() {
    if (this.doubleCheckData()) {
      if (!this.isMasterdataValidated) {
        this.isMasterdataValidated = true;

        this.extractionService.validateMasterData(this.getData()).subscribe(res => {

          if (res && res.responseCode == "OK" && res.result.message) {
            this.extractionService.masterDataValidateResult.next(res.result);
            //alert(res.result.validate_result);
            if (res.result.validate_result === 'VALID') {
              this.isResultValid = true;
            }
            else {
              this.isResultValid = false;
            }
          }
          else {
            this.isResultValid = false;
            this.extractionService.masterDataValidateResult.next({ message: 'Server error. Please try again', score: 0, validate_result: 'INVALID' })
          }
          this.isMasterdataValidated = false;
        },
          err => {
            this.isResultValid = false;
            console.error("error while validating masterdata", err);
          })
      }
    }
  }

  saveMasterData() {
    if (this.doubleCheckData()) {
      this.extractionService.createMasterData(this.getData()).subscribe(
        res => {
          if (res && res.responseCode == "OK" && res.result.master_data && res.result.master_data.VENDOR_ID) {
            this.dataService.showSuccess("Masterdata Created successfully", "Success!!");
            this.selectedfields = [];
            this.pageCalledFor = 'RuleCreation';
            this.masterDataCreateStatus = true;

            // call RefreshFormat API
            this.UpdateFormat(res.result.master_data.VENDOR_ID);
          }
          else {
            this.dataService.showError("Masterdata could not created", "Failed!!");
          }
          this.isMasterdataValidated = false;
        },
        err => {
          console.error("error while saving masterdata", err);
        }
      )
    }
  }

  updateVendorIds(vendorId) {
    this.extractionService.updateVendorIds(vendorId).subscribe((res) => {
      if (res && res.responseCode == "OK" && res.result) {
        console.log('Total number of vendorIds updated in Collections:-' + res.result);
      }
    })
  }

  deleteMasterdata() {
    if (localStorage.getItem("MLID_Data")) {
      let dataToBeDeleted = JSON.parse(localStorage.getItem("MLID_Data"));
      console.log(dataToBeDeleted);

      if (dataToBeDeleted && dataToBeDeleted.VENDOR_ID && dataToBeDeleted.VENDOR_NAME) {
        this.extractionService.deleteVendorMasterdata(dataToBeDeleted).subscribe((res) => {
          if (res && res.responseCode == "OK" && res.result && res.result.status == 'Success') {
            this.dataService.showSuccess("Vendor Masterdata deleted successfully", "Success");
            this.location.back();
            //TODO delete vendorId from metadata and result collection
            this.updateVendorIds(dataToBeDeleted.VENDOR_ID);
          }
        }, err => {
          this.dataService.showInfo("Unable to delete Masterdata", "Internal_Server_Error")
          console.error(err);
        })
      }
    }
    else {
      this.dataService.showInfo("Unable to delete Masterdata", "DataParse_Error")
      console.log(localStorage.getItem("MLID_Data"));
    }
  }

  UpdateFormat(updatedVendorId) {
    let updatedList = [];
    updatedList.push({ "documentId": this.docIdentifier, "VendorId": updatedVendorId })

    this.extractionService.updateUnknownDocuments([this.docIdentifier], updatedList).subscribe((res) => {
      if (res && res.responseCode === 'OK' && res.result && res.result.ok == 1 && res.result.nModified) {
        // update localStorage
        this.requiredObject_PathFinder.Format = updatedVendorId;
        localStorage.setItem("TemplateFields", JSON.stringify(this.requiredObject_PathFinder));
      }
    })
  }

  openAlertModel(calledFor) {
    const modalRef = this.modalService.open(DeleteAlertComponent, {
      windowClass: "delete-model",
      size: "lg",
      centered: true,
    });
    //modalRef.componentInstance.id = docId;

    if (calledFor == '1') {
      modalRef.componentInstance.action = 'Raise';
      modalRef.componentInstance.item = 'Ticket';
    }
    else if (calledFor == '2') { // delete VendorMasterData
      modalRef.componentInstance.action = 'DELETE';
      modalRef.componentInstance.item = 'MASTERDATA';
    }
    else if (calledFor == '3') {
      modalRef.componentInstance.action = 'CLOSE';
      modalRef.componentInstance.item = '';
    }
    else if (calledFor == '4') { // delete Rules
      modalRef.componentInstance.action = 'DELETE';
      modalRef.componentInstance.item = '';
    }

    modalRef.componentInstance.ticketInfo = {
      VendorId: this.extractionService.pathFinderData.VendorId,
      FieldName: this.extractionService.pathFinderData.SelectedField,
      DocumentId: this.docIdentifier
    }
    modalRef.componentInstance.submitData.subscribe((res) => {
      if (res) {
        console.log('list delete-->', res);
        this.onRaiseTicketOrMarkAsDone(calledFor);
      }
    });
  }

  onRaiseTicketOrMarkAsDone(calledFor) {

    let payload = {
      emailId: this.auth.getUserSettings('RAISE_TICKET_EMAIL'),
      document_ids: this.docIdentifier,
      vendor_Id: this.extractionService.pathFinderData.VendorId,
      fieldNames: this.extractionService.pathFinderData.SelectedField
    }

    if (calledFor == '1') {
      this.extractionService.raiseTicketSendEmail(payload).subscribe(res => {
        if (res && res.responseCode == 'OK') {

          // update those dos which have 
          this.ticketRaisedObj = payload;
          let docPayload = { format: payload.vendor_Id, selectedFieldIds: [payload.fieldNames], action: '1' }
          this.extractionService.updateDocsForSelectedVendor(docPayload).subscribe(res => {
            this.resetTemplateFields(payload.fieldNames);
          }, err => {
            console.log(err);
          })

          this.dataService.showSuccess('We have received your Ticket. We will get in touch with you at your registered Email Id.', 'Success', this.dataService.getAlertTimeOut());
        }
        else {
          this.dataService.showError('Sorry, Ticket could not be raised. Please try after sometime', 'Try Again', this.dataService.getAlertTimeOut());
        }
      }, err => {
        this.dataService.showError('Sorry, Ticket could not be raised. Please try after sometime', 'Error', this.dataService.getAlertTimeOut());
        console.error('Server error', err);
      })
    }
    else if (calledFor == '2') { // Delete Masterdata
      this.deleteMasterdata();
    }
    else if (calledFor == '3') {
      this.ticketRaisedObj = payload;
      let docPayload = { format: payload.vendor_Id, selectedFieldIds: [payload.fieldNames], action: '3' }
      this.extractionService.updateDocsForSelectedVendor(docPayload).subscribe(res => {
        this.dataService.showSuccess('The field has been removed from EA queue.', 'Success', this.dataService.getAlertTimeOut());

        this.resetTemplateFields(payload.fieldNames);
      }, err => {
        console.log(err);
        this.dataService.showError('Sorry, Field could not be Updated. Please try after sometime', 'Error', this.dataService.getAlertTimeOut());
      })
    }
    else if (calledFor == '4') { // DELETE WHEN CAME FROM RULES TAB
      let docPayload = {
        vendor_name: this.extractionService.pathFinderData.VendorId,
        vendor_id: this.extractionService.pathFinderData.VendorId,
        field_name: this.extractionService.pathFinderData.SelectedField
      }
      this.ticketRaisedObj = payload;
      this.extractionService.deleteTemplate(docPayload).subscribe(res => {
        console.log(res);
        if (res && res.responseCode == 'OK' && res.result && res.result.status == 'Success') {
          this.dataService.showSuccess('The template has been removed from Rules Tab.', 'Success', this.dataService.getAlertTimeOut());
        }
        else {
          this.dataService.showError('Sorry, template could not be deleted. Please try after sometime', 'Error', this.dataService.getAlertTimeOut());
        }
        this.resetTemplateFields(payload.fieldNames);
      }, err => {
        console.log("Error in onRaiseTicketOrMarkAsDone method when deleting Template");
        console.log(err);
        this.dataService.showError('Sorry, template could not be deleted. Please try after sometime', 'Error', this.dataService.getAlertTimeOut());
      })

    }
  }

  validateFields(data) {
    if (!data || data.templateType == undefined) {
      return false;
    }
    switch (data.templateType) {
      case 1:
      case "1": //static
        if (data.fieldValue == "") {
          return false;
        }

      case 2:
      case "2": // single level
        if (data.fieldShape == "" || data.fieldLocation == "" ||
          data.fieldLabel == "" || data.fieldLabelPosition == "" ||
          data.fieldDefaultValue_1 == "") {
          return false;
        }

      case 3:
      case "3": // anchor level
        if (data.fieldShape == "" ||
          data.fieldHorzAnchor == "" || data.field_Location == "" ||
          data.fieldVertAnchor == "" || data.fieldLocation_3 == "" ||
          data.fieldDefaultValue_3 == "") {
          return false;
        }

      case 4:
      case "4": // bounding box
        if (data.fieldIncludeBottom == "" || data.fieldBottom == "" ||
          data.fieldIncludeTop == "" || data.fieldTop == "" ||
          data.fieldLeft == "" || data.fieldRight == "" ||
          data.fieldPageIdentifier == "" || data.fieldDefaultValue_2 == "") {
          return false;
        }
    }

    return true;
  }

  onSubmitTemplate() {
    if (this.template_btnText == 'VALIDATE') {

      let pathFinderFormData: any = this.extractionService.pathFinderData.FormData;
      //console.log(pathFinderFormData);

      if (!this.validateFields(pathFinderFormData)) {
        this.dataService.showInfo("Please fill all required fields", "Data Required!");
        return;
      }

      let templateData: any = this.prepareTemplateData(pathFinderFormData);

      this.extractionService.validateTemplate(templateData).subscribe(
        res => {
          if (res && res.responseCode == "OK" && res.result.responseCode == 200) {

            //this.template_btnText = "TEST";
            if (Object.keys(res.result.extracted_value).length === 0) {
              this.TemplateValidationResult.extractedValue = '';
              this.TemplateValidationResult.Confidence = 0;
            }
            else {
              this.TemplateValidationResult.extractedValue = res.result.extracted_value[this.extractionService.pathFinderData.SelectedField].text;
              this.TemplateValidationResult.Confidence = res.result.extracted_value[this.extractionService.pathFinderData.SelectedField].conf * 100;
              this.TemplateValidationResult.Data.field = templateData.template.field_name;
              this.TemplateValidationResult.Data.currentState = this.getCurrentState(pathFinderFormData);
            }
          }
          else {
            this.TemplateValidationResult.extractedValue = '';
            this.TemplateValidationResult.Confidence = 0;
          }
        },
        err => {
          console.error("error while validating Template.", err);
          this.dataService.showError("Template Validation Failed.", "Failed");
        }
      )
    }
    else {
      this.dataService.showInfo("Coming Soon", "TEST");
    }
  }

  getTemplateType(value) {
    let templateType = 'static';
    switch (value) {
      case '1': templateType = 'static';
        break;
      case '2': templateType = 'single_label';
        break;
      case '3': templateType = 'anchor_label';
        break;
      case '4': templateType = 'bounding_box_identifier';
        break;
    }
    return templateType;
  }

  prepareTemplateData(pathFinderFormData) {
    let data = {
      document_id: this.docIdentifier,
      vendor_id: this.extractionService.pathFinderData.VendorId,
      vendor_name: this.extractionService.pathFinderData.VendorId,
      template: {}
    }

    switch (pathFinderFormData.templateType) {
      case '1': // static
      case 1:
        data.template = { default_value: pathFinderFormData.fieldValue };
        break;

      case '2': //singleLabel
      case 2:
        data.template = {
          field_shape: pathFinderFormData.fieldShape,
          field_location: pathFinderFormData.fieldLocation,
          label: pathFinderFormData.fieldLabel,
          label_position: pathFinderFormData.fieldLabelPosition,
          default_value: pathFinderFormData.fieldDefaultValue_1,
          top_delimiter: pathFinderFormData.fieldTopDelimiter ? pathFinderFormData.fieldTopDelimiter : 'Not Applicable',
          bottom_delimiter: pathFinderFormData.fieldBottomDelimiter ? pathFinderFormData.fieldBottomDelimiter : 'Not Applicable'
        };
        break;

      case '3': //anchor_label
      case 3:
        data.template = {
          field_shape: pathFinderFormData.fieldShape,
          horizontal_anchor: pathFinderFormData.fieldHorzAnchor,
          horizontal_anchor_location: pathFinderFormData.field_Location,
          vertical_anchor: pathFinderFormData.fieldVertAnchor,
          vertical_anchor_location: pathFinderFormData.fieldLocation_3,
          default_value: pathFinderFormData.fieldDefaultValue_3,
          top_delimiter: pathFinderFormData.fieldTopDelimiter ? pathFinderFormData.fieldTopDelimiter : 'Not Applicable',
          bottom_delimiter: pathFinderFormData.fieldBottomDelimiter ? pathFinderFormData.fieldBottomDelimiter : 'Not Applicable'
        };
        break;

      case '4': // bounding_box_identifier
      case 4:
        data.template = {
          top: pathFinderFormData.fieldTop,
          include_top: pathFinderFormData.fieldIncludeTop,
          bottom: pathFinderFormData.fieldBottom,
          include_bottom: pathFinderFormData.fieldIncludeBottom,
          left: pathFinderFormData.fieldLeft,
          right: pathFinderFormData.fieldRight,
          page_identifier: pathFinderFormData.fieldPageIdentifier,
          default_value: pathFinderFormData.fieldDefaultValue_2,
          top_delimiter: pathFinderFormData.fieldTopDelimiter ? pathFinderFormData.fieldTopDelimiter : 'Not Applicable',
          bottom_delimiter: pathFinderFormData.fieldBottomDelimiter ? pathFinderFormData.fieldBottomDelimiter : 'Not Applicable'
        }
        break;
    }

    data.template["vendor_name"] = this.extractionService.pathFinderData.VendorId;
    data.template["vendor_id"] = this.extractionService.pathFinderData.VendorId;
    data.template["field_name"] = this.extractionService.pathFinderData.SelectedField;
    data.template["template_type"] = this.getTemplateType(pathFinderFormData.templateType);

    return data;
  }

  getCurrentState(pathFinderFormData) {
    let data = {
      fieldType: pathFinderFormData.fieldType,
      templateType: pathFinderFormData.templateType,
      actualData: { extracted_value: {} }
    }
    switch (pathFinderFormData.templateType) {
      case '1': // static
      case 1:
        data.actualData['default_value'] = pathFinderFormData.fieldValue
        break;

      case '2': //singleLabel
      case 2:
        data.actualData['field_shape'] = pathFinderFormData.fieldShape
        data.actualData['field_location'] = pathFinderFormData.fieldLocation
        data.actualData['label'] = pathFinderFormData.fieldLabel
        data.actualData['label_position'] = pathFinderFormData.fieldLabelPosition
        data.actualData['default_value'] = pathFinderFormData.fieldDefaultValue_1
        data.actualData['top_delimiter'] = pathFinderFormData.fieldTopDelimiter
        data.actualData['bottom_delimiter'] = pathFinderFormData.fieldBottomDelimiter
        break;

      case '3': //anchor_label
      case 3:
        data.actualData['field_shape'] = pathFinderFormData.fieldShape
        data.actualData['horizontal_anchor'] = pathFinderFormData.fieldHorzAnchor
        data.actualData['horizontal_anchor_location'] = pathFinderFormData.field_Location
        data.actualData['vertical_anchor'] = pathFinderFormData.fieldVertAnchor
        data.actualData['vertical_anchor_location'] = pathFinderFormData.fieldLocation_3
        data.actualData['default_value'] = pathFinderFormData.fieldDefaultValue_3
        data.actualData['top_delimiter'] = pathFinderFormData.fieldTopDelimiter
        data.actualData['bottom_delimiter'] = pathFinderFormData.fieldBottomDelimiter

        break;

      case '4': // bounding_box_identifier
      case 4:
        data.actualData['top'] = pathFinderFormData.fieldTop
        data.actualData['include_top'] = pathFinderFormData.fieldIncludeTop
        data.actualData['bottom'] = pathFinderFormData.fieldBottom
        data.actualData['include_bottom'] = pathFinderFormData.fieldIncludeBottom
        data.actualData['left'] = pathFinderFormData.fieldLeft
        data.actualData['right'] = pathFinderFormData.fieldRight
        data.actualData['page_identifier'] = pathFinderFormData.fieldPageIdentifier
        data.actualData['default_value'] = pathFinderFormData.fieldDefaultValue_2
        data.actualData['top_delimiter'] = pathFinderFormData.fieldTopDelimiter
        data.actualData['bottom_delimiter'] = pathFinderFormData.fieldBottomDelimiter
        break;
    }
    data.actualData.extracted_value['text'] = this.TemplateValidationResult.extractedValue
    data.actualData.extracted_value['final_confidence_score'] = this.TemplateValidationResult.Confidence

    return data;
  }

  getRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = ' ';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
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
          this.aggregateStats();
        }
      },
      err => {
        // this.dataService.showError("error loading the document", "Error");
        console.log("err", err);
      }
    );
  }

  closeToast() {
    this.show = false;
  }

  openToast(status?) {
    if (status) {
      this.action = "submit" + this.dataService.generateTimestamp();
    } else {
      this.action = "save" + this.dataService.generateTimestamp();
    }

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
  }

  drawBoundingBoxOverImage(data) {
    this.boundingBoxData = data;
  }

  goBack() {
    this.location.back();
  }

  closePreview(id) {
    document.getElementById(id).style.display = "none";
    this.dataService.hideHighligherDiv();
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

  //<==================== point and shoot for Extraction assist =========================>

  setLineText(event) {
    this.setLineTextField = event;
  }

  activeSelectedLineText(data) {
    if (data)
      this.isPointAndShootActive = true
    else
      this.isPointAndShootActive = false
    this.dataService.hideCroppedImageContainer();
    this.linesVisibility = localStorage.getItem("extractedLines");
    this.activeLineText = data;
  }

  onFooterClick() {
    this.activeSelectedLineText(false);
    localStorage.setItem("extractedLines", "invisible");
  }
}
