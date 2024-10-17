import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { NgbModal, NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from './../../services/auth.service';
import { ActivatedRoute } from '@angular/router';
import { DataService } from './../../services/data.service';

@Component({
  selector: 'app-delete-alert',
  templateUrl: './delete-alert.component.html',
  styleUrls: ['./delete-alert.component.scss']
})
export class DeleteAlertComponent implements OnInit {

  closeResult: string;

  @Input() message: any;
  @Input() warningMsg: [];
  @Input() action: any;
  @Input() item: any;
  @Input() ticketInfo: {};
  @Input() calledFrom: any;
  @Input() closingIn: number;
  @Input() documentId: string;
  @Output() submitData = new EventEmitter<any>();

  reasonOptions: any[];
  reason: any;
  comment_text: string;
  OthersReason: string;
  reassignComment: string;

  constructor(private modalService: NgbModal,
    public activeModal: NgbActiveModal,
    private activatedRoute: ActivatedRoute,
    private dataService: DataService,
    private auth: AuthService) { }

  ngOnInit() {
    if (this.calledFrom == 'delete_document') {
      this.auth.getReasonOptions().subscribe((res) => {
        if (res && res.responseCode == "OK" && res.result && res.result.reasonOptions) {
          this.reasonOptions = res.result.reasonOptions;
        }
      })
    }
    if (this.calledFrom == 'reassign_document') {
      this.auth.getReassignReasons().subscribe((res) => {
        if (res && res.responseCode == "OK" && res.result && res.result.reasonOptions) {
          this.reasonOptions = res.result.reasonOptions;
        }
      })
    }
    if (this.calledFrom == 'add_comment' && this.documentId) {
      this.getComments();
    }
  }

  getComments() {
    let key = {
      documentId: this.documentId,
      comment: 1,
    }
    this.dataService.getDocumentInfo(key).subscribe(res => {
      if (res && res.result && res.result.document && res.result.document.comment) {
        this.comment_text = res.result.document.comment;
      }
    }, (error) => {
      this.dataService.showError("Comments could not be loaded", "Oops");
    })
  }

  changeReason(value) {
    this.reason = value
  }

  // on delete 
  delete() {
    if (this.calledFrom == 'delete_document' && this.reason == undefined) {
      alert('Please Select any Reason for rejecting this Document.')
    }
    else if (this.calledFrom == 'delete_document' && this.reason && this.reason == 'Others' && !this.OthersReason) {
      alert('Please type valid reason in the input area.')
    }
    else if (this.calledFrom == 'add_comment' && !this.comment_text) {
      alert('Please enter some data.');
    }
    else {
      if (this.reason && this.calledFrom == 'delete_document' && this.OthersReason && this.reason == 'Others') {
        this.submitData.emit({
          result: 'success',
          reason: this.reason + " : " + this.OthersReason,
          comment: this.comment_text
        })
      }
      else {
        this.submitData.emit({
          result: 'success',
          reason: this.reason,
          comment: this.comment_text
        })
      }
      this.activeModal.close();
    }
  }
  // on reassign 
  reassign() {
    if (this.calledFrom == 'reassign_document' && this.reason == undefined) {
      alert('Please Select any Reason for rejecting this Document.')
    }
    else {
      if (this.reason && this.calledFrom == 'reassign_document' && this.reassignComment) {
        this.submitData.emit({
          result: 'success',
          reason: this.reason,
          reassignComment: this.reassignComment
        })
      }
      else {
        this.submitData.emit({
          result: 'success',
          reason: this.reason
        })
      }
      this.activeModal.close();
    }
  }

  // on proceed 
  proceed() {
    this.submitData.emit()
    this.activeModal.close();
  }

  deleteTemplate() {
    this.submitData.emit({
      result: 'success',
      // reason: this.reason,
      // comment: this.comment_text
    })
    this.activeModal.close();
  }

  dismissModal() {
    this.activeModal.close();
  }
}
