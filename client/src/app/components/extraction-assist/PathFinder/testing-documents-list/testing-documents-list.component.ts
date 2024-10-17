import { Component, EventEmitter, Input, OnInit, Output, OnChanges } from '@angular/core';
import { ExtractionAssistService } from 'src/app/services/extraction-assist.service';
import { AppConfig } from './../../../../config/app-config';
import { DataService } from './../../../../services/data.service';
import { DeleteAlertComponent } from 'src/app/components/delete-alert/delete-alert.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Router } from '@angular/router';

@Component({
  selector: 'app-testing-documents-list',
  templateUrl: './testing-documents-list.component.html',
  styleUrls: ['./testing-documents-list.component.scss']
})
export class TestingDocumentsListComponent implements OnInit, OnChanges {

  @Input() dataset: any;
  @Input() itemsCount: number = 0;
  @Input() selectedFilters: any;
  @Input() fieldsDataWithState: any;
  @Input() actionDataInfo: any;

  @Output() currentPage = new EventEmitter();
  @Output() refresh = new EventEmitter();
  @Output() delete = new EventEmitter();
  @Output() extractedAll = new EventEmitter();
  @Output() public openOutput = new EventEmitter();
  @Output() columnSelected = new EventEmitter();
  @Output() actionCompleted = new EventEmitter();

  appConfig = AppConfig;
  itemsPerPage: number = 12;
  pageNumber: number = 1;
  //selectedItem;
  filterParam: string;
  selectAll: boolean = false;
  multipleSelect: boolean = false;
  currentIndex: number = 0;
  selectedColumnData = [];

  imgSrc: any = { forwardIcon: "../../../assets/images/icons8-forward-button-24.png" };
  documentId: any;
  colorsList = ['#EBF5FB', '#FEF5E7', '#E9F7EF', '#F9EBEA', '#F5EEF8'];
  vendors = [];
  colorForUnknown = 'rgb(247 247 247)';

  avilableDocList = [];
  format: string;
  selectedFields: any;
  isViewClicked: boolean = false;
  docInfo: any;
  isChecked: boolean = false;

  constructor(
    private dataService: DataService, private modalService: NgbModal, private router: Router,
    private extractionService: ExtractionAssistService) { }

  ngOnChanges(change) {
    if (change.actionDataInfo.currentValue) {
      this.updateAvilableDocList(change.actionDataInfo.currentValue.fieldsList);
    }
  }

  ngOnInit() {
    let storedObject = JSON.parse(localStorage.getItem("TemplateFields"));
    if (storedObject) {
      this.format = storedObject.Format;
      this.selectedFields = storedObject.Fields;
    }

    this.extractionService.getDocumentsForTesting({ vendorId: this.format }).subscribe((res) => {
      if (res && res.responseCode == "OK" && res.result && res.result.IdDetailsList && res.result.docIdsList) {
        this.getTemplateValues(res.result.docIdsList, res.result.IdDetailsList);
      }
    }, (err) => {
      console.log(err);
    })
  }

  getTemplateValues(docIds, docDetailsList) {
    let reqObj = this.prepareTemplateData(docIds)

    this.extractionService.testTemplates(reqObj).subscribe((response) => {

      if (response && response.responseCode == "OK" && response.result && response.result.responseCode == 200 && response.result.extracted_value && response.result.extracted_value.length > 0) {
        response.result.extracted_value.forEach(element => {
          let obj = {};
          obj["DocumentId"] = element.document_id;
          obj["FileName"] = this.getFileName(docDetailsList, element.document_id);
          obj["Queue"] = this.getQueueName(docDetailsList, element.document_id);
          obj["Format"] = this.format;

          element.list_extracted_fields.forEach(fields => {
            obj[fields.field_name] = fields.text;
          });
          this.avilableDocList.push(obj);
        });
      }

    }, (error) => {
      console.error(error);
      this.dataService.showError("Unbale to get documents", "Try Again")
    });
  }

  getQueueName(docDetailsList, docId) {
    let queue = 'processing..';
    let obj;
    if (docDetailsList && docDetailsList.length > 0) {
      obj = docDetailsList.find(e => e.documentId === docId);
    }
    if (obj) {
      return obj.Queue;
    }
    else {
      return queue;
    }
  }

  getFileName(docDetailsList, docId) {
    let fileName = 'doc_ab2.tif';
    let obj;
    if (docDetailsList && docDetailsList.length > 0) {
      obj = docDetailsList.find(e => e.documentId === docId);
    }
    if (obj) {
      return obj.fileName;
    }
    else {
      return fileName;
    }
  }

  updateAvilableDocList(fieldsList) {
    if (fieldsList) {
      fieldsList.forEach(element => {
        this.avilableDocList.forEach((doc) => {
          if (doc.hasOwnProperty(element)) {
            delete doc[element];
          }
        })
      });
      this.selectedColumnData = [];
      this.avilableDocList = JSON.parse(JSON.stringify(this.avilableDocList));
      this.actionCompleted.emit(false);


      if (Object.keys(this.avilableDocList[0]).length == 4) {
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
    }, 3000);

    modalRef.componentInstance.submitData.subscribe((res) => {
      if (res) {
        this.router.navigate(["extraction-assist"], {});
        modalRef.close();
      }
    });
  }

  prepareTemplateData(Ids) {
    let data = {
      list_document_id: Ids,
      vendor_id: this.extractionService.pathFinderData.VendorId,
      vendor_name: this.extractionService.pathFinderData.VendorId,
      list_template: []
    }

    if (this.fieldsDataWithState) {
      this.fieldsDataWithState.forEach(element => {
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

  getColor(vendorId: string) {
    let color: any;

    if (vendorId == 'UNKNOWN') {
      color = this.colorForUnknown;
    }
    else {
      if (this.vendors.find(e => e.vendorId === vendorId)) {
        color = this.vendors.find(e => e.vendorId === vendorId).color
      }
      else {
        color = this.colorsList[this.vendors.length % this.colorsList.length]
        this.vendors.push({
          vendorId: vendorId,
          color: this.colorsList[this.vendors.length % this.colorsList.length]
        })
      }
    }
    return color;
  }

  get showingItemCount() {
    let count =
      this.itemsCount - (this.pageNumber - 1) * this.itemsPerPage <
        this.itemsPerPage
        ? this.itemsCount
        : this.pageNumber * this.itemsPerPage;
    return count;
  }

  openDetailView(headerItem) {
    this.docInfo = headerItem;
    this.isViewClicked = true;
    this.getCurrentIndex(headerItem);
  }

  getCurrentIndex(headerItem) {
    this.currentIndex = this.avilableDocList.findIndex(x => x.DocumentId === headerItem.DocumentId);
  }

  closeDetailView() {
    this.isViewClicked = false;
  }

  selectColumn(columnName, event) {

    if (event.target.checked) {
      this.selectedColumnData.push({
        columnName: columnName
      })
    } else {
      //const index: number = this.totalSelectedCheckBox.indexOf(data);
      const index: number = this.selectedColumnData.findIndex(x => x.columnName === columnName);
      this.selectedColumnData.splice(index, 1)
    }

    let data = { columnNames: [], status: false }

    if (this.selectedColumnData.length > 0) {
      data.status = true
    }
    else {
      data.status = false
    }

    data.columnNames = this.selectedColumnData;
    this.columnSelected.emit(data);
  }
}
