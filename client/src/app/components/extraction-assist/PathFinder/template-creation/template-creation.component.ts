import { Component, EventEmitter, Input, OnInit, Output, ViewChild, OnChanges } from '@angular/core';
import { NgForm } from '@angular/forms';
import { DataService } from 'src/app/services/data.service';
import { ExtractionAssistService } from './../../../../services/extraction-assist.service';
import { InfoDialogComponent } from './../../../info-dialog/info-dialog.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { filter } from 'rxjs/operators';
import { Location } from "@angular/common";

@Component({
  selector: 'app-template-creation',
  templateUrl: './template-creation.component.html',
  styleUrls: ['./template-creation.component.scss']
})
export class TemplateCreationComponent implements OnInit, OnChanges {

  @ViewChild('pathFinderForm') public pathFinderForm: NgForm;

  @Input() requiredObject_PathFinder: any;
  @Input() Validate_Result: any;
  @Input() documentId: string;
  @Input() TicketRaised: any;
  @Input() templatePagecalledFrom: any;
  @Output() closeTemplate = new EventEmitter();
  @Output() actionCompleted = new EventEmitter();
  @Input() setLineTextField: any;
  @Input() revertClicked: boolean;
  @Output() revertActionTaken = new EventEmitter();
  @Output() activeSelectedLineText = new EventEmitter();
  @Output() onTabActive = new EventEmitter();
  selectedFormField: any;
  pointAndShootFields = [
    'fieldValue',
    'fieldTop',
    'fieldLabel',
    'fieldHorzAnchor',
    'fieldBottom',
    'fieldVertAnchor',
    'fieldLeft',
    'fieldRight',
    'fieldDefaultValue_1',
    'fieldPageIdentifier',
    'fieldDefaultValue_2',
    'fieldDefaultValue_3',
    'fieldTopDelimiter',
    'fieldBottomDelimiter'
  ];

  linesVisibility: string;
  confidenceThreshold: number = 60;
  templateOptions: any[] = [];
  selectedTemplate: any = 1;

  fieldTypeOptions: any[] = [
    { id: 1, name: 'Single Token' },
    { id: 2, name: 'Multi Token' },
  ];
  selectedFieldType: number = 1;

  selectedFields: any;
  format: string;
  selectedTab: string;

  fieldsDataWithState = [];
  currentStateOfField: {};
  previoustab: string;

  isTestingBtnClicked = false;
  isLoading = false;
  fieldsDataForTestState = [];
  fieldNamesList = [];
  fieldsData = [];

  constructor(private extractionService: ExtractionAssistService,
    private modalService: NgbModal,
    private dataService: DataService,
    private location: Location) { }

  ngOnInit() {
    let storedObject = JSON.parse(localStorage.getItem("TemplateFields"));

    this.fieldsData.push({
      fieldValue: 'fieldValue',
      fieldValueData: [],
      state: { focused: false, resetFieldValueData: false }
    })

    if (storedObject) {
      this.format = storedObject.Format;
      this.selectedFields = storedObject.Fields;

      this.selectedFields.forEach(element => {
        this.fieldNamesList.push(element.fieldId)
      });

      this.selectedTab = this.selectedFields[0].fieldId;
      this.setAllTemplateTypes();
      this.setPathFinderObject();
      this.getPathFinderTemplates();
      this.setCurrentStateOfField();
      this.getCurrentSelectedTab(this.selectedTab);
    }
    else {
      this.dataService.showError("Please go back to previous page then come again", "Reload Page")
    }
  }

  ngOnChanges(changeObject) {
    if (changeObject && changeObject.TicketRaised && changeObject.TicketRaised.currentValue) {
      this.removeField(this.TicketRaised.fieldNames);
      this.resetTemplateFields(this.TicketRaised.fieldNames);
    }
    if (changeObject && changeObject.setLineTextField && !changeObject.setLineTextField.firstChange && changeObject.setLineTextField.currentValue) {
      this.pathFinderForm.controls[this.selectedFormField].setValue(this.setLineTextField.selectedboxObj.line_text)
      this.extractionService.pathFinderData.FormData = this.pathFinderForm.value;
      this.fieldsData.forEach(fieldData => {
        if (fieldData.fieldValue == this.selectedFormField) {
          if (!this.pathFinderForm.controls[this.selectedFormField].value) {
            fieldData.fieldValueData = []
          }
          this.updateElementData(fieldData, this.setLineTextField) // TODO multi line select PAS 29-09-2022
        }
      });
    }
    if (changeObject && changeObject.revertClicked && changeObject.revertClicked.currentValue) {
      this.revertField();
    }
  }

  //for muti-line selection in PAS
  updateElementData(fieldData, objectInfo) {
    if (!fieldData.fieldValueData.some(e => e._id === objectInfo.selectedboxObj.ID)) {

      fieldData.fieldValueData.push({
        _id: objectInfo.selectedboxObj.ID,
        fieldValue: objectInfo.selectedboxObj.fieldValue,
        lineNum: objectInfo.selectedboxObj.line_num,
        pageNum: objectInfo.selectedboxObj.page_num,
        // boundingBox: objectInfo.selectedboxObj.boundingBox
      })
    }
    else {
      const index: number = fieldData.fieldValueData.findIndex(x => x.fieldValue === objectInfo.selectedboxObj.fieldValue);
      fieldData.fieldValueData.splice(index, 1)
    }
    let foamValue = '';
    let text_Seprator = " ";
    fieldData.fieldValueData.sort((a, b) => { return a.lineNum - b.lineNum });
    fieldData.fieldValueData.sort((a, b) => { return a.pageNum - b.pageNum });
    fieldData.fieldValueData.forEach(elementFieldValueData => { foamValue = foamValue ? (foamValue + text_Seprator + elementFieldValueData.fieldValue) : (foamValue + elementFieldValueData.fieldValue) });
    this.pathFinderForm.controls[this.selectedFormField].setValue(foamValue)
    this.extractionService.pathFinderData.FormData = this.pathFinderForm.value;
  }

  setFieldData(event) {
    this.selectedFormField = event && event.target.name;
    if (this.pointAndShootFields.includes(this.selectedFormField)) {
      localStorage.setItem("extractedLines", "visible");
      this.activeSelectedLineText.emit(true)
    } else {
      this.hideExtractedLines();
    }
  }

  hideExtractedLines() {
    this.activeSelectedLineText.emit(false)
    localStorage.setItem("extractedLines", "invisible");
  }

  resetTemplateFields(fieldName) {
    let storedObject = JSON.parse(localStorage.getItem("TemplateFields"));
    if (storedObject) {
      storedObject.Fields = storedObject.Fields.filter(element => {
        return element.fieldId !== fieldName;
      });

      localStorage.setItem("TemplateFields", JSON.stringify(storedObject));
    }
  }

  onActionCompleted(actionObj) {
    if (actionObj && actionObj.fieldsList) {
      actionObj.fieldsList.forEach(element => {
        this.removeField(element, 'Testing');
        //this.resetTemplateFields(element);
      });
      this.actionCompleted.emit(actionObj);
    }
  }

  ngAfterContentInit() {
    this.onFocusOutEvent(this.pathFinderForm);
  }

  setAllTemplateTypes() {
    this.templateOptions = [
      { id: 1, name: 'Static' },
      { id: 2, name: 'Single Label' },
      { id: 3, name: 'Anchor Label' },
      { id: 4, name: 'Bounding Box Identifier' }
    ];
  }

  setPathFinderObject() {
    this.extractionService.pathFinderData.SelectedField = this.selectedTab;
    this.extractionService.pathFinderData.VendorId = this.format;
  }

  getPathFinderTemplates() {
    let fieldNamesList = [];

    this.selectedFields.map((field) => {
      fieldNamesList.push(field.fieldId)
    });

    let data = {
      document_id: this.documentId,
      vendor_id: this.format,
      vendor_name: this.format,
      list_fields: fieldNamesList
    }

    this.extractionService.getTemplates(data).subscribe(res => {

      if (res && res.responseCode == 'OK' && res.result && res.result.status == "Success" && res.result.templates.length > 0) {
        fieldNamesList.forEach(element => {

          let currentState = { fieldType: '1', templateType: '1', actualData: {} }

          res.result.templates.map((template) => {
            if (template.field_name == element) {
              currentState.fieldType = template.field_type == 'MULTI_TOKEN' ? '2' : '1';
              currentState.templateType = this.getTemplateType(template.template_type);
              currentState.actualData = template;

              if (!this.fieldNamesList.some(nameList => nameList === element)) {
                this.fieldNamesList.push(element)
              }
            }
          })

          this.fieldsDataWithState.push({
            field: element,
            currentState,
          })
        });
      }
      else {
        fieldNamesList.forEach(element => {
          let currentState = { fieldType: '1', templateType: '1', actualData: {} }
          this.fieldsDataWithState.push({
            field: element,
            currentState
          })
        });
      }
      this.setCurrentState();
    }, err => {
      console.error("error while fetching path finder data.", err);
    })
  }

  removeField(fieldId, calledFrom = '') {
    event.stopPropagation();

    if (this.selectedFields) {
      const index: number = this.fieldNamesList.findIndex(x => x === fieldId);
      this.fieldNamesList.splice(index, 1)

      this.selectedFields = this.selectedFields.filter((field) => {
        return field.fieldId !== fieldId;
      })
      if (calledFrom == 'Testing') {
        this.resetTemplateFields(fieldId);
      }
      else {
        this.resetTemplateFields(this.selectedTab);
      }
      if (this.selectedFields.length > 0) {
        this.selectedTab = this.selectedFields[0].fieldId;
        //this.previoustab = this.selectedTab;
        this.setPathFinderObject();
        this.setCurrentState();
        this.getCurrentSelectedTab(this.selectedTab);
      }
      setTimeout(() => {
        this.onFocusOutEvent(this.pathFinderForm);
      }, 300);
    }
  }

  revertField() {
    let fieldNamesList = [];
    if (this.fieldsData.length > 0) {
      this.fieldsData[0].fieldValueData = []
    }
    fieldNamesList.push(this.selectedTab)
    let data = {
      document_id: this.documentId,
      vendor_id: this.format,
      vendor_name: this.format,
      list_fields: fieldNamesList
    }
    this.extractionService.getTemplates(data).subscribe(res => {
      this.revertActionTaken.emit('passed');
      if (res && res.responseCode == 'OK' && res.result && res.result.status == "Success" && res.result.templates.length > 0) {
        fieldNamesList.forEach(element => {
          this.fieldsDataWithState = this.fieldsDataWithState.filter((fieldObj) => {
            return fieldObj.field !== element
          })
          let currentState = { fieldType: '1', templateType: '1', actualData: {} }

          res.result.templates.map((template) => {
            if (template.field_name == element) {
              currentState.fieldType = template.field_type == 'MULTI_TOKEN' ? '2' : '1';
              currentState.templateType = this.getTemplateType(template.template_type);
              currentState.actualData = template;
            }
          })
          this.fieldsDataWithState.push({
            field: element,
            currentState,
          })
        });
        //this.dataService.showSuccess("Template restored successfully.", "Success");
      }
      else {
        fieldNamesList.forEach(element => {
          let currentState = { fieldType: '1', templateType: '1', actualData: {} }
          this.fieldsDataWithState.push({
            field: element,
            currentState
          })
        });
        //this.dataService.showSuccess("Template restored successfully.", "Success");
      }
      this.setCurrentState();
      setTimeout(() => {
        this.onFocusOutEvent(this.pathFinderForm);
      }, 100);
    }, err => {
      console.error("error while fetching path finder data.", err);
      this.revertActionTaken.emit('failed');
    })
  }

  getTemplateType(value) {
    let templateTypeId = '1';
    switch (value) {
      case 'static': templateTypeId = '1';
        break;
      case 'single_label': templateTypeId = '2';
        break;
      case 'anchor_label': templateTypeId = '3';
        break;
      case 'bounding_box_identifier': templateTypeId = '4';
        break;
    }
    return templateTypeId;
  }

  makeActive(tab: string) {
    this.previoustab = this.selectedTab;
    this.selectedTab = tab;
    this.setPathFinderObject();
    this.updateCurrentStateOfField();
    if (this.fieldsData.length > 0) {
      this.fieldsData[0].fieldValueData = []
    }
    this.setCurrentState();
    setTimeout(() => {
      this.onFocusOutEvent(this.pathFinderForm);
    }, 300);
    this.getCurrentSelectedTab(this.selectedTab);
  }

  getCurrentSelectedTab(tab: string) {
    if (this.selectedFields && this.selectedFields.length > 0) {
      let activeTab = this.selectedFields.filter((field) => {
        return field.fieldId == tab;
      })
      if (activeTab && activeTab.length > 0 && activeTab[0].correctedBoundingBox) {
        this.drawHighlighter(activeTab[0]);
      }
    }
  }

  drawHighlighter(activeTab) {
    const data = {
      fieldData: activeTab,
      event: undefined,
      shouldOpen: 'correctedBoundingBox'
    };
    this.onTabActive.emit(data);
  }

  setCurrentState() {
    this.fieldsDataWithState.filter((fieldObj) => {
      if (fieldObj.field == this.selectedTab) {
        this.selectedFieldType = fieldObj.currentState.fieldType;
        this.changeFieldType(this.selectedFieldType);
        this.selectedTemplate = fieldObj.currentState.templateType;

        if (Object.keys(fieldObj.currentState.actualData).length !== 0) {
          this.setOtherRequiredFields(fieldObj.currentState.actualData);
        }
        else {
          this.setCurrentStateOfField();
          this.Validate_Result.extractedValue = '';
          this.Validate_Result.Confidence = 0;
        }
      }
    })
  }

  updateCurrentStateOfField() {
    this.fieldsDataWithState.filter((fieldObj) => {
      if (fieldObj.field == this.previoustab) {
        fieldObj.currentState.fieldType = this.selectedFieldType;
        fieldObj.currentState.templateType = this.selectedTemplate;
        const data = this.pathFinderForm
        fieldObj.currentState.actualData = this.remapActualDataFields(data.value);
      }
    })
  }

  remapActualDataFields(fieldName) {
    let updatedDataObj = { extracted_value: {} };
    switch (fieldName.templateType) {
      case '1': //static
        updatedDataObj['default_value'] = fieldName.fieldValue;
        break;

      case '2': // single_label
        updatedDataObj['field_shape'] = fieldName.fieldShape;
        updatedDataObj['field_location'] = fieldName.fieldLocation;
        updatedDataObj['label'] = fieldName.fieldLabel;
        updatedDataObj['label_position'] = fieldName.fieldLabelPosition;
        updatedDataObj['top_delimiter'] = fieldName.fieldTopDelimiter
        updatedDataObj['bottom_delimiter'] = fieldName.fieldBottomDelimiter
        //updatedDataObj['default'] = fieldName.selectedfieldDefaultValue_1;
        break;

      case '3': // anchor_label
        updatedDataObj['field_shape'] = fieldName.fieldShape;
        updatedDataObj['horizontal_anchor'] = fieldName.fieldHorzAnchor;
        updatedDataObj['horizontal_anchor_location'] = fieldName.field_Location;
        updatedDataObj['vertical_anchor'] = fieldName.fieldVertAnchor;
        updatedDataObj['vertical_anchor_location'] = fieldName.fieldLocation_3;
        updatedDataObj['top_delimiter'] = fieldName.fieldTopDelimiter
        updatedDataObj['bottom_delimiter'] = fieldName.fieldBottomDelimiter
        //updatedDataObj['default'] = fieldName.selectedfieldDefaultValue_3;
        break;

      case '4': // bounding_box_identifier
        updatedDataObj['top'] = fieldName.fieldTop;
        updatedDataObj['include_top'] = fieldName.fieldIncludeTop;
        updatedDataObj['bottom'] = fieldName.fieldBottom;
        updatedDataObj['include_bottom'] = fieldName.fieldIncludeBottom;
        updatedDataObj['left'] = fieldName.fieldLeft;
        updatedDataObj['right'] = fieldName.fieldRight;
        updatedDataObj['page_identifier'] = fieldName.fieldPageIdentifier;
        updatedDataObj['top_delimiter'] = fieldName.fieldTopDelimiter
        updatedDataObj['bottom_delimiter'] = fieldName.fieldBottomDelimiter
        break;
    }
    //updatedDataObj.extracted_value['text'] = fieldName.fieldExtractedValue;
    updatedDataObj.extracted_value['text'] = this.Validate_Result.extractedValue//fieldName.fieldExtractedValue;
    updatedDataObj.extracted_value['final_confidence_score'] = this.Validate_Result.Confidence / 100;
    return updatedDataObj;
  }

  setOtherRequiredFields(fieldData) {
    switch (this.selectedTemplate) {

      case '1': //static
      case 1:
        this.currentStateOfField = { selectedfieldValue: fieldData.default_value ? fieldData.default_value : '' }
        //this.selectedfieldValue = fieldData.default_value ? fieldData.default_value : ''
        break;

      case '2': // single_label
      case 2:
        this.currentStateOfField = {
          selectedfieldShape: fieldData.field_shape ? fieldData.field_shape : '',
          selectedfieldLocation: fieldData.field_location ? fieldData.field_location : 'NONE',
          selectedfieldLabel: fieldData.label ? fieldData.label : '',
          selectedfieldLabelPosition: fieldData.label_position ? fieldData.label_position : 'Left',
          selectedfieldDefaultValue_1: 'NA',
          selectedfieldTopDelimiter: fieldData.top_delimiter ? fieldData.top_delimiter : '',// 'NA',
          selectedfieldBottomDelimiter: fieldData.bottom_delimiter ? fieldData.bottom_delimiter : '',//'NA',
        };
        break;

      case '3': // anchor_label
      case 3:
        this.currentStateOfField = {
          selectedfieldShape: fieldData.field_shape ? fieldData.field_shape : '',
          selectedfieldHorzAnchor: fieldData.horizontal_anchor ? fieldData.horizontal_anchor : '',
          selectedfield_Location: fieldData.horizontal_anchor_location ? fieldData.horizontal_anchor_location : 'LEFT',
          selectedfieldVertAnchor: fieldData.vertical_anchor ? fieldData.vertical_anchor : '',
          selectedfieldLocation_3: fieldData.vertical_anchor_location ? fieldData.vertical_anchor_location : 'TOP',
          selectedfieldDefaultValue_3: 'NA',
          selectedfieldTopDelimiter: fieldData.top_delimiter ? fieldData.top_delimiter : '',// 'NA',
          selectedfieldBottomDelimiter: fieldData.bottom_delimiter ? fieldData.bottom_delimiter : '',//'NA',
        };
        break;

      case '4': // bounding_box_identifier
      case 4:
        this.currentStateOfField = {
          selectedfieldTop: fieldData.top ? fieldData.top : '',
          selectedfieldIncludeTop: fieldData.include_top ? fieldData.include_top : 'NO',
          selectedfieldBottom: fieldData.bottom ? fieldData.bottom : '',
          selectedfieldIncludeBottom: fieldData.include_bottom ? fieldData.include_bottom : 'NO',
          selectedfieldLeft: fieldData.left ? fieldData.left : '',
          selectedfieldRight: fieldData.right ? fieldData.right : '',
          selectedfieldPageIdentifier: fieldData.page_identifier ? fieldData.page_identifier : '',
          selectedfieldDefaultValue_2: 'NA',//fieldData.fieldDefaultValue_2?fieldData.fieldDefaultValue_2:''
          selectedfieldTopDelimiter: fieldData.top_delimiter ? fieldData.top_delimiter : '',// 'NA',
          selectedfieldBottomDelimiter: fieldData.bottom_delimiter ? fieldData.bottom_delimiter : '',//'NA',
        };
        break;
    }
    // this.Validate_Result.extractedValue = fieldData.extracted_value.text;
    // this.Validate_Result.Confidence = fieldData.extracted_value.final_confidence_score * 100;

    this.Validate_Result.extractedValue = fieldData.extracted_value.text ? fieldData.extracted_value.text : '';
    this.Validate_Result.Confidence = fieldData.extracted_value.final_confidence_score ? fieldData.extracted_value.final_confidence_score * 100 : 0;
  }

  onFocusOutEvent(pathFinderForm) {
    this.extractionService.pathFinderData.FormData = pathFinderForm.value;
    //this.setFieldData(null);
  }

  hide(visibleId) {
    var div, i, id;
    for (i = 0; i < this.selectedFields.length; i++) {
      id = this.selectedFields[i].fieldId//this.modifyTitle(this.selectedFields[i].fieldId);
      div = document.getElementById(id)
        ;
      if (visibleId === id) {
        div.style.display = "block";
      } else {
        div.style.display = "none";
      }
    }
  }

  changeFieldType(id: number) {
    this.selectedTemplate = 1;

    if (this.selectedFieldType == 2) {
      this.templateOptions = this.templateOptions.filter((templateItem) => {
        return templateItem.id !== 2 && templateItem.id !== 3;
      })
    }
    else {
      this.setAllTemplateTypes();
    }

    this.setOtherRequiredFields({ extracted_value: {} });

    if (this.fieldsData.length > 0) {
      this.fieldsData[0].fieldValueData = []
    }

    setTimeout(() => {
      this.onFocusOutEvent(this.pathFinderForm);
    }, 100);

    this.Validate_Result.extractedValue = '';
    this.Validate_Result.Confidence = 0;
  }

  changeTemplateType(id: number) {
    if (this.fieldsData.length > 0) {
      this.fieldsData[0].fieldValueData = []
    }
    this.setOtherRequiredFields({ extracted_value: {} });

    setTimeout(() => {
      this.onFocusOutEvent(this.pathFinderForm);
    }, 100);
  }

  close() {
    console.log(this.templatePagecalledFrom);

    if (this.templatePagecalledFrom == 'RulesTab') {
      this.location.back();
    }
    else {
      this.hideExtractedLines();
      this.closeTemplate.emit();
    }
  }

  modifyTitle(title) {
    if (title && typeof title) {
      return title.replace(/([A-Z])/g, " $1");
    } else {
      return "";
    }
  }

  initiateTemplatesTesting() {
    this.isLoading = true;
    if (this.getUpdatedStateOfFields()) {
      setTimeout(() => {
        this.isTestingBtnClicked = true;
        this.isLoading = false;
      }, 500);
    } else {
      this.isLoading = false;
      this.dataService.showInfo('At Least One template must be validated before go for TEST.', 'Test templates');
    }
  }

  closeTestDialog() {
    this.isTestingBtnClicked = false;
  }

  setCurrentStateOfField() {
    this.currentStateOfField = {
      selectedfieldValue: '',
      selectedfieldShape: '',
      selectedfieldLocation: 'NONE',
      selectedfieldLabel: '',
      selectedfieldLabelPosition: 'Left',
      selectedfieldDefaultValue_1: 'NA',
      selectedfieldHorzAnchor: '',
      selectedfield_Location: 'LEFT',
      selectedfieldVertAnchor: '',
      selectedfieldLocation_3: 'TOP',
      selectedfieldDefaultValue_3: 'NA',
      selectedfieldTop: '',
      selectedfieldIncludeTop: 'NO',
      selectedfieldBottom: '',
      selectedfieldIncludeBottom: 'NO',
      selectedfieldLeft: '',
      selectedfieldRight: '',
      selectedfieldPageIdentifier: '',
      selectedfieldDefaultValue_2: 'NA',
      selectedfieldTopDelimiter: '',//'NA',
      selectedfieldBottomDelimiter: '',//'NA',
    };
  }

  updateCurrentStatebeforeTest() {
    this.fieldsDataWithState.filter((fieldObj) => {
      if (fieldObj.field == this.selectedTab) {
        fieldObj.currentState.fieldType = this.selectedFieldType;
        fieldObj.currentState.templateType = this.selectedTemplate;
        const data = this.pathFinderForm
        fieldObj.currentState.actualData = this.remapActualDataFields(data.value);
      }
    })
  }

  getUpdatedStateOfFields() {
    this.fieldsDataForTestState = [];
    this.updateCurrentStatebeforeTest()
    this.fieldNamesList.forEach(element => {
      this.fieldsDataWithState.filter((fieldObj) => {
        if (Object.keys(fieldObj.currentState.actualData).length !== 0 && fieldObj.field == element && fieldObj.currentState.actualData.extracted_value.text !== '') {
          this.fieldsDataForTestState.push(fieldObj)
        }
      })
    });
    if (this.fieldsDataForTestState.length > 0) {
      return true;
    } else {
      return false;
    }
  }

  showHelp(helpFor: string, subType: string = '') {
    const modalRef = this.modalService.open(InfoDialogComponent, {
      windowClass: "info-model",
      size: "lg",
      centered: true,
    });

    modalRef.componentInstance.modalData.headerName = helpFor;

    switch (helpFor) {
      case 'Field Type':
        modalRef.componentInstance.modalData.Images.push(
          '../../../assets/images/fieldType.png')
        break;

      case 'Template Type':
        modalRef.componentInstance.modalData.Images.push(
          '../../../assets/images/template_generalmsg.png',
          '../../../assets/images/template_static.png',
          '../../../assets/images/template_single.png',
          '../../../assets/images/template_anchor.png',
          '../../../assets/images/template_bb.png')
        break;

      case 'SubType':
        modalRef.componentInstance.modalData.headerName = 'Template Type'
        switch (this.selectedTemplate) {
          case '1':
            modalRef.componentInstance.modalData.Images.push(
              '../../../assets/images/template_static.png')
            break;
          case '2':
            modalRef.componentInstance.modalData.Images.push(
              '../../../assets/images/template_single.png')
            break;
          case '3':
            modalRef.componentInstance.modalData.Images.push(
              '../../../assets/images/template_anchor.png')
            break;
          case '4':
            modalRef.componentInstance.modalData.Images.push(
              '../../../assets/images/template_bb.png')
            break;
          default:
        }
        break;
    }

    modalRef.componentInstance.submitData.subscribe((res) => {
      if (res) {

      }
    });
  }
}
