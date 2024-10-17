import { Component, OnInit } from '@angular/core';
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { DataService } from 'src/app/services/data.service';
import { ModalModifyUserComponent } from 'src/app/components/modal-modify-user/modal-modify-user.component';
import { DeleteAlertComponent } from 'src/app/components/delete-alert/delete-alert.component';
import { UserVendorRelationshipComponent } from '../user-vendor-relationship/user-vendor-relationship.component';
import { AuthService } from 'src/app/services/auth.service';
import { AppConfig } from 'src/app/config/app-config';
import { ModalModifyViewComponent } from '../modal-modify-view/modal-modify-view.component';
import { APIConfig } from 'src/app/config/api-config';
import * as moment from 'moment';

@Component({
  selector: 'app-user-settings',
  templateUrl: './user-settings.component.html',
  styleUrls: ['./user-settings.component.scss']
})
export class UserSettingsComponent implements OnInit {
  appConfig: any;

  userList: any[] = [];
  currentUserEmail: string;

  usersPerPage: number = AppConfig.itemsPerPage;
  apiConfig: any = APIConfig;
  userCount: number = 0;
  userPage: number = 1;
  isDownloading = false;
  filter: any = {};
  rolesData: any;
  isDataFetching = false;

  constructor(private modalService: NgbModal, private dataService: DataService, private auth: AuthService) {
    this.fetchRoles();
  }

  fetchRoles() {
    this.auth.getAllRoles().subscribe((res) => {
      if (res && res.responseCode == 'OK' && res.result && res.result.length) {
        this.rolesData = res.result;
        this.getUserList();
      }
    })
  }

  ngOnInit() {
    this.appConfig = AppConfig;
    this.currentUserEmail = localStorage.getItem('emailId');
  }

  currentAccount(emailId) {
    //return localStorage.getItem('emailId') === this.auth.encrypt(emailId);
    return localStorage.getItem('emailId') === emailId;
  }

  setUserPage(event) {
    this.userPage = event;
    this.getUserList();
  }

  openUserModal(userData, reqFor: string) {
    const modalRef = this.modalService.open(DeleteAlertComponent, {
      size: "sm",
      centered: true
    });

    modalRef.componentInstance.action = reqFor;
    modalRef.componentInstance.item = 'User' + ' ' + userData.userName;
    modalRef.componentInstance.submitData.subscribe(res => {
      if (res.result === 'success') {
        this.handleUser(userData, reqFor);
      }
    });
  }

  // open vendor model for add and update vendor
  openModifyUserModal(mode, userData) {
    const modalRef = this.modalService.open(ModalModifyUserComponent, {
      centered: true,
      backdrop: 'static',
      keyboard: false,
      size: 'lg'
    });

    if (mode === 'Edit') {
      userData.role = this.auth.getRoleId(this.rolesData, userData.role);
    }
    //userData.role = this.auth.getRoleId(this.rolesData, userData.role);
    modalRef.componentInstance.userData = userData;

    modalRef.componentInstance.mode = mode;
    modalRef.componentInstance.submitData.subscribe(res => {
      if (res.result === 'success') {
        this.getUserList();
      }
    });
    modalRef.result.then(close => {
      if (mode === 'Edit') {
        userData.role = this.auth.getRoleName(this.rolesData, userData.role);
      }
    })
  }

  openUserVendorRelationModal(userData) {

    const modalRef = this.modalService.open(UserVendorRelationshipComponent, {
      centered: true, size: 'lg'
    });
    modalRef.componentInstance.userData = userData;
  }

  handleUser(userData, reqFor: string) {

    this.auth.handleUser(userData, reqFor).subscribe(res => {
      if (res && res.responseCode === 'OK') {
        this.dataService.showSuccess(`User ${reqFor}d successfully`, 'success');
        this.getUserList();
      }
      else {
        this.handleDeleteError();
      }
    }, err => {
      this.handleDeleteError();
    });
  }

  handleDeleteError() {
    this.dataService.showError('Error while deleting user', 'error');
  }

  downloadCSV() {
    this.isDownloading = true;
    // let jsonData = this.auth.getUsersData();
    let jsonData = [];
    this.auth.getAllUsersMetaData().subscribe((res) => {

      setTimeout(() => {
        if (res && res.result) {
          res.result = JSON.parse(this.auth.decryptPayload(res.result));
          res.result.forEach(element => {
            jsonData.push({
              // Username: this.auth.decrypt(element.userName),
              // EmailId: this.auth.decrypt(element.emailId),
              Username: element.userName,
              EmailId: element.emailId,
              // AgeGroup: element.Age ? element.Age : '',
              Company: element.company ? element.company : '',
              Designation: element.designation ? element.designation : '',
              Phone: element.phone ? element.phone : '',
              Country: element.Country ? element.Country : '',
              State: element.State ? element.State : '',
              ZIPCode: element.ZIPCode ? element.ZIPCode : '',
              CreatedAt: moment(this.dataService.epochTsToMili(element.createdOn)).format("LL"),
              ReccentActivityAt: moment(this.dataService.epochTsToMili(element.lastLogin)).format("LL"),
              TotalFiles: element.users_metadata.length,
              UserStatus: element.isActive ? 'Active' : 'InActive'
            })
          });
          this.auth.downloadUsersData(jsonData, 'pAIges_usersData');
          this.isDownloading = false;
          this.dataService.showSuccess(`CSV downloaded successfully`, 'success');
        }
        else {
          this.dataService.showError(`Could not downloaded list. Something went wrong.`, 'Failed');
        }
      }, 2000);
    })
  }

  get showingItemCount() {
    let count =
      this.userCount - (this.userPage - 1) * this.usersPerPage <
        this.usersPerPage
        ? this.userCount
        : this.userPage * this.usersPerPage;
    return count;
  }

  getUserList() {
    let payload = {
      token: localStorage.getItem('token'),
      filter: {},
      limit: this.usersPerPage,
      page: this.userPage
    }

    this.auth.getUserList(payload).subscribe(res => {
      if (res && res.responseCode == 'OK' && res.result) {
        this.isDataFetching = true;
        this.userList = res.result.documents;
        if (this.userList.length > 0) {
          this.userList.forEach(element => {
            element.role = this.auth.getRoleName(this.rolesData, element.role);
            element.createdOn = moment(this.dataService.epochTsToMili(element.createdOn)).format("lll")
          });
        }
        this.userCount = res.result.count;
      }
      else {
        this.handleGetUserListError();
      }
    }, err => {
      this.handleGetUserListError();
    })
  }

  handleGetUserListError() {
    this.dataService.showError('error loading the user list', 'error');
    this.userList = [];
    this.userCount = 0;
  }

  isAdmin() {
    return (localStorage.getItem('role') === 'admin')
  }

  isClientAdmin() {
    return (localStorage.getItem('role') === 'clientadmin')
  }

  openModifyViewModal(mode, userData) {
    this.filter.userId = userData.userId;
    this.filter.calledFrom = "user-settings"
    const modalRef = this.modalService.open(ModalModifyViewComponent, {
      size: "lg",
      centered: true
    });

    modalRef.componentInstance.filter = this.filter;
    modalRef.componentInstance.userName = userData.userName;
  }
}
