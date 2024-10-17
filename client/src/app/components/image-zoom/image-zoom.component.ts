import { Component, OnInit, Input, OnChanges, SimpleChange, ViewChild, ElementRef, Output, EventEmitter, AfterViewInit } from '@angular/core';
import { ExtractionAssistService } from 'src/app/services/extraction-assist.service';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from './../../services/auth.service';
import { DataService } from './../../services/data.service';

declare var window;
@Component({
  selector: 'app-image-zoom',
  templateUrl: './image-zoom.component.html',
  styleUrls: ['./image-zoom.component.scss'],
  host: {
    '(window:resize)': 'onResize($event)'
  }
})
export class ImageZoomComponent implements OnInit, OnChanges {
  @ViewChild('imageContainer', null) imageContainer: ElementRef;
  @ViewChild('highlighter', null) highlighter: ElementRef;
  @ViewChild('originalImage', null) originalImage: ElementRef;

  @Input('boundingData') boundingData: Object;
  @Input('imageUrl') imageUrl: string;
  @Input('pageNumber') pageNumber: string;
  @Input('totalPages') totalPages: string;
  @Input('scrollParentSelector') scrollParentSelector: string;
  @Input('canvasId') canvasId: string;
  @Input('canvasContainer') canvasContainer: string;
  @Input() linesVisibility: any;
  @Input('fieldsData') fieldsData;
  @Input() enablePointAndShootFor: any;
  @Output() selectedLineText = new EventEmitter();
  @Input('calledFrom') calledFrom: any
  @Input('activeLineText') activeLineText: Object;
  @Input('statusOfEnableZoom') statusOfEnableZoom: Object;
  @Input('splitSizes') splitSizes: Object;

  image: string;
  thumbnail: string;
  actualImageWidth: number;
  actualImageHeight: number;
  xAxisAdjust = -15;
  yAxisAdjust = -12;
  heightAdjust = 5;
  widthAdjust = 5;
  paddingTop = 140;

  presentBoundingData: any;
  documentLines = [];
  docIdentifier;
  selectedContent: string;
  highlightedBoxFor: any;

  selectedIds = [];
  mappedFields = [];
  reloadCount = 1;
  isPointAndShootEnabled: number;

  constructor(
    private extractionService: ExtractionAssistService,
    private authService: AuthService,
    private dataService: DataService,
    private router: Router,
    private activatedRoute: ActivatedRoute,) { }

  ngOnInit() {
    if (this.authService.getUserSettings('POINT_AND_SHOOT_VISIBILITY') === 0) {
      this.isPointAndShootEnabled = 0;
    } else if (this.authService.getUserSettings('POINT_AND_SHOOT_VISIBILITY') === 1) {
      this.isPointAndShootEnabled = 1;
    };

    this.setImagePath()
    this.getImageDimensions();
    this.getDocumentId();
  }

  getDocumentId() {
    //let routerName = this.router.url.split("?")[0];
    this.activatedRoute.queryParams.subscribe((res) => {
      this.docIdentifier = res.docIdentifier;
    });
  }

  ngOnChanges(change) {
    if (change.boundingData && change.boundingData.currentValue) {
      this.highlightArea(change.boundingData.currentValue);
      this.dataService.showHighlighterDiv();
    }

    //TODO enable for POINT AND SHOOT
    if (this.isPointAndShootEnabled === 1 && localStorage.getItem("extractedLines")) {
      this.showAllBoundingBoxes();
      this.hideAllBoundingBoxes();
    }

    if (change.statusOfEnableZoom) {
      if (change.statusOfEnableZoom.currentValue) {
        this.isPointAndShootEnabled = 0;
        this.hideImageCropper();
      }
      else {
        if (change.statusOfEnableZoom.currentValue == false) {
          this.isPointAndShootEnabled = 1;
          this.dataService.hideCroppedImageContainer();
        } else {
          if (this.authService.getUserSettings('DEFAULT_FUNCTIONALITY') == 'pointAndShoot') {
            this.isPointAndShootEnabled = 1;
          } else {
            this.isPointAndShootEnabled = 0;
            this.hideImageCropper();
          }
        }
      }
    }

    if (change.splitSizes && change.splitSizes.currentValue) {
      this.updateBoundingBoxes();
      this.dataService.hideCroppedImageContainer();
      this.dataService.hideHighligherDiv();

      let activeInput = document.activeElement as HTMLElement;
      if (activeInput)
        activeInput.blur();
    }
  }

  hideImageCropper() {
    localStorage.setItem("extractedLines", "invisible");
    this.hideAllBoundingBoxes();
    this.dataService.hideCroppedImageContainer();
  }

  highlightArea(data) {
    if (data) {
      const fieldData = data.fieldData;
      const eventTrigger = data.event;
      this.presentBoundingData = fieldData;

      if (fieldData) {
        this.highlightedBoxFor = { fieldData: fieldData, index: data.index };
        this.drawBoundingBox(fieldData, data);
        this.createImageCrop(fieldData, eventTrigger, data);
      }
    }
  }

  getBoundingBox(fieldData, data) {
    let dedicatedBox;
    if (data.shouldOpen && data.shouldOpen == 'boundingBox') {
      dedicatedBox = fieldData.boundingBox;
    }
    else if (data.shouldOpen && data.shouldOpen == 'correctedBoundingBox') {
      dedicatedBox = fieldData.correctedBoundingBox;
    }
    else if (fieldData.correctedBoundingBox) {
      dedicatedBox = fieldData.correctedBoundingBox;
    }
    else {
      dedicatedBox = fieldData.boundingBox;
    }
    return dedicatedBox;
  }

  createImageCrop(fieldData, eventTrigger, data) {
    if (parseInt(fieldData.pageNumber) !== parseInt(this.pageNumber) + 1) {
      return;
    }

    let dedicatedBox = this.getBoundingBox(fieldData, data);

    const boundingBox = dedicatedBox;//fieldData.correctedBoundingBox ? fieldData.correctedBoundingBox : fieldData.boundingBox;
    if (!boundingBox) {
      return;
    }

    const left = Number(boundingBox.left);
    const right = Number(boundingBox.right);
    const top = Number(boundingBox.top);
    const bottom = Number(boundingBox.bottom);

    const width = right - left;
    const height = bottom - top;
    const image = this.originalImage.nativeElement;
    const targetWidth = width / 2;
    const targetHeight = height / 2;

    const canvas = document.getElementById(this.canvasId);
    const context = (canvas as any).getContext("2d");
    context.clearRect(0, 0, width, height);

    // (canvas as any).width = targetWidth + 10;
    // (canvas as any).height = targetHeight + 20;
    //context.drawImage(image, left, top, width, height, 10, 10, targetWidth, targetHeight);

    (canvas as any).width = targetWidth;
    (canvas as any).height = targetHeight;
    context.drawImage(image, left, top, width, height, 0, 0, targetWidth, targetHeight);

    if (eventTrigger) {
      const targetElement = eventTrigger.target;
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;
      // const targetTop = windowHeight - targetElement.getBoundingClientRect().top;
      const targetTop = targetElement.getBoundingClientRect().bottom;
      let targetLeft = targetElement.getBoundingClientRect().left;

      if (targetWidth + targetLeft + 50 > windowWidth) {
        targetLeft = (windowWidth - targetWidth - 90)
      }

      document.getElementById(this.canvasContainer).style.display = 'block';
      document.getElementById(this.canvasContainer).style.top = targetTop + "px";
      document.getElementById(this.canvasContainer).style.left = targetLeft + "px";
    }
  }

  drawBoundingBox(fieldData, data) {
    if (parseInt(fieldData.pageNumber) !== parseInt(this.pageNumber) + 1) {
      this.resetHighlightPosition();
      return;
    }
    let dedicatedBox = this.getBoundingBox(fieldData, data);
    const boundingBox = dedicatedBox;//fieldData.correctedBoundingBox ? fieldData.correctedBoundingBox : fieldData.boundingBox;
    if (!boundingBox) {
      this.resetHighlightPosition();
      return;
    }
    const imageScaleRatio = this.calculateImageScaleRatio();
    const scaledBox = this.calculateScaledPositions(imageScaleRatio, boundingBox);
    const height = scaledBox.bottom - scaledBox.top + this.heightAdjust;
    const width = scaledBox.right - scaledBox.left + this.widthAdjust;

    this.highlighter.nativeElement.style.top = scaledBox.top - (this.yAxisAdjust * imageScaleRatio.verticalRatio) + 'px';
    this.highlighter.nativeElement.style.left = scaledBox.left - (this.xAxisAdjust * imageScaleRatio.horizontalRatio) + 'px';
    this.highlighter.nativeElement.style.width = width + 'px';
    this.highlighter.nativeElement.style.height = height + 'px';

    this.scrollToPerticularPage(scaledBox, imageScaleRatio);
  }

  // scroll to perticular page
  scrollToPerticularPage(scaledBox, imageScaleRatio) {
    document.getElementById('scrollContainer').scrollTop = 0;
    let offset_top = scaledBox.top - (this.yAxisAdjust * imageScaleRatio.verticalRatio);
    this.scrollToElementById("image-zoom_" + this.pageNumber, offset_top);
  }

  scrollToElementById(id: string, offset: number) {
    const element = <HTMLElement>document.querySelector(`#${id}`);
    if (element) {
      var elementPosition = Math.abs(element.getBoundingClientRect().top);
      var offsetPosition = elementPosition + offset - this.paddingTop;
      document.getElementById('scrollContainer').scrollTop = offsetPosition;
    }
    else {
      console.log("unable to find element by id", element, id);
    }
  }

  resetHighlightPosition() {
    if (this.highlighter)
      this.highlighter.nativeElement.style.left = '-10000px';
  }

  calculateScaledPositions(scale, boundingBox) {
    const scaledBox = {
      left: Number(boundingBox.left) * scale.horizontalRatio,
      right: Number(boundingBox.right) * scale.horizontalRatio,
      top: Number(boundingBox.top) * scale.verticalRatio,
      bottom: Number(boundingBox.bottom) * scale.verticalRatio
    };
    return scaledBox;
  }

  calculateImageScaleRatio() {
    const horizontalRatio = this.imageContainer.nativeElement.offsetWidth / this.actualImageWidth;
    const verticalRatio = this.imageContainer.nativeElement.offsetHeight / this.actualImageHeight;
    return {
      horizontalRatio: horizontalRatio,
      verticalRatio: verticalRatio
    }
  }

  getImageDimensions() {
    var img = new Image();
    img.onload = (event) => {
      this.actualImageWidth = img.width;
      this.actualImageHeight = img.height;
    }
    img.src = this.image;
  }

  setImagePath() {
    this.image = this.imageUrl;
    this.thumbnail = this.imageUrl;
  }

  onResize(event) {
    this.highlightArea(this.presentBoundingData);
  }

  onFullImageLoaded(event) {
    // TODO enable for POINT and SHOOT
    if ((this.isPointAndShootEnabled === 1) && event && (Number(this.totalPages) - 1 === Number(this.pageNumber))) {
      this.drawAllLinesOverImage();
    }
  }

  updateBoundingBoxes() {
    this.documentLines.forEach((element, index) => {
      this.scaleBoundingBoxes(element, document.getElementById(element.ID))
    });
  }

  scaleBoundingBoxes(fieldData, highlighter) {
    const boundingBox = fieldData.boundingBox;
    if (!boundingBox) {
      this.resetHighlightPosition();
      return;
    }
    const imageScaleRatio = this.calculateImageScaleRatio();
    const scaledBox = this.calculateScaledPositionsNew(imageScaleRatio, boundingBox);
    const height = scaledBox.bottom - scaledBox.top + this.heightAdjust;
    const width = scaledBox.right - scaledBox.left + this.widthAdjust;

    highlighter.style.top = scaledBox.top - (this.yAxisAdjust * imageScaleRatio.verticalRatio) + 'px';
    highlighter.style.left = scaledBox.left - (this.xAxisAdjust * imageScaleRatio.horizontalRatio) + 'px';
    highlighter.style.width = width + 'px';
    highlighter.style.height = height + 'px';
  }

  //======================XXXXXXX=====Point and shoot method starts=====XXXXXXX==================

  // code for highlighting all line bounding boxes
  drawAllLinesOverImage() {
    this.getOCRData();
  }

  getOCRData() {
    this.extractionService.getOCRLines({ document_id: this.docIdentifier }).subscribe((res) => {
      if (res && res.responseCode == "OK" && res.result.status == "Success") {
        this.documentLines = res.result.documentLines;
        this.documentLines.forEach((element, index) => {
          this.drawBoundingBoxNew(element, element.ID);
        });
      }
      // else { // TODO remove this else later
      //   this.documentLines = [{
      //     "line_num": 0,
      //     "line_text": "GO DESI",
      //     "ID": "1_0",
      //     "fieldValue": "GO DESI",
      //     "editField": "GO DESI",
      //     "boundingBox": {
      //       "left": 292,
      //       "right": 1420,
      //       "top": 837,
      //       "down": 1861
      //     }
      //   },
      //   {
      //     "line_num": 1,
      //     "line_text": "GO DESI",
      //     "ID": "1_1",
      //     "fieldValue": "GO DESI",
      //     "editField": "GO DESI",
      //     "boundingBox": {
      //       "left": 1915,
      //       "right": 2133,
      //       "top": 591,
      //       "down": 619
      //     }
      //   }
      //   ];
      //   this.documentLines.forEach((element, index) => {
      //     this.drawBoundingBoxNew(element, element.ID);
      //   });
      // }
    }, err => {
      console.log(err);
    })
  }

  drawBoundingBoxNew(fieldData, divId) {

    if (!document.getElementById(divId)) {
      //create dynamic divs and append to the image container
      var dynamicDiv = document.createElement("div");
      dynamicDiv.className = 'extraction_div';
      dynamicDiv.setAttribute('id', divId);
      dynamicDiv.setAttribute('style', "display:none");

      //console.log(document.getElementById('imgContainer')) // TODO updated imgContainer to image-zoom_pageNo for mutipage invoice
      document.getElementById('image-zoom_' + fieldData.page_num).appendChild(dynamicDiv);
      //document.getElementById('imgContainer').appendChild(dynamicDiv);

      // assign event listners to the each div(highlighter)
      let highlighter = document.getElementById(divId);
      highlighter.addEventListener('click', (e) => {
        this.handleClick(e);
      });
      highlighter.addEventListener('mouseover', (e) => {
        this.handleMouseOver(e);
      });
      highlighter.addEventListener('mouseout', (e) => {
        this.handleMouseOut(e);
      });

      // scale bounding boxes according to the image height and width
      const boundingBox = fieldData.boundingBox;
      if (!boundingBox) {
        this.resetHighlightPosition();
        return;
      }
      const imageScaleRatio = this.calculateImageScaleRatio();
      const scaledBox = this.calculateScaledPositionsNew(imageScaleRatio, boundingBox);
      const height = scaledBox.bottom - scaledBox.top + this.heightAdjust;
      const width = scaledBox.right - scaledBox.left + this.widthAdjust;

      highlighter.style.top = scaledBox.top - (this.yAxisAdjust * imageScaleRatio.verticalRatio) + 'px';
      highlighter.style.left = scaledBox.left - (this.xAxisAdjust * imageScaleRatio.horizontalRatio) + 'px';
      highlighter.style.width = width + 'px';
      highlighter.style.height = height + 'px';

      // scroll to perticular page
      // document.getElementById('scrollContainer').scrollTop = 0;
      // let offset_top = scaledBox.top - (this.yAxisAdjust * imageScaleRatio.verticalRatio);
      // this.scrollToElementById("image-zoom_" + this.pageNumber, offset_top);
    }
  }

  handleClick(e) {
    if (this.calledFrom == 'extraction-assist') {
      const divId = e.target.id;
      let divContent = this.getObjectFromSelectedDiv(divId);
      let data = {
        selectedboxObj: divContent[0]
      }
      // this.updateBoxColor(divId);
      this.selectedLineText.emit(data);
    } else {
      const divId = e.target.id;

      this.updateStatusOfBox(divId);
      let divContent = this.getObjectFromSelectedDiv(divId);

      if (divContent) {
        this.selectedContent = divContent[0].line_text.trim();
        let data = {
          selectedTextField: this.highlightedBoxFor.fieldData,
          index: this.highlightedBoxFor.index,
          selectedBoxText: this.selectedContent,
          selectedboxObj: divContent[0]
        }
        this.updateBoxColor(divId);
        this.selectedLineText.emit(data);
      }
    }
  }

  handleMouseOver(e) {
    const divId = e.target.id;
    let currentDiv = document.getElementById(divId);
    currentDiv.style.cursor = 'pointer';
    currentDiv.style.opacity = '0.5';
  }

  handleMouseOut(e) {
    const divId = e.target.id;
    let currentDiv = document.getElementById(divId);
    currentDiv.style.opacity = '0.15';
  }
  // old method
  // updateBoxColor(divId) {
  //   this.mappedFields = [];
  //   const index: number = this.fieldsData.findIndex(x => x.fieldValue === this.highlightedBoxFor.fieldData.fieldId);
  //   if (this.fieldsData[index].state.resetFieldValueData) {
  //     this.selectedIds.forEach(e => { e.associatedFields = e.associatedFields.filter(e => e !== this.fieldsData[index].fieldValue) })
  //   }

  //   this.mappedFields.push(this.highlightedBoxFor.fieldData.fieldId);
  //   let obj = this.selectedIds.filter(e => { return e.boxId === divId })

  //   if (obj && obj.length > 0) {
  //     if (!obj[0].associatedFields.includes(this.highlightedBoxFor.fieldData.fieldId)) {
  //       obj[0].associatedFields.push(this.highlightedBoxFor.fieldData.fieldId);
  //       this.mappedFields = obj[0].associatedFields;
  //     }
  //     else {
  //       obj[0].associatedFields = obj[0].associatedFields.filter(e => e !== this.highlightedBoxFor.fieldData.fieldId);
  //     }
  //   }

  //   if (!this.selectedIds.some(e => e.boxId === divId)) {
  //     this.selectedIds.push({ boxId: divId, associatedFields: this.mappedFields })
  //   }

  //   this.selectedIds.forEach(element => {
  //     let boxDiv = document.getElementById(element.boxId);
  //     if (element.associatedFields.length > 0) {
  //       boxDiv.style.background = "#5DADE2"; // lightblue
  //       boxDiv.style.border = "2px solid green";
  //       boxDiv.style.cursor = 'pointer';
  //     }
  //     else {
  //       boxDiv.style.background = "#F1C40F"; // original color
  //       boxDiv.style.border = "1px dashed black";
  //     }
  //   });
  // }

  //updated by gaurav
  updateBoxColor(divId) {
    this.mappedFields = [];
    // const index: number = this.fieldsData.findIndex(x => x.fieldValue === this.highlightedBoxFor.fieldData.fieldId);
    const index: number = this.fieldsData.findIndex(x => x.fieldValue === (this.highlightedBoxFor.index >= 0 ? this.highlightedBoxFor.fieldData.fieldId + '_' + (this.highlightedBoxFor.index + 1) : this.highlightedBoxFor.fieldData.fieldId));

    if (this.fieldsData[index].state.resetFieldValueData) {
      this.selectedIds.forEach(e => { e.associatedFields = e.associatedFields.filter(e => e !== this.fieldsData[index].fieldValue) })
    }

    // this.mappedFields.push(this.highlightedBoxFor.fieldData.fieldId);
    this.mappedFields.push(this.highlightedBoxFor.index >= 0 ? this.highlightedBoxFor.fieldData.fieldId + '_' + (this.highlightedBoxFor.index + 1) : this.highlightedBoxFor.fieldData.fieldId);

    let obj = this.selectedIds.filter(e => { return e.boxId === divId })

    if (obj && obj.length > 0) {
      if (!obj[0].associatedFields.includes(this.highlightedBoxFor.index >= 0 ? this.highlightedBoxFor.fieldData.fieldId + '_' + (this.highlightedBoxFor.index + 1) : this.highlightedBoxFor.fieldData.fieldId)) {
        obj[0].associatedFields.push(this.highlightedBoxFor.index >= 0 ? this.highlightedBoxFor.fieldData.fieldId + '_' + (this.highlightedBoxFor.index + 1) : this.highlightedBoxFor.fieldData.fieldId);
        this.mappedFields = obj[0].associatedFields;
      }
      else {
        obj[0].associatedFields = obj[0].associatedFields.filter(e => e !== (this.highlightedBoxFor.index >= 0 ? this.highlightedBoxFor.fieldData.fieldId + '_' + (this.highlightedBoxFor.index + 1) : this.highlightedBoxFor.fieldData.fieldId));
      }
    }

    if (!this.selectedIds.some(e => e.boxId === divId)) {
      this.selectedIds.push({ boxId: divId, associatedFields: this.mappedFields })
    }

    this.selectedIds.forEach(element => {
      let boxDiv = document.getElementById(element.boxId);
      if (element.associatedFields.length > 0) {
        boxDiv.style.background = "#5DADE2"; // lightblue
        boxDiv.style.border = "2px solid green";
        boxDiv.style.cursor = 'pointer';
      }
      else {
        boxDiv.style.background = "#F1C40F"; // original color
        boxDiv.style.border = "1px dashed black";
      }
    });
  }

  updateStatusOfBox(divId) {

    if (this.documentLines && this.documentLines.length > 0) {
      this.documentLines.filter((obj) => {
        if (obj.ID === divId) {
          if (obj.status) {
            if (obj.status == 'unselected') {
              obj["status"] = "selected";
            }
            else {
              obj["status"] = "unselected";
            }
          }
          else {
            obj["status"] = "selected";
          }
          return;
        }
      })
    }
    return;
  }

  getObjectFromSelectedDiv(divId) {
    let obj;
    if (this.documentLines && this.documentLines.length > 0) {
      obj = this.documentLines.filter((obj) => {
        return obj.ID === divId;
      })
    }
    return obj;
  }

  calculateScaledPositionsNew(scale, boundingBox) {
    const scaledBox = {
      left: Number(boundingBox.left) * scale.horizontalRatio,
      right: Number(boundingBox.right) * scale.horizontalRatio,
      top: Number(boundingBox.top) * scale.verticalRatio,
      bottom: Number(boundingBox.down) * scale.verticalRatio
    };
    return scaledBox;
  }

  showAllBoundingBoxes() {
    let visibility = localStorage.getItem("extractedLines");
    if (visibility == 'visible') {
      this.documentLines.forEach(element => {
        let div = document.getElementById(element.ID);
        if (div) {
          div.style.display = 'block';
        }
      });
    }
  }

  hideAllBoundingBoxes() {
    let visibility = localStorage.getItem("extractedLines");
    if (visibility == 'invisible') {
      this.documentLines.forEach(element => {
        let div = document.getElementById(element.ID);
        div.style.display = 'none';
      });
    }
  }

  //=========================XXXXXXX==Point and shoot method ends===XXXXXXXX====================
}
