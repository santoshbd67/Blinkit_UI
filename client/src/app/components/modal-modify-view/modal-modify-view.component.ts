import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import * as moment from 'moment';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { APIConfig } from './../../config/api-config';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-modal-modify-view',
  templateUrl: './modal-modify-view.component.html',
  styleUrls: ['./modal-modify-view.component.scss']
})
export class ModalModifyViewComponent implements OnInit {
  @Input() dataset: any;
  @Input() totalItems: number = 0;
  @Output() currentPage = new EventEmitter();
  itemsPerPage: number = 12;
  pageNumber: number = 1;

  @Input() filter: any;
  @Input() userName: string;
  apiConfig: any = APIConfig;
  isDocsFetched = false;

  constructor(
    private modalService: NgbModal,
    public activeModal: NgbActiveModal,
    private dataService: DataService,
    private spinner: NgxSpinnerService,
    private auth: AuthService) { }

  ngOnInit() {
    this.isDocsFetched = false;
    this.showSpinner();
    this.getDocuments();
  }

  showSpinner() {
    this.spinner.show();
  }

  hideSpinner() {
    this.spinner.hide();
  }

  getDocuments() {
    this.dataService.findDocument(this.filter, this.pageNumber).subscribe(
      (res) => {
        this.isDocsFetched = true;
        this.hideSpinner();
        if (res && res.result) {

          this.dataset = JSON.parse(JSON.stringify(res.result.documents));
          this.totalItems = res.result.count;
          this.dataset.find((item, index) => {
            item.submittedOn = moment(this.dataService.epochTsToMili(item.submittedOn)).format("LL");
          })
        }
      },
      (err) => {
        this.isDocsFetched = true;
        this.hideSpinner();
        console.log("error while fetching documents at settings page.");
        console.log(err);
        this.dataService.showError("Error while loading documents", "Error", this.dataService.getAlertTimeOut());
      }
    );
  }

  get showingItemCount() {
    let count = this.totalItems - (this.pageNumber - 1) * this.itemsPerPage < this.itemsPerPage ? this.totalItems : this.pageNumber * this.itemsPerPage;
    return count;
  }

  dismissModal() {
    this.activeModal.close();
  }

  setPageNumber(event) {
    this.pageNumber = event;
    this.isDocsFetched = false;
    this.showSpinner();
    this.getDocuments();
  }
}
