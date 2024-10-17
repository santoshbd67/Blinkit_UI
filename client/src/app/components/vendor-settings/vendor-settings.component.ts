import { Component, OnInit } from '@angular/core';
import { ModalModifyVendorComponent } from '../../components/modal-modify-vendor/modal-modify-vendor.component';
import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { DataService } from 'src/app/services/data.service';
import { DeleteAlertComponent } from 'src/app/components/delete-alert/delete-alert.component';
import { AuthService } from 'src/app/services/auth.service';
import { AppConfig } from 'src/app/config/app-config';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-vendor-settings',
  templateUrl: './vendor-settings.component.html',
  styleUrls: ['./vendor-settings.component.scss']
})
export class VendorSettingsComponent implements OnInit {
  appConfig: any;

  vendorList: any[] = [];

  itemsPerPage: number = 10;
  pageNumber: number = 1;
  itemsCount: any;

  constructor(
    private modalService: NgbModal,
    private dataService: DataService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.appConfig = AppConfig;
    this.getVendorList();
  }

  /* get all vendor list*/
  getVendorList() {
    let filter = {};
    let page = this.pageNumber;
    let perItem = this.appConfig.itemsPerPage;
    let vendorObj = {
      filter: filter,
      page: page,
      offset: (page - 1) * perItem,
      limit: perItem
    };
    this.dataService.getVendorList(vendorObj).subscribe(
      res => {
        if (
          res &&
          res.result &&
          res.result.documents &&
          res.result.documents.length > 0
        ) {
          this.vendorList = res.result.documents;
          this.fetchAllLogo();
          this.itemsCount = res.result.count;
        } else {
          this.vendorList = [];
          this.itemsCount = 0;
        }
      },
      err => {
        this.dataService.showInfo('No vendor found', 'Info');
      }
    );
  }

  
  fetchAllLogo(){
    let allPromises = [];
    this.vendorList.forEach(each=>{
      allPromises.push(this.dataService.getVendorLogo(each.logo).toPromise());
    });

    Promise.all(allPromises).then(res=>{
      res.forEach((each,index)=>{
        this.vendorList[index].logo = each.result.blobURL;
      })
    })
  }

  setPageNumber(event) {
    this.pageNumber = event;
    this.getVendorList();
  }


  //get local blob logo path
  // getLogo(str) {
  //   let substring = 'http';
  //   if (str.includes(substring)) {
  //     return str;
  //   } else {
  //     return (
  //       environment.baseAPI + environment.imageBaseAPIPath + 'assets/' + str
  //     );
  //   }
  // }

  // open vendor model for add and update vendor
  vendorModal(mode, vendorData) {
    let ngbModalOptions: NgbModalOptions = {
      backdrop : 'static',
      keyboard : false,
      windowClass: 'vendor-edit-model',
      centered: true
};
    // const modalRef = this.modalService.open(ModalModifyVendorComponent, {
    //   windowClass: 'vendor-edit-model',
    //   centered: true
    // });
    const modalRef = this.modalService.open(ModalModifyVendorComponent,ngbModalOptions);
    modalRef.componentInstance.vendorData = vendorData;
    modalRef.componentInstance.mode = mode;
    modalRef.componentInstance.submitData.subscribe(res => {
      if (res.result === 'success') {
        this.getVendorList();
      }
    });
  }

  // delete Vendor model
  openDeleteVendorModal(vendorData) {
    const modalRef = this.modalService.open(DeleteAlertComponent, {
      windowClass: 'vendor-model',
      size: 'sm',
      centered: true
    });

    modalRef.componentInstance.item = 'Vendor' + ' ' + vendorData.name;
    modalRef.componentInstance.submitData.subscribe(res => {
      if (res.result === 'success') {
        this.deleteVendor(vendorData);
      }
    });
  }
  // delete vendor
  deleteVendor(vendorData) {
    let payload = {
      vendorId: vendorData.vendorId
    };
    this.dataService.deleteVendor(payload).subscribe(
      res => {
        if (res && res.responseCode === 'OK') {
          // this.pageNumber--;
          if (this.vendorList && this.vendorList.length === 1) {
            this.pageNumber--;
          }

          this.getVendorList();
          this.dataService.showSuccess(
            vendorData.name + ' ' + 'Vendor deleted successfully',
            'Info'
          );
        } else {
          this.dataService.showError('Error while deleting vendor', 'Info');
        }
      },
      err => {
        this.dataService.showError('Error while deleting vendor', 'Info');
      }
    );
  }
}
