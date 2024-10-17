import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { NgbModal, NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-info-dialog',
  templateUrl: './info-dialog.component.html',
  styleUrls: ['./info-dialog.component.scss']
})
export class InfoDialogComponent implements OnInit {

  closeResult: string;

  @Input() modalData: any = { headerName: '', Images: [], isLoading: false }
  @Output() submitData = new EventEmitter<any>();

  constructor(private modalService: NgbModal, public activeModal: NgbActiveModal) { }

  ngOnInit() { }

  ngOnChanges() {
  }

  // on close 
  delete() {
    this.submitData.emit({
      result: 'success'
    })
    this.activeModal.close();
  }

  dismissModal() {
    this.activeModal.close();
  }
}

