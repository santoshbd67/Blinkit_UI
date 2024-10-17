import { Component, OnInit, Output, EventEmitter, OnChanges, Input, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { DataService } from 'src/app/services/data.service';
import { ExtractionAssistService } from 'src/app/services/extraction-assist.service';

@Component({
  selector: 'app-rule-masterdata-creation',
  templateUrl: './rule-masterdata-creation.component.html',
  styleUrls: ['./rule-masterdata-creation.component.scss']
})
export class RuleMasterdataCreationComponent implements OnInit, OnChanges {
  // masterData: { fieldId: string; fieldValue: string; confidence: number; }[];
  @ViewChild('masterdataForm') public masterdataForm: NgForm;
  confidenceThreshold = 60;
  masterData: any;
  validate_message = "";
  validated_score = 0;
  isInvalidIdentifier = false;
  error_message;
  isValidateScore = false;
  pointAndShootFields = ['vendorName', 'identifierText']
  selectedFormField: any;
  identifierTextField;
  @Input() setLineTextField: any;
  @Input() isPointAndShootActive: boolean;
  @Output() identifierText = new EventEmitter();
  @Output() closeComponent = new EventEmitter();
  @Output() toggleSaveButton = new EventEmitter();
  @Output() activeSelectedLineText = new EventEmitter();
  fieldsData = [];

  constructor(private dataService: DataService, private extractionService: ExtractionAssistService) { }

  ngOnInit() {
    this.masterData = this.extractionService.getRuleMasterData();

    this.extractionService.masterDataValidateResult.subscribe((resObj) => {
      this.validate_message = resObj.message;
      this.validated_score = resObj.score * 100;
      this.isValidateScore = true;
    })
    this.isValidateScore = false;
    this.validate_message = "";

    //TODO for multi-select through PAS in create masterdata screen
    this.pointAndShootFields.forEach(element => {
      this.fieldsData.push({
        fieldValue: element,
        fieldValueData: [],
        state: { focused: false, resetFieldValueData: false }
      })
    });
  }

  ngOnChanges(changeObject) {
    if (changeObject && changeObject.setLineTextField && changeObject.setLineTextField.currentValue) {

      // this.masterdataForm.controls[this.selectedFormField].setValue(this.setLineTextField.selectedboxObj.line_text)
      // if (this.selectedFormField == 'vendorName') {
      //   this.extractionService.ruleCreationData.vendorName = this.setLineTextField.selectedboxObj.line_text

      // }
      // else if (this.selectedFormField == 'identifierText') {
      //   let identifier_text = this.setLineTextField.selectedboxObj.line_text.replace(/  +/g, ' ').trim();
      //   if (this.verifyIdentifier(identifier_text))
      //     this.extractionService.ruleCreationData.identifiertext = this.setLineTextField.selectedboxObj.line_text;
      // }

      // TODO for multi-select through PAS in create masterdata screen
      this.fieldsData.forEach(fieldData => {
        if (fieldData.fieldValue == this.selectedFormField) {
          if (!this.masterdataForm.controls[this.selectedFormField].value) {
            fieldData.fieldValueData = []
          }
          this.updateElementData(fieldData, this.setLineTextField)
        }
      });
    }
    
    if (changeObject && changeObject.isPointAndShootActive && !changeObject.isPointAndShootActive.currentValue && !changeObject.isPointAndShootActive.firstChange) {
      let identifier_text = this.extractionService.ruleCreationData.identifiertext.replace(/  +/g, ' ').trim()
      this.verifyIdentifier(identifier_text)
    }
  }

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
    this.masterdataForm.controls[this.selectedFormField].setValue(foamValue)
    if (this.selectedFormField == 'vendorName') {
      this.extractionService.ruleCreationData.vendorName = foamValue;
    }
    else if (this.selectedFormField == 'identifierText') {
      // let identifier_text = foamValue.replace(/  +/g, ' ').trim();
      // if (this.verifyIdentifier(identifier_text))
      this.extractionService.ruleCreationData.identifiertext = foamValue;
    }
  }

  close() {
    this.closeComponent.emit();
    this.isValidateScore = false;
    this.hideExtractedLines();
    //this.extractionService.masterDataValidateResult.unsubscribe();
  }

  onFocusOutEventVendorName(event) {
    this.extractionService.ruleCreationData.vendorName = event.target.value

  }

  verifyIdentifier(identifier_text) {
    if (!identifier_text) {
      this.isInvalidIdentifier = true;
      this.error_message = "Required Field."
      return false;
    }

    if (identifier_text && (identifier_text.match(/ /g) || []).length < 9) {
      this.isInvalidIdentifier = true;
      this.error_message = "At least 10 space seprated words should be entered";
      return false;
    }

    if (identifier_text && identifier_text.length < 30) {
      this.isInvalidIdentifier = true;
      this.error_message = "Identifier Text should be at least 30 characters long";
      return false;
    }

    return true;
  }

  onFocusIn(event) {
    this.validate_message = "";
    this.isInvalidIdentifier = false;
  }

  onFocusOutEventIdentifierText(event) {
    let identifier_text = event.target.value.replace(/  +/g, ' ').trim();
    //if (!(localStorage.getItem("extractedLines") == "visible")) {
    //  if (this.verifyIdentifier(identifier_text))
    this.extractionService.ruleCreationData.identifiertext = event.target.value;
    // }
    if (this.isInvalidIdentifier) {
      this.validated_score = 0;
      this.extractionService.ruleCreationData.identifiertext = '';
      this.toggleSaveButton.emit("Hide");
    }
  }

  getColor() {
    if (this.validated_score < this.confidenceThreshold) {
      return '#E74C3C'; // light red
    }
    else {
      return '#28B463' // green
    }
  }

  setFieldData(event) {
    this.selectedFormField = event && event.target.name;
    if (this.pointAndShootFields.includes(this.selectedFormField)) {
      localStorage.setItem("extractedLines", "visible");
      this.activeSelectedLineText.emit(true)
    } else {
      //let identifier_text = this.extractionService.ruleCreationData.identifiertext.replace(/  +/g, ' ').trim()
      //this.verifyIdentifier(identifier_text)
      this.hideExtractedLines();
    }
  }

  hideExtractedLines() {
    this.activeSelectedLineText.emit(false)
    localStorage.setItem("extractedLines", "invisible");
  }
}