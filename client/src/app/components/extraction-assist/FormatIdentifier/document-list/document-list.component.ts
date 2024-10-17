import {
  Component,
  OnInit,
  ViewEncapsulation,
  Input,
  Output,
  EventEmitter,
  SimpleChanges,
} from "@angular/core";
import { DataService } from "src/app/services/data.service";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { Route, ActivatedRoute, Params, Router } from "@angular/router";

import * as moment from "moment";
import { AppConfig } from "src/app/config/app-config";
import { AuthService } from 'src/app/services/auth.service';
import { DeleteAlertComponent } from "../../../delete-alert/delete-alert.component";
import { ExtractionAssistService } from 'src/app/services/extraction-assist.service';
import { NgbDate, NgbCalendar, NgbDatepickerConfig } from '@ng-bootstrap/ng-bootstrap';
import { IDropdownSettings } from 'ng-multiselect-dropdown';

@Component({
  selector: 'app-document-list',
  templateUrl: './document-list.component.html',
  styleUrls: ['./document-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class DocumentListComponent implements OnInit {
  @Input() selectedFilters: any;
  @Input() horizontalTabs: any;

  // selectedTabValue = [
  //   { filterName: undefined, filterValue: 0 },
  //   { filterName: "RaisedTickets", filterValue: 1 },
  //   { filterName: "Approved", filterValue: 2 },
  //   { filterName: "Done", filterValue: 3 }
  // ];

  selectedTabValue = [
    { filterName: 'EA Queue', filterValue: 0 },
    { filterName: "Tickets Raised", filterValue: 1 },
  ];

  statusTextMapping: any = {
    'EA Queue': "Manual Corrections",
    'Tickets Raised': "Tickets Raised"
  };

  @Output() currentPage = new EventEmitter();
  @Output() refresh = new EventEmitter();
  @Output() delete = new EventEmitter();
  @Output() extractedAll = new EventEmitter();
  @Output() public openOutput = new EventEmitter();
  @Output() onClickHorizontalTab = new EventEmitter();

  appConfig = AppConfig;
  itemsPerPage: number = 12;
  pageNumber: number = 1;
  selectedItem;
  filterParam: string;
  selectAll: boolean = false;
  multipleSelect: boolean = false;

  selectedTab;

  imgSrc: any = {
    forwardIcon: "../../../assets/images/icons8-forward-button-24.png",
    infoIcon: "../../../assets/images/info.svg",
  };
  documentId: any;
  colorsList = ['#EBF5FB', '#FEF5E7', '#E9F7EF', '#F9EBEA', '#F5EEF8'];
  vendors = [];
  colorForUnknown = 'rgb(247 247 247)';

  disableAction = false;
  actionTooltip = 'Click to proceed';
  rulesDataSet = [];

  fromDate: NgbDate;
  toDate: NgbDate | null = null;
  hoveredDate: NgbDate;
  rangetime;
  isDisabled;
  toggleCal: boolean = false;
  selectedFilterValue: any = null;
  maxDate: any;
  serverTimeGap: any;

  dropdownListOfFormat = [];
  selectedItemsInFormat = [];
  dropdownSettings_Format: IDropdownSettings = {};

  dropdownListOfCorrections = [];
  selectedItemsInCorrections = [];
  dropdownSettings_Corrections: IDropdownSettings = {};
  formatAndCorrectionList = { format: [], Correction: [] }

  filterValue = 0;
  documents: any[];
  currentFilter: any = {};
  totalItems: number = 0;
  isDocsFetched = false;
  selectedStartDate: any;
  selectedEndDate: any;

  constructor(
    public dataService: DataService,
    private extractinService: ExtractionAssistService,
    private activatedRoute: ActivatedRoute,
    private authService: AuthService,
    private modalService: NgbModal,
    private router: Router,
    private route: ActivatedRoute,
    private calendar: NgbCalendar,
    config: NgbDatepickerConfig
  ) {
    this.setCalenderDefaultDates();
    //this.setTimeRangeAndDateFilterValue();
    this.setMaxDate();
    this.isDisabled = (date: NgbDate, current: { month: number }) => { date.after(calendar.getToday()) };

    this.serverTimeGap = this.authService.getUserSettings('DEFAULT_EA_TIMEGAP');
  }

  ngOnInit() {
    this.activatedRoute.queryParams.subscribe((res) => {
      let queryParams = JSON.parse(JSON.stringify(res));

      if (queryParams.horzTab) {
        this.actionTooltip = 'Not Allowed';
        this.selectedTab = queryParams.horzTab;
      }
      this.includeCorrectedValues(queryParams.horzTab);

      this.onClickHorizontalTab.emit(queryParams.horzTab);
      this.setFilterValue(queryParams.horzTab);
      this.fetchFormats();
      this.fetchDocuments();
    })
  }

  ngOnChanges(changes: SimpleChanges) {

    if (changes && changes.documents && changes.documents.currentValue) {
      this.reMappedDocsData();
      this.selectAll = false;
      this.multipleSelect = false;
    }
    if (changes && changes.selectedFilters && changes.selectedFilters.currentValue) {
      this.selectAll = false;
      this.multipleSelect = false;
    }
  }

  setMaxDate() {
    const todayDate = new Date();
    this.maxDate = {
      year: todayDate.getFullYear(),
      month: todayDate.getMonth() + 1,
      day: todayDate.getDate()
    };
  }

  setTimeRangeAndDateFilterValue() {
    let dates = { startDate: '', endDate: '' };
    if (this.fromDate) {
      dates.startDate = this.fromDate.year + "-" + this.fromDate.month + "-" + this.fromDate.day;
    }
    if (this.toDate) {
      dates.endDate = this.toDate.year + "-" + this.toDate.month + "-" + this.toDate.day;
    }
    this.rangetime = dates.startDate + " to " + dates.endDate;
    this.selectedFilterValue = dates.startDate + "_" + dates.endDate;
  }

  toggleDp() {
    this.toggleCal = !this.toggleCal;
  }

  setCalenderDefaults() {
    this.fromDate = null; //this.calendar.getToday();
    this.toDate = null; //this.calendar.getNext(this.calendar.getToday(), "d", 10);
  }

  isHovered(date: NgbDate) {
    return (
      this.fromDate &&
      !this.toDate &&
      this.hoveredDate &&
      date.after(this.fromDate) &&
      date.before(this.hoveredDate)
    );
  }

  isInside(date: NgbDate) {
    return date.after(this.fromDate) && date.before(this.toDate);
  }

  isRange(date: NgbDate) {
    return (
      date.equals(this.fromDate) ||
      date.equals(this.toDate) ||
      this.isInside(date) ||
      this.isHovered(date)
    );
  }

  includeCorrectedValues(selectedTab) {

    if (this.documents) {
      this.documents.forEach(element => {
        element.correctedValues = []
        element.docs_result[0].documentInfo.forEach(documentInfoElement => {

          let obj = this.selectedTabValue.filter((item) => {
            return item.filterName == selectedTab;
          })

          if (documentInfoElement.correctedValue && obj && obj.length > 0 && documentInfoElement.extractionAssist == obj[0].filterValue) {
            element.correctedValues.push(' ' + documentInfoElement.fieldId)
          }
        })
      });
    }
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

  reMappedDocsData() {
    this.documents = JSON.parse(JSON.stringify(this.documents));

    if (this.documents.length > 0) {
      this.documents.forEach((each) => {
        each.selected = false;
        // to calculate extraction time
        if (each.lastProcessedOn != undefined && each.lastProcessedOn.toString().length == 10) {
          each.lastProcessedOn = each.lastProcessedOn * 1000;
          each.extractionTime = each.lastProcessedOn - each.submittedOn
        }
        else if (each.lastProcessedOn != undefined && each.lastProcessedOn.toString().length == 13) {
          each.extractionTime = each.lastProcessedOn - each.submittedOn
        }
      });

      this.documents.map((item, index) => {
        item.submittedOn = moment(this.epochToMili(item.submittedOn)).format("LL");
        item.lastUpdatedOn = moment(this.epochToMili(item.lastUpdatedOn)).format("LL");

        if (
          item.invoiceDate &&
          (!item.invoiceDate.match(/[.]/g) ||
            (item.invoiceDate.match(/[.]/g) &&
              item.invoiceDate.match(/[.]/g).length != 2)) &&
          item.invoiceDate.length >= 10 &&
          item.invoiceDate.indexOf("-") == -1
        ) {
          item.invoiceDate = moment(
            this.epochToMili(Number(item.invoiceDate))
          ).format("LL");
        }
      });
    }
  }

  identifyFormat(docId) {
    localStorage.removeItem('extractedLines'); // added by kanak on 11-08-2022
    let dataTobeSent = {
      redirectTo: 'RuleCreation',
      calledFrom: 'HomeTab'
    }
    this.router.navigate(["extraction-assitance"], {
      queryParams: {
        docIdentifier: docId
      },
      state: { calledFor: dataTobeSent }
    });
  }

  switchTab(tabName) {
    this.onClickHorizontalTab.emit(tabName);
    if (tabName == 'Tickets Raised') {
      tabName = 'RaisedTickets';
    }
    this.setFilterValue(tabName);
    this.fetchDocuments();
    this.fetchFormats();
  }

  setFilterValue(status) {
    this.formatAndCorrectionList.Correction = [];
    this.formatAndCorrectionList.format = [];
    this.dropdownListOfFormat = [];
    this.dropdownListOfCorrections = [];
    this.selectedItemsInFormat = [];
    this.selectedItemsInCorrections = [];

    switch (status) {
      case 'RaisedTickets':
      case 'Tickets Raised':
        this.filterValue = 1;
        break;
      case 'Approved':
        this.filterValue = 2;
        break;
      case 'Done':
        this.filterValue = 3;
        break;
      default:
        this.filterValue = 0;
        break;
    }
  }

  getButtonText(element) {
    if (element && element.status) {
      let statusMaster = {
        READY_FOR_EXTRACTION: "EXTRACT NOW",
        REVIEW: "START REVIEW",
      };

      this.appConfig.documentStatus.forEach((each) => {
        if (this.dataService.allowView(element)) {
          statusMaster[each] = "VIEW";
        }
      });

      if (statusMaster[element.status]) {
        return statusMaster[element.status];
      }
    }
  }

  callInfoBox(selectedItem) {
    this.selectedItem = selectedItem;
    this.dataService.setVendorData(selectedItem);
    this.openOutput.emit(selectedItem);
  }

  extractAll() {
    let toExtract = this.documents.filter((each) => {
      return each.selected;
    });
    this.callInfoBox(toExtract);
  }

  setPageNumber(event) {
    this.pageNumber = event;
    this.currentPage.emit(this.pageNumber);
  }

  toggleSelect() {
    this.multipleSelect = this.selectAll;
    this.documents.forEach((each) => {
      each.selected = this.selectAll;
    });
  }

  toggleSelectSingle(i) {
    let allSelected = this.documents.every((each) => each.selected);
    if (allSelected) {
      this.selectAll = true;
      this.multipleSelect = true;
    } else {
      this.selectAll = false;
      this.multipleSelect = true;
    }

    let noneSelected = this.documents.every((each) => !each.selected);
    if (noneSelected) this.multipleSelect = false;
  }

  openAlertModel(docId) {
    const modalRef = this.modalService.open(DeleteAlertComponent, {
      windowClass: "delete-model",
      size: "sm",
      centered: true,
    });
    modalRef.componentInstance.id = docId;

    modalRef.componentInstance.action = 'delete';
    modalRef.componentInstance.item = 'Document';
    modalRef.componentInstance.submitData.subscribe((res) => {
      if (res) {
        this.delete.emit(docId);
      }
    });
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

  fetchFormats() {
    if (this.formatAndCorrectionList.Correction.length == 0 && this.formatAndCorrectionList.format.length == 0) {
      this.getFormatsAndCorrections();
    }
  }

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
    this.fetchDocuments();
  }

  onItemDeSelectFormat(item: any): void {
    const index: number = this.formatAndCorrectionList.format.findIndex(x => x === item.item_text);
    this.formatAndCorrectionList.format.splice(index, 1);

    if (this.formatAndCorrectionList.Correction.length == 0 || this.formatAndCorrectionList.format.length == 0) {
      this.dropdownListOfFormat = [];
      this.documents = [];
    }
    else {
      this.fetchDocuments();
    }
  }

  onSelectAllInFormat(items: any) {
    this.formatAndCorrectionList.format = []
    items.forEach(element => {
      this.formatAndCorrectionList.format.push(element.item_text)
    });
    this.fetchDocuments();
  }

  onDeSelectAllFormat(items: any) {
    this.formatAndCorrectionList.format = [];

    if (this.formatAndCorrectionList.Correction.length == 0 || this.formatAndCorrectionList.format.length == 0) {
      this.documents = [];
    }
    else {
      this.fetchDocuments();
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
    this.fetchDocuments();
  }

  onItemDeSelectCorrections(item: any) {
    const index: number = this.formatAndCorrectionList.Correction.findIndex(x => x === item.correction_text);
    this.formatAndCorrectionList.Correction.splice(index, 1);

    if (this.formatAndCorrectionList.Correction.length == 0 || this.formatAndCorrectionList.format.length == 0) {
      this.documents = [];
      this.dropdownListOfCorrections = [];
    }
    else {
      this.fetchDocuments();
    }
  }

  onSelectAllInCorrections(items: any) {
    this.formatAndCorrectionList.Correction = []
    items.forEach(element => {
      this.formatAndCorrectionList.Correction.push(element.correction_text)
    });
    this.fetchDocuments();
  }

  onDeSelectAllCorrections(items: any) {
    this.formatAndCorrectionList.Correction = []
    if (this.formatAndCorrectionList.Correction.length == 0 || this.formatAndCorrectionList.format.length == 0) {
      this.documents = [];
    }
    else {
      this.fetchDocuments();
    }
  }

  resetFilter() {
    this.formatAndCorrectionList.Correction = [];
    this.formatAndCorrectionList.format = [];
    this.fetchDocuments();
    this.fetchFormats();
  }

  fetchDocuments(pageNumber?) {

    if (!pageNumber) pageNumber = this.pageNumber;
    this.getDocument(pageNumber);
  }

  getDocument(pageNumber?) {
    this.getCurrentFilter();
    if (!pageNumber) pageNumber = 1;

    this.dataService.findDocument(this.currentFilter, pageNumber).subscribe(
      (res) => {
        if (res && res.result) {
          this.totalItems = res.result.count;
          this.isDocsFetched = true;
          if (res.result.documents) {
            this.documents = res.result.documents.sort((a, b) => { return a.vendorId.localeCompare(b.vendorId); });
            this.includeCorrectedValues(this.selectedTab);
            this.reMappedDocsData();
            this.handleFiltersData(res.result.documents);
          } else {
            this.documents = [];
          }
        }
      },
      (err) => {
        this.documents = [];
        this.isDocsFetched = true;
        this.dataService.showError("Error while fetching documents", "Error", this.dataService.getAlertTimeOut());
      }
    );
  }

  handleFiltersData(documents) {
    if (documents.length === 0) {
      this.formatAndCorrectionList.Correction = [];
      this.formatAndCorrectionList.format = [];
      this.selectedItemsInCorrections = [];
      this.selectedItemsInFormat = [];
      this.dropdownListOfFormat = [];
      this.dropdownListOfCorrections = [];
    }
    else {
      this.fetchFormats();
    }
  }

  updateFilterListItems() {
    if (this.documents && this.documents.length > 0) {

      let data = { Formats: [], Corrections: [], selectedFormats: [], selectedCorrections: [] };

      this.documents.map((doc, index) => {

        if ((data.Formats.findIndex(object => object.item_text === doc.vendorId)) === -1) {
          data.Formats.push({ item_id: index, item_text: doc.vendorId });
          data.selectedFormats.push({ item_id: index, item_text: doc.vendorId });
        }

        doc.docs_result[0].documentInfo.forEach((documentInfoElement, index) => {
          if (documentInfoElement.correctedValue && documentInfoElement.extractionAssist == this.filterValue) {
            if ((data.Corrections.findIndex(e => e.correction_text === documentInfoElement.fieldId)) === -1) {
              data.Corrections.push({ correction_id: index, correction_text: documentInfoElement.fieldId })
              data.selectedCorrections.push({ correction_id: index, correction_text: documentInfoElement.fieldId })
            }
          }
        })
      })

      if (this.dropdownListOfFormat.length !== data.Formats.length) {
        this.setDropDownData_Format(data);
        this.formatAndCorrectionList.format = []
        data.Formats.forEach(element => {
          this.formatAndCorrectionList.format.push(element.item_text)
        });
      }
      if (this.dropdownListOfCorrections.length !== data.Corrections.length) {
        this.setDropDownData_Corrections(data);
        this.formatAndCorrectionList.Correction = []
        data.Corrections.forEach(element => {
          this.formatAndCorrectionList.Correction.push(element.correction_text)
        });
      }
      this.isDocsFetched = true;
    }
  }

  //Get single document on refresh
  getDocumentDataByDocId(docId, index) {
    let filter = {
      documentId: docId,
    };
    this.dataService.findDocument(filter, this.pageNumber).subscribe(
      (res) => {
        if (res && res.result) {
          let oldObj = this.documents;
          const data = res.result.documents[0];
          this.documents[index] = data;
          this.documents = JSON.parse(JSON.stringify(this.documents));
        }
      },
      (err) => {
        this.dataService.showError(
          "error while fetching the document",
          "Error!", this.dataService.getAlertTimeOut()
        );
      }
    );
  }

  checkStatusOfDocuments(refreshingDocs, intervalId) {
    if (refreshingDocs && refreshingDocs.length > 0) {
      refreshingDocs.forEach(document => {
        this.getDocumentDataByDocId(document.documentId, document.index);
      });
    }
    else {
      clearInterval(intervalId);
    }
  }

  getUnkonwnDocuments() {
    let docIds = [];
    if (this.documents && this.documents.length > 0) {
      this.documents.filter((doc) => {
        return doc.vendorId == 'UNKNOWN'
      }).map((doc) => {
        docIds.push(doc.documentId);
      })
    }
    return docIds;
  }

  getFormatsAndCorrections() {
    let data = { Formats: [], Corrections: [], selectedFormats: [], selectedCorrections: [] };

    this.extractinService.getAllFormatsAndCorrections(this.filterValue).subscribe((res) => {
      if (res && res.responseCode == "OK" && res.result) {
        if (res.result.TotalFormats > 0) {
          res.result.Formats.map((doc) => {

            if ((data.Formats.findIndex(object => object.item_text === doc.vendorId)) === -1) {
              data.Formats.push({ item_id: doc.id, item_text: doc.vendorId });
              data.selectedFormats.push({ item_id: doc.id, item_text: doc.vendorId });
              this.formatAndCorrectionList.format.push(doc.vendorId);
            }
          })

          res.result.Corrections.forEach((item) => {

            if ((data.Corrections.findIndex(e => e.correction_text === item.correctionIn)) === -1) {
              data.Corrections.push({ correction_id: item.id, correction_text: item.correctionIn })
              data.selectedCorrections.push({ correction_id: item.id, correction_text: item.correctionIn })
              this.formatAndCorrectionList.Correction.push(item.correctionIn);
            }

          })
          this.setDropDownData_Format(data);
          this.setDropDownData_Corrections(data);
        }
      }
    }, err => {
      console.log("Error while getFormatsAndCorrections executing..");
      console.log(err);
    })
    return data;
  }

  getUpdatedFormats() {

    let unkownDocIds = this.getUnkonwnDocuments();

    if (unkownDocIds && unkownDocIds.length > 0) {
      this.extractinService.getUpdatedDocumnetFormats(unkownDocIds).subscribe(
        res => {
          // suggestions are present
          if (res && res.responseCode === 'OK' && res.result.responseCode == 200 && res.result.refreshed_result) {
            let updatedList = this.prepareObject(res.result.refreshed_result);

            this.extractinService.updateUnknownDocuments(unkownDocIds, updatedList).subscribe((res) => {
              if (res && res.responseCode === 'OK' && res.result && res.result.ok == 1 && res.result.nModified) {
                this.formatAndCorrectionList.Correction = [];
                this.formatAndCorrectionList.format = [];
                this.fetchDocuments();
              }
            })
          }
          else {
            console.log("Error while getting updated formats");
          }
        },
        err => {
          console.log("error while fetching the suggestions", err);
        }
      )
    }
  }

  prepareObject(updatedDocs) {
    let vendorIds = [];
    if (updatedDocs && updatedDocs.length > 0) {
      updatedDocs.forEach(element => {
        Object.keys(element).forEach(function (Id) {
          var value = element[Id];
          if (value.VENDOR_ID !== undefined) {
            vendorIds.push({ "documentId": Id, "VendorId": value.VENDOR_ID })
          }
          else {
            vendorIds.push({ "documentId": Id, "VendorId": 'UNKNOWN' })
          }
        });
      });
    }
    return vendorIds;
  }

  // Delete document
  deleteDocumentById(docId) { }

  paginate(pageNumber) {
    this.pageNumber = pageNumber;
    this.fetchDocuments(pageNumber);
  }

  //<------------------------Before UTC Implementation ---------------------->

  // setCalenderDefaultDates() {
  //   this.fromDate = this.calendar.getPrev(this.calendar.getToday(), 'm', 1); //show documents of last 1 month
  //   this.toDate = this.calendar.getToday();
  // }

  // setTimeRangeAndDateFilterValue() {
  //   let dates = { startDate: '', endDate: '' };
  //   if (this.fromDate) {
  //     dates.startDate = this.fromDate.year + "-" + this.fromDate.month + "-" + this.fromDate.day;
  //   }
  //   if (this.toDate) {
  //     dates.endDate = this.toDate.year + "-" + this.toDate.month + "-" + this.toDate.day;
  //   }
  //   this.rangetime = dates.startDate + " to " + dates.endDate;
  //   this.selectedFilterValue = dates.startDate + "_" + dates.endDate;
  // }

  // getCurrentFilter() {
  //   const myArray = this.selectedFilterValue.split("_");
  //   this.isDocsFetched = false;
  //   let corrections = this.formatAndCorrectionList.Correction;
  //   let formats = this.formatAndCorrectionList.format;

  //   this.currentFilter = {
  //     documentInfo: {
  //       $elemMatch: corrections.length > 0 ? {
  //         extractionAssist: this.filterValue,
  //         fieldId: { "$in": corrections }
  //       } : { extractionAssist: this.filterValue, fieldId: { "$nin": corrections } }
  //     },
  //     calledFrom: 'extractionAssist',
  //     vendorId: formats.length > 0 ? { "$in": formats } : { "$nin": formats },
  //     lastUpdatedOn: {
  //       $gte: Math.round(new Date(myArray[0]).getTime()),
  //       $lte: Math.round(new Date(myArray[1]).setHours(23, 59, 0, 0))
  //     }
  //   }
  // }

  // onDateSelection(date: NgbDate) {
  //   if (!this.fromDate && !this.toDate) {
  //     this.fromDate = date;
  //   } else if (this.fromDate && !this.toDate && date.after(this.fromDate)) {
  //     this.toDate = date;
  //   } else {
  //     this.toDate = null;
  //     this.fromDate = date;
  //   }

  //   let startDate, endDate;

  //   if (this.fromDate) {
  //     startDate = this.fromDate.year + "-" + this.fromDate.month + "-" + this.fromDate.day;
  //   }
  //   if (this.toDate) {
  //     endDate = this.toDate.year + "-" + this.toDate.month + "-" + this.toDate.day;
  //   }

  //   if (startDate && endDate) {
  //     this.toggleDp();

  //     let currentTimeGap = this.getTimeGapBetweenDates(startDate, endDate);

  //     if (currentTimeGap <= this.serverTimeGap) {
  //       this.rangetime = startDate + " to " + endDate; //pick startDate & endDate to form object for filter
  //       this.selectedFilterValue = startDate + "_" + endDate;
  //       this.fetchDocuments();
  //     }
  //     else {
  //       this.dataService.showInfo("Selected range should not exceed 3 months", "Invalid Range");
  //       this.setCalenderDefaultDates();
  //     }
  //   }
  //   //this.filterList();
  //   //this.setCalenderDefaults();
  // }

  // getTimeGapBetweenDates(startDate, endDate) {
  //   var date1 = new Date(startDate);
  //   var date2 = new Date(endDate);

  //   // To calculate the time difference of two dates
  //   var difference_In_Time = date2.getTime() - date1.getTime();

  //   // To calculate the no. of days between two dates
  //   var difference_In_Days = difference_In_Time / (1000 * 3600 * 24);
  //   return difference_In_Days;
  // }

  //<----------------------------------------------------------------------->
  //<------------------------------NEW CHANGES FOR UTC TIME ISSUE------------->

  setCalenderDefaultDates() {
    this.fromDate = this.calendar.getPrev(this.calendar.getToday(), 'm', 1); //show documents of last 1 month
    this.toDate = this.calendar.getToday();

    if (this.fromDate) {
      this.selectedStartDate = new Date(this.fromDate.year, this.fromDate.month - 1, this.fromDate.day, 0, 0, 0, 0);
    }
    if (this.toDate) {
      this.selectedEndDate = new Date();
    }
    this.rangetime = this.selectedStartDate.toLocaleDateString('en-UK') + " to " + this.selectedEndDate.toLocaleDateString('en-UK');
  }

  onDateSelection(date: NgbDate) {
    if (!this.fromDate && !this.toDate) {
      this.fromDate = date;
    } else if (this.fromDate && !this.toDate && date.after(this.fromDate)) {
      this.toDate = date;
    } else {
      this.toDate = null;
      this.fromDate = date;
    }

    let startDate, endDate;

    if (this.fromDate) {
      startDate = new Date(this.fromDate.year, this.fromDate.month - 1, this.fromDate.day, 0, 0, 0, 0);
    }
    if (this.toDate) {
      endDate = new Date(this.toDate.year, this.toDate.month - 1, this.toDate.day, 23, 59, 59, 59);
    }

    if (startDate && endDate) {
      this.toggleDp();
      let currentTimeGap = this.getTimeGapBetweenDates(startDate, endDate);

      if (currentTimeGap <= this.serverTimeGap) {
        this.selectedStartDate = startDate;
        this.selectedEndDate = endDate;
        this.rangetime = this.selectedStartDate.toLocaleDateString('en-UK') + " to " + this.selectedEndDate.toLocaleDateString('en-UK');
        this.fetchDocuments();
      }
      else {
        this.dataService.showInfo("Selected range should not exceed 3 months", "Invalid Range");
        this.setCalenderDefaultDates();
      }
    }
  }

  getTimeGapBetweenDates(startDate, endDate) {
    // To calculate the time difference of two dates
    let difference_In_Time = endDate.getTime() - startDate.getTime();

    // To calculate the no. of days between two dates
    let difference_In_Days = difference_In_Time / (1000 * 3600 * 24);
    return difference_In_Days;
  }

  getCurrentFilter() {
    this.isDocsFetched = false;
    let corrections = this.formatAndCorrectionList.Correction;
    let formats = this.formatAndCorrectionList.format;

    this.currentFilter = {
      documentInfo: {
        $elemMatch: corrections.length > 0 ? {
          extractionAssist: this.filterValue,
          fieldId: { "$in": corrections }
        } : { extractionAssist: this.filterValue, fieldId: { "$nin": corrections } }
      },
      calledFrom: 'extractionAssist',
      vendorId: formats.length > 0 ? { "$in": formats } : { "$nin": formats },

      lastUpdatedOn: {
        $gte: this.selectedStartDate.getTime(),
        $lte: this.selectedEndDate.getTime()
      }
    }
  }
}
