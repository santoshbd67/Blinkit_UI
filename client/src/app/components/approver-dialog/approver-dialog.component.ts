import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { DataService } from 'src/app/services/data.service';

@Component({
  selector: 'app-approver-dialog',
  templateUrl: './approver-dialog.component.html',
  styleUrls: ['./approver-dialog.component.scss']
})
export class ApproverDialogComponent implements OnInit {

  @Input() headerText: any;
  @Input() bodyContent: any = { message: '', documentId: '', showTemplate: false };
  @Output() submitData = new EventEmitter<any>();

  approveComment = '';

  constructor(public activeModal: NgbActiveModal, private dataService: DataService) { }

  ngOnInit() {
    this.getApproverComments();
  }

  dismissModal() {
    this.activeModal.close();
  }

  onClickYes() {
    this.submitData.emit({
      result: 'success',
      approveComment: this.approveComment
    })
  }

  getApproverComments() {
    let key = {
      documentId: this.bodyContent.documentId,
      approverComment: 1,
    }
    this.dataService.getDocumentInfo(key).subscribe(res => {
      if (res && res.result && res.result.document && res.result.document.approverComment) {
        this.approveComment = res.result.document.approverComment;
      }
    }, (error) => {
      console.log(error);
      this.approveComment = '';
      this.dataService.showError("Approver Comments could not be loaded", "Oops");
    })
  }
}
