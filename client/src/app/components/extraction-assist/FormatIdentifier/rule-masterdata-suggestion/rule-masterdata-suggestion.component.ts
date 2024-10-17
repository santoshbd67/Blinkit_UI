import { Component, OnInit, OnDestroy, Output, EventEmitter, Input } from '@angular/core';
import { DataService } from 'src/app/services/data.service';
//import { ExtractionAssistService } from './../../../services/extraction-assist.service';
import { ActivatedRoute } from '@angular/router';
import { ExtractionAssistService } from 'src/app/services/extraction-assist.service';
import { Location } from "@angular/common";
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-rule-masterdata-suggestion',
  templateUrl: './rule-masterdata-suggestion.component.html',
  styleUrls: ['./rule-masterdata-suggestion.component.scss']
})
export class RuleMasterdataSuggestionComponent implements OnInit, OnDestroy {
  resultBasicInfo: any;
  confidenceThreshold: any = 60;
  @Input() vendorPagecalledFrom: any;
  @Output() closeComponent = new EventEmitter();
  @Output() approveSuggestion = new EventEmitter();
  score: number;
  documentId: string;
  projName: string;

  constructor(
    private dataService: DataService,
    private location: Location,
    private activatedRoute: ActivatedRoute,
    private extractionService: ExtractionAssistService,
    private auth: AuthService) {
    this.activatedRoute.queryParams.subscribe((res: any) => {
      this.documentId = res.docIdentifier;
    });
    this.projName = this.auth.getUserSettings("PROJECT_CONFIGURATIONS").projectName;
  }

  isObjectEmpty(obj) {
    return Object.keys(obj).length === 0;
  }

  ngOnInit() {
    this.extractionService.getSuggestions(this.documentId).subscribe(
      res => {
        // suggestions are present
        if (res && res.responseCode === 'OK' && res.result.responseCode == 200 && !(this.isObjectEmpty(res.result.master_data))) {
          // this.approveSuggestion=true
          this.approveSuggestion.emit(true)
          this.resultBasicInfo = res.result.master_data;
          this.score = res.result.master_data.MATCH_SCORE * 100;
          this.setMasterDataKey();
        }
        else {
          this.approveSuggestion.emit(false)
          this.resultBasicInfo = {};
          this.score = 0;
        }
      },
      err => {
        this.approveSuggestion.emit(false)
        console.error("error while fetching the suggestions", err);
      }
    )
  }

  close() {
    if (this.vendorPagecalledFrom === 'ML_Identifier') {
      this.location.back();
    }
    else {
      this.closeComponent.emit();
    }
    this.removeMasterDataKey();
  }

  ngOnDestroy() {
    this.removeMasterDataKey();
  }

  setMasterDataKey() {
    //this key is being read when masterdata is to be deleted
    if (this.vendorPagecalledFrom === 'ML_Identifier') {
      localStorage.setItem("MLID_Data", JSON.stringify(this.resultBasicInfo));
    }
  }

  removeMasterDataKey() {
    if (localStorage.getItem("MLID_Data")) {
      localStorage.removeItem("MLID_Data");
    }
  }

  transFormHeader(header: string) {
    if (header) return header.replace(/([A-Z])/g, " $1").toLocaleUpperCase();
    else return "";
  }

  getColor() {
    if (this.score < this.confidenceThreshold) {
      return '#E74C3C';
    }
    else {
      return '#28B463 '
    }
  }
}
