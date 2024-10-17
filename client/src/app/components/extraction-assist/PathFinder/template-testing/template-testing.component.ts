import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { DataService } from './../../../../services/data.service';
import { ExtractionAssistService } from './../../../../services/extraction-assist.service';
import { APIConfig } from './../../../../config/api-config';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-template-testing',
  templateUrl: './template-testing.component.html',
  styleUrls: ['./template-testing.component.scss']
})
export class TemplateTestingComponent implements OnInit {
  @Output() close = new EventEmitter<string>();
  @Output() actionCompleted = new EventEmitter();
  @Input() fieldsDataWithState: any;

  public dialogWidth: string = '98%';
  public dialogHeight: string = '98%';
  public isShown: boolean = true;

  documents: any[];
  totalItems: number = 0;
  selectedFilters: any = {};
  currentViewType: string = "list";
  currentFilter: any = {};
  isDocsFetched = false;
  isAnyColumnSelected: boolean = false;

  fieldsData: any[];
  apiConfig: any = APIConfig;
  documentIds: string = '';
  actionDataInfo: any;

  display = "block";

  constructor(private dataService: DataService, private auth: AuthService, private extractionService: ExtractionAssistService) { }

  ngOnInit() {
    this.getDocument(1);
  }

  closeDialog() {
    this.close.emit('close');
  }

  getDocument(pageNumber?) {

    if (this.currentFilter && this.currentFilter.stp == "true") {
      this.currentFilter.stp = true;
    } else if (this.currentFilter && this.currentFilter.stp == "false") {
      this.currentFilter.stp = false;
    }

    if (!pageNumber) pageNumber = 1;
    this.currentFilter.calledFrom = 'extractionAssist';
    this.dataService.findDocument(this.currentFilter, pageNumber).subscribe(
      (res) => {
        if (res && res.result) {
          this.totalItems = res.result.count;
          if (res.result.documents) {
            this.documents = res.result.documents.sort((a, b) => { return a.vendorId.localeCompare(b.vendorId); });
            this.documents.forEach((element, index) => {
              // this.documentIds = this.documentIds.concat(element.documentId.toString() + ', ')
              if (this.documents.length - 1 == index) {
                this.documentIds = this.documentIds.concat(element.documentId.toString())
              } else {
                this.documentIds = this.documentIds.concat(element.documentId.toString() + ', ')
              }
            });

            this.isDocsFetched = true;
          } else {
            this.documents = [];
            this.isDocsFetched = true;
          }
        }
      },
      (err) => {
        this.isDocsFetched = true;
        this.documents = [];
        this.dataService.showError("Error while loading documents", "Error", 5000);
      }
    );
  }

  getPayloadForRaiseTicket() {
    let data = this.prepareTemplateData();
    let fieldNames = '';
    let fieldNamesList = [];
    data.list_template.forEach((element, index) => {
      // fieldNames = fieldNames.concat(element.field_name.toString() + ', ')
      if (data.list_template.length - 1 == index) {
        fieldNames = fieldNames.concat(element.field_name.toString())
      } else {
        fieldNames = fieldNames.concat(element.field_name.toString() + ', ')
      }
      fieldNamesList.push(element.field_name.toString());
    });
    let payload = {
      emailId: this.auth.getUserSettings('RAISE_TICKET_EMAIL'),
      document_ids: this.documentIds,
      vendor_Id: data.vendor_id,
      fieldNames: fieldNames,
      fieldNamesList
    }

    return payload;
  }

  raiseTicket() {
    let payload = this.getPayloadForRaiseTicket();
    this.extractionService.raiseTicketSendEmail(payload).subscribe(res => {
      if (res && res.responseCode == 'OK') {

        // update documents in db
        let docPayload = { format: payload.vendor_Id, selectedFieldIds: payload.fieldNamesList, action: '1' }
        this.extractionService.updateDocsForSelectedVendor(docPayload).subscribe(res => {
          this.nextAction(docPayload);
        }, err => {
          console.log(err);
        })

        this.dataService.showSuccess('We have received your Ticket. We will get in touch with you at your registered Email Id.', 'success', this.dataService.getAlertTimeOut());
      }
      else {
        this.dataService.showError('Sorry, Ticket could not be raised. Please try after sometime', 'Try Again', this.dataService.getAlertTimeOut());
      }
    }, err => {
      this.dataService.showError('Sorry, Ticket could not be raised. Please try after sometime', 'Error', this.dataService.getAlertTimeOut());
      console.error('Server error', err);
    })
  }

  nextAction(payload) {
    let obj = {};
    obj["action"] = payload.action == 1 ? "RaiseTicket" : "Approve";
    obj["fieldsList"] = payload.selectedFieldIds;
    obj["VendorId"] = payload.format;
    this.actionDataInfo = obj;
  }

  OnNextActionComplete(status) {
    this.isAnyColumnSelected = false;
    this.actionCompleted.emit(this.actionDataInfo);
  }

  insertTemplate() {
    this.extractionService.createTemplate(this.prepareTemplateData()).subscribe(
      res => {
        if (res && res.responseCode == "OK" && res.result && res.result.responseCode == 200) {

          // update documents in db
          let payload = this.getPayloadForRaiseTicket()
          let docPayload = { format: payload.vendor_Id, selectedFieldIds: payload.fieldNamesList, action: '2' }
          this.extractionService.updateDocsForSelectedVendor(docPayload).subscribe(res => {
            this.nextAction(docPayload);
          }, err => {
            console.log(err);
          })

          this.dataService.showSuccess("Template inserted successfully. Thanks for approving it.", "Success");
        }
        else {
          this.dataService.showError("Template could not inserted. Please try again", "Failed!!");
        }
      },
      err => {
        console.error("Template could not inserted. Please try again", err);
      }
    )

  }

  onColumnSelect(data) {
    this.fieldsData = this.fieldsDataWithState.filter((key) => { return data.columnNames.some(e => e.columnName === key.field) })
    this.prepareTemplateData()
    this.isAnyColumnSelected = data.status;
  }

  prepareTemplateData() {
    let data = {
      document_id: '5555',
      vendor_id: this.extractionService.pathFinderData.VendorId,
      vendor_name: this.extractionService.pathFinderData.VendorId,
      list_template: []
    }

    if (this.fieldsData) {
      this.fieldsData.forEach(element => {
        if (Object.keys(element.currentState).length !== 0 && Object.keys(element.currentState.actualData).length !== 0 && element.currentState.actualData.extracted_value != undefined) {
          data.list_template.push(this.getValidatedTemplates(element))
        }
      });
    }

    return data;
  }

  getValidatedTemplates(pathFinderFormData) {
    let data = pathFinderFormData.currentState.actualData
    let returnObj = {}
    switch (pathFinderFormData.currentState.templateType) {
      case '1': // static
        returnObj = { default_value: data.default_value };
        break;

      case '2': //singleLabel
        returnObj = {
          field_shape: data.field_shape,
          field_location: data.field_location,
          label: data.label,
          label_position: data.label_position,
          default_value: data.default_value ? data.default_value : 'NA',
          top_delimiter: data.top_delimiter ? data.top_delimiter : 'Not Applicable',
          bottom_delimiter: data.bottom_delimiter ? data.bottom_delimiter : 'Not Applicable'
        };
        break;

      case '3': //anchor_label
        returnObj = {
          field_shape: data.field_shape,
          horizontal_anchor: data.horizontal_anchor,
          horizontal_anchor_location: data.horizontal_anchor_location,
          vertical_anchor: data.vertical_anchor,
          vertical_anchor_location: data.vertical_anchor_location,
          default_value: data.default_value ? data.default_value : 'NA',
          top_delimiter: data.top_delimiter ? data.top_delimiter : 'Not Applicable',
          bottom_delimiter: data.bottom_delimiter ? data.bottom_delimiter : 'Not Applicable'
        };
        break;

      case '4': // bounding_box_identifier
        returnObj = {
          top: data.top,
          include_top: data.include_top,
          bottom: data.bottom,
          include_bottom: data.include_bottom,
          left: data.left,
          right: data.right,
          page_identifier: data.page_identifier,
          default_value: data.default_value ? data.default_value : 'NA',
          top_delimiter: data.top_delimiter ? data.top_delimiter : 'Not Applicable',
          bottom_delimiter: data.bottom_delimiter ? data.bottom_delimiter : 'Not Applicable'
        }
        break;
    }

    returnObj["vendor_name"] = this.extractionService.pathFinderData.VendorId;
    returnObj["vendor_id"] = this.extractionService.pathFinderData.VendorId;
    returnObj["field_name"] = pathFinderFormData.field;//this.extractionService.pathFinderData.SelectedField;
    returnObj["template_type"] = this.getTemplateType(pathFinderFormData.currentState.templateType);

    return returnObj;
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

  onCloseHandled() {
    this.display = 'none';
    this.closeDialog();
  }
}
