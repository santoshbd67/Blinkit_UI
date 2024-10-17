import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { DataService } from 'src/app/services/data.service';
import { ExtractionAssistService } from './../../../../services/extraction-assist.service';

@Component({
  selector: 'app-field-selection',
  templateUrl: './field-selection.component.html',
  styleUrls: ['./field-selection.component.scss']
})
export class FieldSelectionComponent implements OnInit {
  resultBasicInfo: any;
  @Input() documentResult: any;
  @Input() documentMetadata: any;
  @Input() confidenceThreshold: any;
  @Input() masterDataCreateStatus: boolean;
  @Input() selectedfields: any;

  totalSelectedCheckBox = [];
  @Output() Object_PathFinder = new EventEmitter<any>(null);
  @Output() onBoundingBoxDataReady = new EventEmitter();
  requiredObject_PathFinder = {
    Format: '',
    Fields: []
  }

  constructor(private dataService: DataService,
    private extractionService: ExtractionAssistService) { }

  ngOnInit() {
    if (this.selectedfields && this.selectedfields.Fields !== undefined) {
      this.totalSelectedCheckBox = this.selectedfields.Fields;
    }
    else {
      this.totalSelectedCheckBox = this.documentResult.document.documentInfo.filter((doc) => {
        if (doc.correctedValue !== undefined && doc.extractionAssist == 0) {
          return doc
        }
      })
    }

    this.requiredObject_PathFinder.Fields = this.totalSelectedCheckBox;
    this.requiredObject_PathFinder.Format = this.documentMetadata ? this.documentMetadata.vendorId : '';

    this.resultBasicInfo = this.documentResult.document.documentInfo.filter((doc) => {
      //const index: number = this.totalSelectedCheckBox.indexOf(doc);
      const index: number = this.totalSelectedCheckBox.findIndex(x => x.fieldId === doc.fieldId);
      if (doc.correctedValue !== undefined && doc.extractionAssist == 0) {
        if (index >= 0) {
          doc.checked = true;
        }
        else {
          doc.checked = false;
        }
        return doc;
      }
    })

    this.Object_PathFinder.emit(this.requiredObject_PathFinder);
  }

  onCheckboxChange(data, event) {

    if (event.target.checked) {
      this.totalSelectedCheckBox.push(data);
    } else {
      //const index: number = this.totalSelectedCheckBox.indexOf(data);
      const index: number = this.totalSelectedCheckBox.findIndex(x => x.fieldId === data.fieldId);
      this.totalSelectedCheckBox.splice(index, 1)
    }
    this.requiredObject_PathFinder.Fields = this.totalSelectedCheckBox;
    this.requiredObject_PathFinder.Format = this.documentMetadata.vendorId;
    this.Object_PathFinder.emit(this.requiredObject_PathFinder)
    //this.extractionService.setfileSelectionData(this.documentMetadata.vendorId, this.totalSelectedCheckBox)
  }

  modifyTitle(title) {
    if (title && typeof title) {
      return title.replace(/([A-Z])/g, " $1");
    } else {
      return "";
    }
  }

  /* set bounding box data */
  setBoundingBoxData(event, fieldData, shouldOpen) {
    const data = {
      fieldData: fieldData,
      event: event,
      shouldOpen: shouldOpen
    };
    this.onBoundingBoxDataReady.emit(data);
  }
}
