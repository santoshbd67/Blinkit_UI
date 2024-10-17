import { Location } from "@angular/common";
import { Component, ElementRef, Input, OnInit, EventEmitter, Output, SimpleChanges, ViewChild } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { APIConfig } from 'src/app/config/api-config';
import { AppConfig } from "src/app/config/app-config";
import { DataService } from "src/app/services/data.service";
import { ExtractionAssistService } from 'src/app/services/extraction-assist.service';
import { AuthService } from './../../../../services/auth.service';

@Component({
  selector: 'app-testing-detail-right-view',
  templateUrl: './testing-detail-right-view.component.html',
  styleUrls: ['./testing-detail-right-view.component.scss']
})
export class TestingDetailRightViewComponent implements OnInit {

  @ViewChild("testingDocsDetailForm") mainForm: ElementRef;
  @ViewChild("headerItems") basicForm: ElementRef;
  @ViewChild("tabSet") tabSet;

  @Input() documentDocsList: any;
  @Input() currentDocInfo: any;
  @Output() onBoundingBoxDataReady = new EventEmitter();

  //selected documentId
  docIdentifier: string;

  appConfig = AppConfig;
  apiConfig: any = APIConfig;

  templateFields = [];

  imgSrc: any = {
    dotMenuIcon: "../../../assets/images/dot-menu.svg",
    refreshIcon: "../../../assets/images/refreshing.png",
    deleteIcon: "../../../assets/images/icon-delete.svg",
    resetIcon: "../../../assets/images/reset3.png",
    crossIcon: "../../../assets/images/cross-sign.png",
    plusIcon: "../../../assets/images/icon-plus.svg",
  };

  constructor(
    public dataService: DataService,
    private auth: AuthService,
    private extractionService: ExtractionAssistService,
    private activatedRoute: ActivatedRoute,
    private location: Location,
    private modalService: NgbModal
  ) {
  }

  ngOnChanges(changes: SimpleChanges) {
    this.setTemplateFields();
  }

  ngOnInit() {
    this.activatedRoute.queryParams.subscribe((res) => {
      this.docIdentifier = res.docIdentifier; // docID
    });
  }

  setTemplateFields() {
    if (this.currentDocInfo) {
      this.templateFields = [];
      Object.keys(this.currentDocInfo).forEach(e => {
        let keyName = `${e}`;
        let value = `${this.currentDocInfo[e]}`;
        if (keyName !== 'DocumentId' && keyName !== 'Format' && keyName !== 'Queue' && keyName !== 'FileName') {
          this.templateFields.push({ fieldId: keyName, fieldValue: value, editField: value })
        }
      });
    }
  }

  /* on tab changed 'Header' and Items */
  tabChanged(ev) {

  }

  transFormHeader(header: string) {
    if (header) return header.replace(/([A-Z])/g, " $1").toLocaleUpperCase();
    else return "";
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

   /* set bounding box data */
   setBoundingBoxData(event, fieldData) {
    const data = {
      fieldData: fieldData,
      event: event,
    };
    this.onBoundingBoxDataReady.emit(data);
  }

}
