import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { DataService } from './../../../../services/data.service';
import { ExtractionAssistService } from './../../../../services/extraction-assist.service';

@Component({
  selector: 'app-testing-doc-detailview',
  templateUrl: './testing-doc-detailview.component.html',
  styleUrls: ['./testing-doc-detailview.component.scss']
})
export class TestingDocDetailviewComponent implements OnInit {

  @Output() close = new EventEmitter<string>();
  @Input() documentDocsList: any;
  @Input() currentDocInfo: any;
  @Input() currentIndex: number;

  public dialogWidth: string = '98%';
  public dialogHeight: string = '98%';
  public isShown: boolean = true;

  filteredInvoiceImages: any;
  docIdentifier = "";
  boundingBoxData: any;
  documentMetadata: any;
  docStatus: any;

  isPrevDisabled: boolean = false;
  isNextDisabled: boolean = false;

  display = "block";

  constructor(private dataService: DataService,
    private extractionService: ExtractionAssistService,) { }

  ngOnInit() {
    if (this.currentIndex == 0) {
      this.isPrevDisabled = true;
    }
    if (this.currentIndex == this.documentDocsList.length - 1) {
      this.isNextDisabled = true;
      this.isPrevDisabled = false;
    }
    this.docIdentifier = this.currentDocInfo.DocumentId;
    this.getDocumentMetadata();
  }

  closeDialog() {
    this.close.emit('close');
  }

  nextRecord() {
    let next = (this.currentIndex += 1);
    if (next > this.documentDocsList.length - 1) {
      this.currentIndex = this.documentDocsList.length - 1;
      this.isNextDisabled = true;
      this.isPrevDisabled = false;
      return;
    }
    if (next == this.documentDocsList.length - 1) {
      this.isNextDisabled = true;
      this.isPrevDisabled = false;
    }
    if (this.currentIndex > 0) {
      this.isPrevDisabled = false;
    }
    let nextRecord = this.documentDocsList[next];
    this.currentDocInfo = nextRecord;

    this.docIdentifier = this.currentDocInfo.DocumentId;
    this.getDocumentMetadata();
  }

  previousRecord() {
    let next = (this.currentIndex -= 1);
    if (next < 0) {
      this.currentIndex = 0;
      this.isPrevDisabled = true;
      return;
    }
    if (next == 0) {
      this.isPrevDisabled = true;
      this.isNextDisabled = false;
    }
    if (this.currentIndex > 0) {
      this.isNextDisabled = false;
    }
    let nextRecord = this.documentDocsList[next];
    this.currentDocInfo = nextRecord;

    this.docIdentifier = this.currentDocInfo.DocumentId;
    this.getDocumentMetadata();
  }

  getDocumentMetadata() {
    if (this.docIdentifier) {
      this.dataService.getDocument(this.docIdentifier).subscribe(res => {
        if (res && res.result && res.result.document) {
          this.documentMetadata = res.result.document;
          if (res.result.document.pages) {
            this.filteredInvoiceImages = [];
            let allImagesFetch = [];
            res.result.document.pages.forEach(element => {
              allImagesFetch.push(this.getBlobURL(element.url).toPromise());
            });

            Promise.all(allImagesFetch)
              .then(res2 => {
                this.filteredInvoiceImages = res2.map((each, index) => {
                  return { index: index, url: each.result.blobURL };
                });
              })
              .catch(err => {
                this.dataService.showError(
                  "error while fetching invoice images",
                  "Error"
                );
              });
          }
          if (res.result.document.status) {
            this.docStatus = res.result.document.status;
          }
        }
      });
    } else {
      this.dataService.showError("error loading the document", "Error");
    }
  }

  getBlobURL(relativePath) {
    const fileName = relativePath.substring(relativePath.lastIndexOf('/'), relativePath.length);
    let data = {
      container: 'preprocessor',
      blobName: fileName,
      fullPath: relativePath,
      storageType: "azure"
    };
    return this.dataService.getBlobURL(data);
  }

  onBoundingBoxDataReady(data) {
    this.dataService.hideCroppedImageContainer();
    this.boundingBoxData = data;
  }

  closePreview(id){

  }

  onCloseHandled() {
    this.display = 'none';
    this.closeDialog();
  }

  currentSize(data) {
    if (data) {
      
    }
  }
}
