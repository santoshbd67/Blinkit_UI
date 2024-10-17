import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef
} from "@angular/core";
import { NgbModal, NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { DataService } from "../../services/data.service";
import { AppConfig } from "../../config/app-config";
import * as CryptoJS from "crypto-js";
import { AuthService } from "src/app/services/auth.service";
import { all } from 'q';

@Component({
  selector: "app-user-vendor-relationship",
  templateUrl: "./user-vendor-relationship.component.html",
  styleUrls: ["./user-vendor-relationship.component.scss"]
})
export class UserVendorRelationshipComponent implements OnInit {
  closeResult: string;
  @Input() mode: any;
  @Input() userData: any;
  @Output() submitData = new EventEmitter<any>();

  vendorList: any[];
  userVendorMapping: any;
  selectAll:boolean = false;

  constructor(
    private modalService: NgbModal,
    public activeModal: NgbActiveModal,
    private dataService: DataService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.getVendorList();
  }

  getVendorList() {
    let filter = {};
    let page = 0;
    let perItem = 0;
    let vendorObj = {
      filter: filter,
      page: page,
      offset: 0,
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
          // this.setFlagsForVendor();
          this.getUserVendorMap();
        } else {
          this.dataService.showError(
            "Error while fetching the vendor list",
            "Error"
          );
          this.vendorList = [];
        }
      },
      err => {
        this.dataService.showError(
          "Error while fetching the vendor list",
          "Error"
        );
        this.vendorList = [];
      }
    );
  }

  setFlagsForVendor() {
    this.vendorList.forEach(each => {
      each.checked = false;
    });
  }

  get selectedVendors() {
    if (this.vendorList) {
      return this.vendorList.filter(each => {
        return each.checked;
      });
    } else {
      return [];
    }
  }

  submit() {
    // if(!this.userVendorMapping){
    //   this.userVendorMapping = {};
    // }

    // this.userVendorMapping.vendors = [];
    // this.userVendorMapping.userId = this.userData.userId;

    // this.selectedVendors.forEach(vendor=>{
    //   this.userVendorMapping.vendors.push(vendor.vendorId);
    // })

    // this.auth.updateUserVendorMapping(this.userVendorMapping).subscribe(res=>{
    //   if(res && res.responseCode ==='OK'){
    //     this.dataService.showSuccess('successfully updated','success');
    //     this.closeModal(res.result);
    //   }
    //   else{
    //     this.dataService.showError('error while updating','error');
    //     this.dismissModal();
    //   }
    // },err=>{
    //   this.dataService.showError('error while updating','error');
    this.dismissModal();
    // })
  }

  addUserVendorMap(index) {
    if (!this.vendorList[index].checked) {
      this.addMap(index);
    } else {
      this.deleteMap(index);
    }
  }

  addMap(index) {
    const vendorId = this.vendorList[index].vendorId;
    this.auth
      .addUserVendorMap({ userId: this.userData.userId, vendorId: vendorId })
      .subscribe(
        res => {
          if(res && res.responseCode ==='OK'){
            this.vendorList[index].checked = true;
          }
          else{
            this.vendorList[index].checked = false;            
          }
        },
        err => {
          console.error("error while adding user vendor map", err);
          this.vendorList[index].checked = false;
        }
      );
  }

  deleteMap(index) {
    const vendorId = this.vendorList[index].vendorId;
    if (this.userData && this.userData.userId && vendorId) {
      this.auth.deleteUserVendorMap({
        userId: this.userData.userId,
        vendorId: vendorId
      }).subscribe(res=>{
        if(res && res.responseCode ==='OK'){
          this.vendorList[index].checked = false;
        }
        else{
          this.vendorList[index].checked = true;
        }
      },err=>{
        this.vendorList[index].checked = true;
        this.dataService.showError('error while deleting the selected mapping','err');
      });

    } else {
      this.vendorList[index].checked = true;
      this.dataService.showError("Error while completing the request", "error");
    }
  }

  getUserVendorMap() {
    // this.auth.getUserVendorMapping(this.userData.userId).subscribe(res=>{
    //   console.log('old response',res);
    //   if(res && res.result){
    //     this.userVendorMapping = res.result;
    //     this.selectOldValues();

    // }
    // else{
    //   this.dataService.showError('error loading the vendor mapping','error');
    // }

    // },err=>{
    //   this.dataService.showError('error loading the vendor mapping','error');
    // })

    this.auth.getUserVendorMap(this.userData.userId).subscribe(
      res => {
        if (res && res.responseCode === "OK" && res.result) {
          this.userVendorMapping = res.result;
          this.selectOldValues();
        } else {
          this.userVendorMapping = [];
        }
      },
      err => {
        this.userVendorMapping = [];
        this.dataService.showError("error loading the vendor mapping", "error");
      }
    );
  }

  selectOldValues() {
    // this.userVendorMapping.vendors.forEach(each=>{
    // })
    // this.vendorList.forEach(each => {
    //   if (
    //     this.userVendorMapping &&
    //     this.userVendorMapping.vendors &&
    //     this.userVendorMapping.vendors.includes(each.vendorId)
    //   ) {
    //     each.checked = true;
    //   } else {
    //     each.checked = false;
    //   }
    // });
   
    this.vendorList.forEach(vendor => {
      let selectedVendors = this.userVendorMapping.filter(each => {
        return each.vendorId === vendor.vendorId;
      });

      vendor.checked = selectedVendors && selectedVendors.length;
    });
  }

  closeModal(result) {
    this.submitData.emit({
      result: result
    });
    this.dismissModal();
  }

  dismissModal() {
    this.activeModal.close();
  }

  checkAll(){
    // this.vendorList.forEach((each, index)=>{
    //   // each.checked = this.selectAll;
    //   this.addUserVendorMap(index);
    //   if(!this.selectAll){
    //     this.addMap(index);
    //   }
    //   else{
    //     this.deleteMap(index);
    //   }
    // })

   const allSelected =  this.vendorList.every(each=>each.checked ===true);
   if(allSelected) this.selectAll =true;
   else this.selectAll =false;
  }
}
