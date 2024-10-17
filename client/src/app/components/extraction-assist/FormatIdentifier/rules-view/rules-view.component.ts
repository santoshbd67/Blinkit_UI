import { Component, Input, OnInit, OnChanges, SimpleChanges, EventEmitter, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ExtractionAssistService } from 'src/app/services/extraction-assist.service';
import { IDropdownSettings } from 'ng-multiselect-dropdown';
import { DataService } from 'src/app/services/data.service';

@Component({
  selector: 'app-rules-view',
  templateUrl: './rules-view.component.html',
  styleUrls: ['./rules-view.component.scss']
})
export class RulesViewComponent implements OnInit, OnChanges {

  @Input() horizontalTabs: any;
  @Input() selectedFilters: any;
  @Output() onClickHorizontalTab = new EventEmitter();

  rulesDataSet = [];
  itemsCount: number = 0
  selectedTab;
  colorsList = ['#EBF5FB', '#FEF5E7', '#E9F7EF', '#F9EBEA', '#F5EEF8'];
  vendors = [];
  colorForUnknown = 'rgb(247 247 247)';
  imgSrc: any = {
    forwardIcon: "../../../assets/images/icons8-forward-button-24.png",
    infoIcon: "../../../assets/images/info.svg",
  };
  openTemplatePage: boolean = false;
  isRevertBtnClicked: boolean = false;
  setLineTextField;
  docIdentifier: string;
  ticketRaisedObj;
  TemplateValidationResult = {
    Data: {
      field: '',
      currentState: {}
    },
    extractedValue: '',
    Confidence: 0
  }
  requiredObject_PathFinder = {
    Format: '',
    Fields: []
  };
  isDocsFetched = false;

  dropdownListOfFormat = [];
  selectedItemsInFormat = [];
  dropdownSettings_Format: IDropdownSettings = {};

  dropdownListOfCorrections = [];
  selectedItemsInCorrections = [];
  dropdownSettings_Corrections: IDropdownSettings = {};
  formatAndCorrectionList = { format: [], Correction: [] }
  filterValue = 0;
  currentFilter: any;

  statusTextMapping: any = {
    'Rules Created': "Rules Created",
  };

  constructor(
    private extractionService: ExtractionAssistService,
    private dataService: DataService,
    private activatedRoute: ActivatedRoute,
    private router: Router) { }

  ngOnChanges(changes: SimpleChanges): void {
    //console.log(this.selectedFilters);
  }

  ngOnInit() {
    this.activatedRoute.queryParams.subscribe((res) => {
      let queryParams = JSON.parse(JSON.stringify(res));
      this.selectedTab = queryParams.horzTab;
      this.getRulesCreatedData();
    })
  }

  switchTab(tabName) {
    this.onClickHorizontalTab.emit(tabName);
    this.setFilterValue(tabName);
    this.getRulesCreatedData();
  }

  getRulesCreatedData() {
    if (this.selectedTab && this.selectedTab === 'Rules Created') {
      this.extractionService.getDataForRulesCreatedTab().subscribe((response) => {

        if (response &&
          response.responseCode == 'OK' &&
          response.result &&
          response.result.status === 'Success' &&
          response.result.templates &&
          response.result.templates.length > 0) {

          this.updateFiltersDropdown(response);

          let resObject = {};
          response.result.templates.forEach(templates => {
            if (!resObject[templates.vendor_id]) {
              resObject[templates.vendor_id] = { vendor_name: '', vendor_id: '', field_name: [], data: [] }
            }
            this.updateDataObject(resObject[templates.vendor_id], templates)
          });
          this.rulesDataSet = [];
          for (let key in resObject) {
            this.rulesDataSet.push(resObject[key])
          }
          //console.log(this.rulesDataSet);

          this.isDocsFetched = true;
          this.itemsCount = this.rulesDataSet.length;

          if (this.formatAndCorrectionList.Correction.length == 0 && this.formatAndCorrectionList.format.length == 0) {
            this.setFormatsAndCorrections();
          }
        }
        else {
          this.rulesDataSet = [];
          this.isDocsFetched = true;
        }
      }, (error) => {
        console.log("Got error in getRulesCreatedData method")
        console.log(error);
        this.isDocsFetched = true;
      })
    }
  }

  updateFiltersDropdown(response) {
    let currentFilter = this.formatAndCorrectionList;
    if (currentFilter && (currentFilter.Correction.length > 0 || currentFilter.format.length > 0)) {
      this.rulesDataSet = []
      response.result.templates = response.result.templates.filter(templates => currentFilter.format.includes(templates.vendor_id));
      response.result.templates = response.result.templates.filter(templates => currentFilter.Correction.includes(templates.field_name));
    }
  }

  updateDataObject(dataObject, templates) {
    dataObject.vendor_name = templates.vendor_name;
    dataObject.vendor_id = templates.vendor_id;
    dataObject.field_name.push(templates.field_name)
    dataObject.data.push(templates);
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

  resetFilter() {
    this.formatAndCorrectionList.Correction = [];
    this.formatAndCorrectionList.format = [];

    this.rulesDataSet = [];
    this.getRulesCreatedData();
  }

  openTemplateCreationPage(headerItem: any) {
    this.setObjectForTemplateCreationPage(headerItem);

    let dataTobeSent = {
      redirectTo: 'template-creation',
      calledFrom: 'RulesTab',
      requiredObject_PathFinder: this.requiredObject_PathFinder,
      Validate_Result: this.TemplateValidationResult
    }
    this.getDocumentId(headerItem.vendor_id, dataTobeSent);
  }

  setObjectForTemplateCreationPage(headerItem) {
    this.requiredObject_PathFinder = {
      Format: '',
      Fields: []
    };
    this.TemplateValidationResult = {
      Data: {
        field: '',
        currentState: {}
      },
      extractedValue: '',
      Confidence: 0
    }

    this.requiredObject_PathFinder.Format = headerItem.vendor_id
    headerItem.field_name.forEach(element => {
      let object = {}
      const index = headerItem.data.findIndex(object => object.field_name === element)
      if (index >= 0) {
        object = headerItem.data[index]
      }
      object['fieldId'] = element
      object['boundingBox'] = {
        left: 0,
        right: 1,
        top: 0,
        bottom: 1
      }
      this.requiredObject_PathFinder.Fields.push(object)
    });
    this.createData(this.requiredObject_PathFinder);
    localStorage.setItem("TemplateFields", JSON.stringify(this.requiredObject_PathFinder));
  }

  getDocumentId(format, dataTobeSent) {
    this.extractionService.getDocumentsForTesting({ vendorId: format }).subscribe((res) => {
      if (res && res.responseCode == "OK" && res.result && res.result.IdDetailsList && res.result.IdDetailsList.length > 0 && res.result.docIdsList && res.result.docIdsList.length > 0) {
        this.router.navigate(["extraction-assitance"], {
          queryParams: {
            docIdentifier: res.result.IdDetailsList[0].documentId//"doc_1667817154402_899ab89abb8"
          },
          state: { calledFor: dataTobeSent }
        });
        localStorage.setItem("templatePagecalledFrom", dataTobeSent.calledFrom);
      }
      else {
        this.dataService.showInfo("No Document exist for selected ML ID.", "Info");
      }
    }, (err) => {
      console.log(err);
    })
  }

  createData(requiredObject_PathFinder) {

    if (requiredObject_PathFinder) {
      if (requiredObject_PathFinder.extracted_value) {
        this.TemplateValidationResult.extractedValue = '';
        this.TemplateValidationResult.Confidence = 0;
      }
      else {
        this.TemplateValidationResult.extractedValue = '';
        this.TemplateValidationResult.Confidence = 0;
        this.TemplateValidationResult.Data.field = requiredObject_PathFinder.field_name;
        this.TemplateValidationResult.Data.currentState = this.getCurrentState(requiredObject_PathFinder);
      }
    }
    else {
      this.TemplateValidationResult.extractedValue = '';
      this.TemplateValidationResult.Confidence = 0;
    }
  }

  getCurrentState(pathFinderData) {
    let data = {
      fieldType: this.getFieldTypeId(pathFinderData.field_type),
      templateType: this.getTemplateTypeId(pathFinderData.template_type),
      actualData: { extracted_value: {} }
    }
    switch (this.getTemplateTypeId(pathFinderData.template_type)) {
      case '1': // static
        data.actualData['default_value'] = pathFinderData.default_value
        break;

      case '2': //singleLabel
        data.actualData['field_shape'] = pathFinderData.field_shape
        data.actualData['field_location'] = pathFinderData.field_location
        data.actualData['label'] = pathFinderData.label
        data.actualData['label_position'] = pathFinderData.label_position
        data.actualData['default_value'] = pathFinderData.default_value
        data.actualData['top_delimiter'] = pathFinderData.top_delimiter
        data.actualData['bottom_delimiter'] = pathFinderData.bottom_delimiter
        break;

      case '3': //anchor_label
        data.actualData['field_shape'] = pathFinderData.field_shape
        data.actualData['horizontal_anchor'] = pathFinderData.horizontal_anchor
        data.actualData['horizontal_anchor_location'] = pathFinderData.horizontal_anchor_location
        data.actualData['vertical_anchor'] = pathFinderData.vertical_anchor
        data.actualData['vertical_anchor_location'] = pathFinderData.vertical_anchor_location
        data.actualData['default_value'] = pathFinderData.default_value
        data.actualData['top_delimiter'] = pathFinderData.top_delimiter
        data.actualData['bottom_delimiter'] = pathFinderData.bottom_delimiter

        break;

      case '4': // bounding_box_identifier
        data.actualData['top'] = pathFinderData.top
        data.actualData['include_top'] = pathFinderData.include_top
        data.actualData['bottom'] = pathFinderData.bottom
        data.actualData['include_bottom'] = pathFinderData.include_bottom
        data.actualData['left'] = pathFinderData.left
        data.actualData['right'] = pathFinderData.right
        data.actualData['page_identifier'] = pathFinderData.page_identifier
        data.actualData['default_value'] = pathFinderData.default_value
        data.actualData['top_delimiter'] = pathFinderData.top_delimiter
        data.actualData['bottom_delimiter'] = pathFinderData.bottom_delimiter
        break;
    }
    data.actualData.extracted_value['text'] = this.TemplateValidationResult.extractedValue
    data.actualData.extracted_value['final_confidence_score'] = this.TemplateValidationResult.Confidence

    return data;
  }

  getFieldTypeId(value) {
    let FieldTypeId = '1';
    switch (value) {
      case 'SINGLE_TOKEN': FieldTypeId = '1';
        break;
      case 'MULTI_TOKEN': FieldTypeId = '2';
        break;
    }
    return FieldTypeId;
  }

  getTemplateTypeId(value) {
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

  setFormatsAndCorrections() {
    let data = { Formats: [], Corrections: [], selectedFormats: [], selectedCorrections: [] };
    this.rulesDataSet.map((doc, index_Formats) => {

      doc.field_name.map((fieldName, index) => {

        if ((data.Corrections.findIndex(e => e.correction_text === fieldName)) === -1) {
          data.Corrections.push({ correction_id: data.Corrections.length + 1, correction_text: fieldName })
          data.selectedCorrections.push({ correction_id: data.selectedCorrections.length + 1, correction_text: fieldName })
          this.formatAndCorrectionList.Correction.push(fieldName);
        }
      })

      if ((data.Formats.findIndex(object => object.item_text === doc.vendor_id)) === -1) {
        data.Formats.push({ item_id: index_Formats + 1, item_text: doc.vendor_id });
        data.selectedFormats.push({ item_id: index_Formats + 1, item_text: doc.vendor_id });
        this.formatAndCorrectionList.format.push(doc.vendor_id);
      }
    });

    this.setDropDownData_Format(data);
    this.setDropDownData_Corrections(data);

    return data;
  }

  // Filter
  setFilterValue(status) {
    this.formatAndCorrectionList.Correction = [];
    this.formatAndCorrectionList.format = [];
    this.dropdownListOfFormat = [];
    this.dropdownListOfCorrections = [];
    this.selectedItemsInFormat = [];
    this.selectedItemsInCorrections = [];

    switch (status) {
      case 'Rules Created':
        this.filterValue = 1;
        break;
      default:
        this.filterValue = 0;
        break;
    }
  }

  //<-----------------------Formats ---------------------------------->

  setDropDownData_Format(data) {
    this.dropdownListOfFormat = data.Formats;
    this.selectedItemsInFormat = data.selectedFormats;

    this.dropdownSettings_Format = {
      singleSelection: false,
      idField: 'item_id',
      textField: 'item_text',
      selectAllText: 'Select All',
      unSelectAllText: 'UnSelect All',
      itemsShowLimit: 1,
      allowSearchFilter: false
    };
  }

  onItemSelectInFormat(item: any) {
    this.formatAndCorrectionList.format.push(item.item_text)
    this.getRulesCreatedData();
  }

  onItemDeSelectFormat(item: any): void {
    const index: number = this.formatAndCorrectionList.format.findIndex(x => x === item.item_text);
    this.formatAndCorrectionList.format.splice(index, 1);

    if (this.formatAndCorrectionList.Correction.length == 0 || this.formatAndCorrectionList.format.length == 0) {
      this.dropdownListOfFormat = [];
      this.rulesDataSet = [];
    }
    else {
      this.getRulesCreatedData();
    }
  }

  onSelectAllInFormat(items: any) {
    this.formatAndCorrectionList.format = []
    items.forEach(element => {
      this.formatAndCorrectionList.format.push(element.item_text)
    });
    this.getRulesCreatedData();
  }

  onDeSelectAllFormat(items: any) {
    this.formatAndCorrectionList.format = [];

    if (this.formatAndCorrectionList.Correction.length == 0 || this.formatAndCorrectionList.format.length == 0) {
      this.rulesDataSet = [];
    }
    else {
      this.getRulesCreatedData();
    }
  }

  // ======================corrections=====================================

  setDropDownData_Corrections(data) {
    this.dropdownListOfCorrections = data.Corrections;
    this.selectedItemsInCorrections = data.selectedCorrections;

    this.dropdownSettings_Corrections = {
      singleSelection: false,
      idField: 'correction_id',
      textField: 'correction_text',
      selectAllText: 'Select All',
      unSelectAllText: 'UnSelect All',
      itemsShowLimit: 1,
      allowSearchFilter: false
    };
  }

  onItemSelectInCorrections(item: any) {
    this.formatAndCorrectionList.Correction.push(item.correction_text);
    this.getRulesCreatedData();
  }

  onItemDeSelectCorrections(item: any) {
    const index: number = this.formatAndCorrectionList.Correction.findIndex(x => x === item.correction_text);
    this.formatAndCorrectionList.Correction.splice(index, 1);

    if (this.formatAndCorrectionList.Correction.length == 0 || this.formatAndCorrectionList.format.length == 0) {
      this.rulesDataSet = [];
      this.dropdownListOfCorrections = [];
    }
    else {
      this.getRulesCreatedData();
    }
  }

  onSelectAllInCorrections(items: any) {
    this.formatAndCorrectionList.Correction = []
    items.forEach(element => {
      this.formatAndCorrectionList.Correction.push(element.correction_text)
    });
    this.getRulesCreatedData();
  }

  onDeSelectAllCorrections(items: any) {
    this.formatAndCorrectionList.Correction = []
    if (this.formatAndCorrectionList.Correction.length == 0 || this.formatAndCorrectionList.format.length == 0) {
      this.rulesDataSet = [];
    }
    else {
      this.getRulesCreatedData();
    }
  }
}