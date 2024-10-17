import { Component, EventEmitter, Input, OnInit, Output, ElementRef, ViewChild, SimpleChanges, OnChanges } from '@angular/core';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { FormBuilder, FormControl } from '@angular/forms';
import { MatAutocompleteSelectedEvent, MatChipInputEvent, MatAutocomplete } from '@angular/material';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { ChartNewService } from 'src/app/services/chart-new.service';
import { DataService } from 'src/app/services/data.service';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-dashboard-new-filters',
  templateUrl: './dashboard-new-filters.component.html',
  styleUrls: ['./dashboard-new-filters.component.scss']
})
export class DashboardNewFiltersComponent implements OnInit, OnChanges {

  @Output() public closeOutput = new EventEmitter();
  @Input() toggleFilter: boolean;
  @Input() selectedTab: string;
  @Input() clearMainFiltersEmit: boolean;
  @Output() public emitFilters = new EventEmitter();

  closeIcon = "../../../assets/images/cross-sign.png";

  availableFilters: object = {};
  postingStatusList: string[];
  selectedPostingStatus: string;

  selectedSLA: string;
  slaflagList: string[] = ['True', 'False', 'Not Applicable'];

  visible = true;
  selectable = true;
  removable = true;
  addOnBlur = true;
  separatorKeysCodes: number[] = [ENTER, COMMA];

  vendorCtrl = new FormControl();
  filteredVendors: Observable<string[]>;
  vendors: string[] = [];
  originalVendorsList: string[] = []
  modifiedVendorsList: string[] = [];
  @ViewChild('vendorInput') vendorInput: ElementRef<HTMLInputElement>;
  @ViewChild('auto') matAutocomplete: MatAutocomplete;

  billingStateCtrl = new FormControl();
  filteredBillingStates: Observable<string[]>;
  billingStates: string[] = [];
  originalBillingStatesList: string[] = []
  modifiedBillingStatesList: string[] = [];
  @ViewChild('billingStateInput') billingStateInput: ElementRef<HTMLInputElement>;
  @ViewChild('autoBillingUnit') matAutoBillingUnitcomplete: MatAutocomplete;

  selectedDocType;
  documentTypes = [];
  docTypesGroup;
  docTypes = {};

  constructor(private _formBuilder: FormBuilder,
    private chartService: ChartNewService,
    private dataService: DataService,
    private authService: AuthService) {

    this.availableFilters = this.authService.getUserSettings('DSAHBOARD_FILTERS');
    console.log(this.availableFilters);

    if (this.availableFilters["posting"].length > 0) {
      this.postingStatusList = this.availableFilters["posting"][0].values;
    }

    this.setDocumentTypes();

    this.docTypesGroup = this._formBuilder.group(this.docTypes);
  }

  ngOnInit() {
    this.fetchVendors();
    this.fetchBillingUnit();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes && changes.selectedTab && changes.selectedTab.currentValue && !changes.selectedTab.firstChange) {
      this.clearFilters();
    }

    if (changes && changes.clearMainFiltersEmit && changes.clearMainFiltersEmit.currentValue) {
      this.clearFilters();
    }
  }

  setDocumentTypes() {
    let orgAndDocType = this.dataService.getOrgAndDocType();
    let docTypeOptions = JSON.parse(orgAndDocType.DOCTYPE_OPTIONS);
    docTypeOptions.forEach(element => {
      this.documentTypes.push(element.docType)
    });

    this.documentTypes.forEach(element => {
      this.docTypes[element] = false
    });
  }

  //<----------------------xxxxxxVendor Name Method Startsxxxxxxx------------------------------->

  fetchVendors() {
    this.chartService.getVendorsList().subscribe((response) => {
      if (response && response.responseCode == 'OK' && response.result && response.result.responseCode == 200) {
        //console.log(response.result.vendors);
        this.modifiedVendorsList = response.result.vendors;
        this.originalVendorsList = JSON.parse(JSON.stringify(response.result.vendors));

        this.filteredVendors = this.vendorCtrl.valueChanges.pipe(startWith(null),
          map((vendor: string | null) => vendor ? this._filter(vendor) : this.modifiedVendorsList.slice()));
      }
    },
      err => {
        console.log("Error while fetching Vendors");
        console.log(err);
      })
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.modifiedVendorsList.filter(vendor => vendor.toLowerCase().indexOf(filterValue) === 0);
  }

  add(event: MatChipInputEvent): void {
    // Add vendor only when MatAutocomplete is not open
    // To make sure this does not conflict with OptionSelected Event
    if (!this.matAutocomplete.isOpen) {
      const input = event.input;
      const value = event.value;

      // Add our vendor
      if ((value || '').trim()) {
        this.vendors.push(value.trim());
      }

      // Reset the input value
      if (input) {
        input.value = '';
      }

      this.vendorCtrl.setValue(null);
    }
  }

  remove(vendor: string): void {
    const index = this.vendors.indexOf(vendor);

    if (index >= 0) {
      this.vendors.splice(index, 1);
      this.modifiedVendorsList.push(vendor)
      this.vendorCtrl.setValue(null);
    }
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    this.vendors.push(event.option.viewValue);
    this.vendorInput.nativeElement.value = '';
    this.vendorCtrl.setValue(null);
    this.updateAllVendorsList(event.option.viewValue)
  }

  //<----------------------xxxxxxVendor Name Method Endsxxxxxxxxxx------------------------------->

  //<----------------------xxxxxxBilling Unit Method Startsxxxxxxx---------------------------->

  fetchBillingUnit() {
    this.chartService.getBillingStatesList().subscribe((response) => {
      if (response && response.responseCode == 'OK' && response.result && response.result.responseCode == 200) {
        const list = response.result.billing_units
        this.originalBillingStatesList = JSON.parse(JSON.stringify(list));
        this.modifiedBillingStatesList = list;
        this.filteredBillingStates = this.billingStateCtrl.valueChanges.pipe(startWith(null),
          map((billingState: string | null) => billingState ? this._filterbillingState(billingState) : this.modifiedBillingStatesList.slice()));
      }
    },
      err => {
        console.log("Error while fetching BillingStates");
        console.log(err);
      })
  }

  private _filterbillingState(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.modifiedBillingStatesList.filter(BillingState => BillingState.toLowerCase().indexOf(filterValue) === 0);
  }

  addBillingState(event: MatChipInputEvent): void {
    // Add billingState only when matAutoBillingUnitcomplete is not open
    // To make sure this does not conflict with OptionSelected Event
    if (!this.matAutoBillingUnitcomplete.isOpen) {
      const input = event.input;
      const value = event.value;

      // Add our billingState
      if ((value || '').trim()) {
        this.billingStates.push(value.trim());
      }

      // Reset the input value
      if (input) {
        input.value = '';
      }

      this.billingStateCtrl.setValue(null);
    }
  }

  removeBillingState(billingState: string): void {
    const index = this.billingStates.indexOf(billingState);

    if (index >= 0) {
      this.billingStates.splice(index, 1);
      this.modifiedBillingStatesList.push(billingState)
      this.billingStateCtrl.setValue(null);
    }
  }

  selectedBillingState(event: MatAutocompleteSelectedEvent): void {
    this.billingStates.push(event.option.viewValue);
    this.billingStateInput.nativeElement.value = '';
    this.billingStateCtrl.setValue(null);
    this.updateAllBillingStatesList(event.option.viewValue)
  }

  updateAllBillingStatesList(billingState) {
    const index = this.modifiedBillingStatesList.indexOf(billingState);
    if (index !== -1) {
      this.modifiedBillingStatesList.splice(index, 1);
    }
  }

  //<-------------------xxxxxxxBilling Unit Method Endsxxxxxxxx------------------------->

  closeFilters() {
    if (this.toggleFilter) {
      this.closeOutput.emit({ close: true, save: false });
    }
  }

  applyFilters() {
    let emitObj = {}
    let docTypeArray = []

    if (this.vendors.length > 0) {
      emitObj['vendor_name'] = this.vendors
    }

    if (this.billingStates.length > 0) {
      emitObj['billing_state'] = this.billingStates
    }

    if (this.selectedSLA != undefined) {
      emitObj['sla_flag'] = this.selectedSLA
    }

    if (this.selectedPostingStatus != undefined) {
      emitObj['posting_status'] = this.selectedPostingStatus
    }

    if (this.docTypesGroup && this.docTypesGroup.value) {
      for (let key in this.docTypesGroup.value) {
        if (this.docTypesGroup.value[key]) {
          docTypeArray.push(key)
        }
      }
    }

    if (docTypeArray.length > 0) {
      emitObj['doc_type'] = docTypeArray
    }

    this.emitFilters.emit(emitObj);
    this.closeFilters()
  }

  clearFilters() {
    this.selectedSLA = undefined;

    this.vendors = [];
    this.modifiedVendorsList = this.originalVendorsList;
    this.vendorCtrl.setValue(null);

    this.billingStates = [];
    this.modifiedBillingStatesList = this.originalBillingStatesList;
    this.billingStateCtrl.setValue(null);

    this.selectedPostingStatus = undefined;

    this.clearDocType();
    this.applyFilters();
  }

  clearDocType() {
    for (let key in this.docTypesGroup.value) {
      this.docTypesGroup.get(key).reset(false) //.value=false
    }
  }

  updateAllVendorsList(vendor) {
    const index = this.modifiedVendorsList.indexOf(vendor);
    if (index !== -1) {
      this.modifiedVendorsList.splice(index, 1);
    }
  }

  onChange($event) {
    console.log(this.docTypesGroup.value);
    // this.emitFilters.emit({ sla_flag: $event.value });
  }
}
