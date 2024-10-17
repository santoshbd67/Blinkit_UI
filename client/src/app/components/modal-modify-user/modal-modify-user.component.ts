import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, NgForm, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import * as CryptoJS from 'crypto-js';
import { IDropdownSettings } from 'ng-multiselect-dropdown';
import { APIConfig } from 'src/app/config/api-config';
import { AuthService } from 'src/app/services/auth.service';
import { environment } from '../../../environments/environment';
import { AppConfig } from '../../config/app-config';
import { DataService } from '../../services/data.service';
import { CustomValidators } from './../change-password/custom-validators';

@Component({
  selector: 'app-modal-modify-user',
  templateUrl: './modal-modify-user.component.html',
  styleUrls: ['./modal-modify-user.component.scss']
})
export class ModalModifyUserComponent implements OnInit {

  @ViewChild('userForm', null) userForm: NgForm;
  closeResult: string;
  @Input() mode: any;
  @Input() userData: any;
  @Output() submitData = new EventEmitter<any>();

  appConfig: any = AppConfig;
  apiConfig: any = APIConfig;
  roleSets = [' '];
  fields: any[] = [
    { data: "role", label: 'Role', input: false, select: true, disabled: false, options: this.roleSets, required: true },
    { data: "docTypes", label: 'Document Type', input: true, type: 'text', disabled: false },
    { data: "userName", label: 'User Name', name: 'userName', input: true, rows: 3, disabled: false, required: true },
    { data: "emailId", label: 'Email Id', input: true, type: 'email', disabled: false, required: true, pattern: this.appConfig.validator.email },
    { data: "domain", label: 'Domain', input: true, type: 'text', disabled: true },
    { data: "password", label: 'Password', input: true, type: 'password', disabled: false, required: true, pattern: this.appConfig.validator.password }
  ];

  public frmSignup: FormGroup;
  formDirty: boolean = false;

  newPassword: string = null;
  newPasswordConfirm: string = null;
  toChangePassword: boolean = false;
  isvalidPassword: boolean = true;
  passwordType: string = "password";

  currentPasswordField: boolean;
  newPasswordField: any;
  confirmPasswordField: any;

  vendorList: any[];
  isvaliddomain: boolean = true;
  mandatoryMsg: string = 'This is a mandatory field';
  rolesData: any;
  fieldTextType: boolean;

  docTypeVisibility: number = 0;
  dropdownListOfFormat = [];
  selectedItemsInFormat = [];
  dropdownSettings_Format: IDropdownSettings = {};
  documentTypesList: any[];
  docTypeCheckForGivenRoles: any[];

  constructor(private modalService: NgbModal, private fb: FormBuilder, private router: Router, public activeModal: NgbActiveModal, private dataService: DataService, private auth: AuthService) {
    this.getUserRoles();
    this.frmSignup = this.createSignupForm();
    this.docTypeVisibility = this.auth.getUserSettings('DOCTYPES_VISIBILITY');
    this.documentTypesList = this.auth.getUserSettings("DOCUMENT_TYPES_LIST");
    this.docTypeCheckForGivenRoles = this.auth.getUserSettings('DOCTYPE_CHECK_FOR_ROLES');
  }

  isAdmin() {
    return localStorage.getItem('role') === 'admin';
  }

  shouldDoctypeFieldShow() {
    let response = this.docTypeCheckForGivenRoles.includes(this.userData.role);
    return response;
  }

  ngOnInit() {
    (this.userData) ? this.setExistingUserData() : this.setNewUserData();
  }

  getUserRoles() {
    this.auth.getAllRoles().subscribe((res) => {
      let rolesNames = [];
      if (res && res.responseCode == 'OK' && res.result && res.result.length) {
        this.rolesData = res.result;
        res.result.forEach(element => {
          rolesNames.push(element.role);
        });
        this.roleSets = rolesNames;
      }
      this.fields[0].options = this.roleSets;
      if (this.userData.role == ' ') {
        this.userData.role = this.roleSets[0];
      }
      else {
        this.userData.role = this.auth.getRoleName(this.rolesData, this.userData.role);
      }
      if (this.mode == 'Add') {
        this.setDocTypeInUserData();
      }
    }, (error) => {
      console.log("Error in getUserRoles method");
      console.log(error);
      this.dataService.showError("Roles could not be fetched", "Server Error");
    })
  }

  setNewUserData() {
    this.userData = {
      role: this.roleSets[0],
      userName: "",
      emailId: "",
      domain: localStorage.getItem('emailId').split('@')[1],
      password: ""
    };
  }

  setExistingUserData() {
    this.userData = JSON.parse(JSON.stringify(this.userData));
    this.userData.domain = localStorage.getItem('emailId').split('@')[1]

    if (this.docTypeVisibility == 1 && this.mode === 'Edit' && this.userData.documentType && this.userData.documentType.length > 0) {
      this.documentTypesList.filter((item) => {
        const found = this.userData.documentType.some(el => el === item.name);
        item.checked = (found == true) ? true : false;
      })
    }
  }

  closeModal(result) {
    this.submitData.emit({
      result: result,
    })
    this.activeModal.close();
  }

  dismissModal() {
    this.activeModal.close();
  }

  navigateTo(loc) {
    this.router.navigate([loc]);
  }

  createSignupForm(): FormGroup {
    return this.fb.group(
      {
        newPassword: [null,
          Validators.compose([
            Validators.required,
            CustomValidators.patternValidator(/\d/, { hasNumber: true }),// check whether the entered password has a number
            CustomValidators.patternValidator(/[A-Z]/, { hasCapitalCase: true }),  // check whether the entered password has upper case letter
            CustomValidators.patternValidator(/[a-z]/, { hasSmallCase: true }),  // check whether the entered password has a lower case letter
            CustomValidators.patternValidator(/[ !@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, { hasSpecialCharacters: true }),// check whether the entered password has a special character
            Validators.minLength(8)
          ])
        ],
        confirmPassword: [null, Validators.compose([Validators.required])]
      },
      {
        validator: CustomValidators.passwordMatchValidator  // check whether our password and confirm password match
      }
    );
  }

  saveForm(isFormValid) {
    if (localStorage.getItem('role') == 'clientadmin') { this.validateDomain(); }
    this.validatePassword();

    if (this.docTypeCheckForGivenRoles.includes(this.userData.role)) {
      if (Object.keys(this.userData).includes('documentType') && this.userData.documentType.length > 0)
        this.validateFormData(isFormValid)
      else {
        this.showDocumentTypeError();
      }
    } else {
      this.validateFormData(isFormValid);
    }
  }

  //<-------------xxxxxx--Add/Update User method starts--xxxxxx---------------->

  addUser() {
    this.userData.role = this.userData.role == ' ' ? localStorage.getItem("role") : this.userData.role;

    let roleId = this.auth.getRoleId(this.rolesData, this.userData.role);
    this.userData.role = roleId;

    let payload = this.auth.getPayload(this.userData, 'organization');
    this.auth.userSignUp(payload).subscribe(
      res => {
        if (res && res.responseCode === 'OK' && res.result) {
          this.dataService.showSuccess("New user added successfully", "Success", this.dataService.getAlertTimeOut());
          this.closeModal('success');
        }
        else {
          this.dataService.showError("Error while adding user", "Error", this.dataService.getAlertTimeOut());
          this.closeModal('error');
        }
      },
      err => {
        if (err.error.result.status === 409) {
          this.dataService.showError('User already exists', 'Duplicate Entry', this.dataService.getAlertTimeOut());
        }
        else if (err.error.result.status === 403) {
          this.dataService.showError('Please provide your corporate EmailId.', 'Invalid Email Address', this.dataService.getAlertTimeOut());
        }
        else {
          this.dataService.showError('Error while adding user.', 'Error', this.dataService.getAlertTimeOut());
        }
        this.closeModal('error');
      }
    );
  }

  updateUser() {

    const add_payload = {
      token: localStorage.getItem('token'),
      userRole: this.userData.role && this.userData.role != ' ' ? this.auth.getRoleId(this.rolesData, this.userData.role) : this.auth.getRoleId(this.rolesData, localStorage.getItem('role'))
    }

    let encryptedPayload = this.auth.encryptPayload(JSON.stringify(add_payload));
    this.dataService.validateUser(encryptedPayload).subscribe((res) => {

      if (res && res.responseCode == 'OK' && res.result) {
        let decyptedResponse = JSON.parse(this.auth.decryptPayload(res.result));
        if (decyptedResponse.CanProceed == true) {
          // TODO call update user 

          let isKGS = false;
          if (this.docTypeVisibility == 1 && this.docTypeCheckForGivenRoles.includes(this.userData.role)) {
            isKGS = true;
          }

          let userData = {
            userId: this.userData.userId,
            documentType: (isKGS) ? this.userData.documentType : undefined,
            deleteDocumentType: (isKGS) ? "No" : "Yes",
            role: this.auth.getRoleId(this.rolesData, this.userData.role),//this.userData.role,
            userName: this.userData.userName,
            emailId: this.userData.emailId
          }

          const payload = {
            token: localStorage.getItem('token'),
            user: userData
          }

          this.dataService.updateUser(payload).subscribe(
            res => {
              if (res && res.responseCode === 'OK' && res.result) {
                this.dataService.showSuccess("user details updated successfully", "success", this.dataService.getAlertTimeOut());
                this.closeModal('success');
              }
            },
            err => {
              this.dataService.showError("Error while updating user details", "error", this.dataService.getAlertTimeOut());
              this.closeModal('error');
            }
          );
        }
        else {
          this.dataService.showError("UNAUTHROIZED", "You are not allowed to update user");
        }
      }
    }, err => {
      this.dataService.showError("INTERNAL SERVER ERROR", "Please try again");
    })
  }
  //<-------------xxxxxx--Add/Update User method starts--xxxxxx---------------->

  //<=================XXXXXX---docTypes STARTS--XXXXXX========================>

  shareCheckedList(item: any[]) {
    console.log(item);
    this.userData.documentType = item
  }

  shareIndividualCheckedList(item: {}) {
    //console.log(item);
  }

  changeHandler(event) {
    (event && event.target.id == 'role') ? this.setDocTypeInUserData() : null;
  }

  setDocTypeInUserData() {
    if (this.docTypeVisibility == 1) { // For KGS
      if (this.docTypeCheckForGivenRoles.includes(this.userData.role)) {
        if (!this.userData.documentType) {
          this.userData['documentType'] = []
          this.documentTypesList.forEach(element => {
            this.userData.documentType.push(element.name)
          });
        }
      }
      else {
        delete this.userData.documentType
      }
    }
  }

  //<=================XXXXXX--docTypes end--XXXXXX========================>

  //<-------------------xxxxxx--Password methods starts--xxxxxx------------------->

  changePassword() {
    this.toChangePassword = true;
  }

  saveNewPassword() {
    if (this.formDirty) {
      if (this.newPassword && this.newPasswordConfirm && this.newPassword === this.newPasswordConfirm) {
        let encryptedPassword = CryptoJS.SHA256(this.newPassword).toString();

        let userData = {
          userId: this.userData.userId,
          password: encryptedPassword
        }

        const payload = {
          token: localStorage.getItem('token'),
          user: userData
        }

        this.dataService.updateUser(payload).subscribe(
          res => {
            if (res && res.responseCode === 'OK' && res.result) {
              this.dataService.showSuccess("password changed successfully", "success", this.dataService.getAlertTimeOut());
              this.closeModal('success');
              if (localStorage.getItem('userId') === userData.userId)
                this.clearSession();
            }
            else {
              this.dataService.showInfo('this is the case', 'info');
            }
          },
          err => {
            this.dataService.showError("Error while changing password", "error", this.dataService.getAlertTimeOut());
            this.closeModal('error');
          }
        );
      }
      else {
        this.dataService.showError('Fill all the details & try again', 'validation error', this.dataService.getAlertTimeOut());
      }
    }
    else {
      this.dataService.showError("Nothing to save", "warning", this.dataService.getAlertTimeOut());
    }
  }

  submit() {
    let encryptedPassword = CryptoJS.SHA256(this.frmSignup.value.newPassword).toString();

    let userData = {
      userId: this.userData.userId,
      password: encryptedPassword
    }

    const payload = {
      token: localStorage.getItem('token'),
      user: userData
    }

    this.dataService.updateUser(payload).subscribe(
      res => {
        if (res && res.responseCode === 'OK' && res.result) {
          this.dataService.showSuccess("password changed successfully", "success", this.dataService.getAlertTimeOut());
          this.closeModal('success');
          if (localStorage.getItem('userId') === userData.userId)
            this.clearSession();
        }
        else {
          this.dataService.showInfo('Password could not be changed', 'Please try again');
        }
      },
      err => {
        this.dataService.showError("Error while changing password", "error", this.dataService.getAlertTimeOut());
        this.closeModal('error');
      }
    );
  }

  cancelPasswordChange() {
    this.toChangePassword = false;
    this.newPassword = '';
    this.newPasswordConfirm = '';
  }

  showPassword() {
    this.passwordType = 'text';
    setTimeout(() => {
      this.passwordType = 'password'
    }, 1000);
  }

  clearSession() {
    this.auth.userLogout().toPromise().then(res => {
      if (res) {
        localStorage.clear();
        this.dataService.showSuccess('Your session has expired', 'Please login again', 5000);
        let Url = environment.baseAPI + this.apiConfig.API.getUserSettings;
        fetch(Url)
          .then(response => response.json())
          .then(json => {
            this.navigateTo('login');
            this.auth.setUserAccessbilitySettings(json.result.UserSettings)
          })
      }
    }).catch(err => {
      localStorage.clear();
      this.dataService.showError('Error while logging you out', 'Error', 5000);
      this.navigateTo('login');
    })
  }

  //<-------------------xxxxxx--Password methods ends--xxxxxx----------------------->

  //<-------------------xxxxxx--Toggle methods starts--xxxxxx----------------------->

  toggleNewPasswordType() {
    this.newPasswordField = !this.newPasswordField;
  }

  toggleConfirmPasswordType() {
    this.confirmPasswordField = !this.confirmPasswordField;
  }

  toggleFieldTextType() {
    this.fieldTextType = !this.fieldTextType;
  }
  //<-------------------xxxxxx--Toggle methods ends--xxxxxx------------------------->

  //<-------------------xxxxxx--Alert methods starts--xxxxxx------------------------->

  showInvalidEmail() {
    this.dataService.showInfo("Email should be from same domain", "info");
  }

  showInvalidPassword() {
    this.dataService.showInfo("password is not valid", "info");
  }

  showRequiredFieldsError() {
    this.dataService.showInfo("fill the required fields & proceed", "info");
  }

  showDocumentTypeError() {
    this.dataService.showInfo("At least one document type should be selected", "info");
  }

  //<-------------------xxxxxx--Alert methods ends--xxxxxx------------------------->

  //<-------------------xxxxxx--Validation methods starts--xxxxxx-------------------->

  validateDomain() {
    let emailId = localStorage.getItem('emailId');
    let userdomain = (emailId.split('@')[1]);
    let inputDomain = this.userData.emailId.split('@')[1]

    if (inputDomain == userdomain) {
      this.isvaliddomain = true;
    }
    else {
      this.isvaliddomain = false;
    }
  }

  validatePassword() {
    if (this.userForm && this.userForm.controls.password.status == 'INVALID')
      this.isvalidPassword = false;
    else
      this.isvalidPassword = true;
  }

  validateFormData(isFormValid) {
    if (isFormValid && this.isvaliddomain && this.isvalidPassword) {
      (this.mode === 'Add') ? this.addUser() : (this.mode === 'Edit') ? this.updateUser() : null;
    }
    else {
      (!this.isvaliddomain) ? this.showInvalidEmail() : (!this.isvalidPassword) ? this.showInvalidPassword() : this.showRequiredFieldsError();
    }
  }

  //<-------------------xxxxxx--Validation methods ends--xxxxxx------------------------->

  //<--unused code -->

  getVendorList() {
    let filter = {};
    let page = 1;
    let perItem = this.appConfig.itemsPerPage;
    let vendorObj = {
      filter: filter,
      page: page,
      offset: (page - 1) * perItem,
    }
    this.dataService.getVendorList(vendorObj).subscribe(res => {
      if (res && res.result && res.result.documents) {
        this.vendorList = res.result.documents;
      }
      else {
        this.vendorList = [];
      }

    }, err => {
      this.vendorList = [];
    })
  }

  markFormAsDirty() {
    this.formDirty = true;
  }
}