import { Component, OnInit } from '@angular/core';
import * as CryptoJS from 'crypto-js';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { APIConfig } from 'src/app/config/api-config';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { AppConfig } from './../../config/app-config';
import { CountryStateService } from './../../services/country-state.service';

@Component({
  selector: 'app-profile-details',
  templateUrl: './profile-details.component.html',
  styleUrls: ['./profile-details.component.scss']
})
export class ProfileDetailsComponent implements OnInit {

  userDetails: any;
  emailId: string;
  userName: string;
  apiConfig: any = APIConfig;
  appConfig: any = AppConfig;

  myProfileView: any = [];
  myProfileForm: FormGroup;
  isloading = false;
  isUpdatingProfilePic = false;
  public firstname = localStorage.getItem("emailid");
  Age = ['18-25', '26-30', '31-35', '36-40', '41-45', '46-50', '51-55', '56-60', '61-65', '66-70', '71-75', 'Above 75'];

  imagepreview: any = "assets/images/icon-user-default.png";
  filePath;
  fileName;
  countriesList = [];
  statesList = [];
  isState = true;
  submitted: boolean = false;
  rolesData: any;

  constructor(private auth: AuthService,
    private dataService: DataService,
    private countryService: CountryStateService,
    private fb: FormBuilder) { }

  fetchRoles() {
    this.auth.getAllRoles().subscribe((res) => {
      if (res && res.responseCode == 'OK' && res.result && res.result.length) {
        this.rolesData = res.result;
      }
    })
  }

  ngOnInit() {
    this.fetchRoles();
    this.countriesList = this.countryService.getCountries();
    if (!this.userDetails)
      this.getUserDetails();
    this.initializeForm();
  }

  initializeForm() {
    this.myProfileForm = this.fb.group({
      Image: [this.imagepreview],
      emailid: [{ value: this.firstname, disabled: true }, [Validators.required]],
      Age: [''],
      Gender: [''],
      Country: [''],
      State: [''],
      ZIPCode: [''],
      company: ['', Validators.required],
      designation: ['', Validators.required],
      phone: ['', Validators.required],
    });

    //this.myProfileForm.controls.emailid.disable();
  }

  loadFormData() {

    this.statesList = this.countryService.getStates(this.userDetails.Country);
    this.myProfileForm.patchValue({
      //emailid: this.auth.decrypt(this.userDetails.emailId),
      emailid: this.userDetails.emailId,
      Age: this.userDetails.Age ? this.userDetails.Age : '',
      Gender: this.userDetails.Gender ? this.userDetails.Gender : '',
      ZIPCode: this.userDetails.ZIPCode ? this.userDetails.ZIPCode : '',
      Country: this.userDetails.Country ? this.userDetails.Country : '',
      State: this.userDetails.State ? this.userDetails.State : '',
      company: this.userDetails.company ? this.userDetails.company : '',
      designation: this.userDetails.designation ? this.userDetails.designation : '',
      phone: this.userDetails.phone ? this.userDetails.phone : '',
      // Image: this.userDetails.imagePath
      // Image: this.imagepreview
    });
    if (this.myProfileForm.value.State !== '') {
      this.isState = false;
    }
  }

  // onSaveMyProfile() {

  //   this.submitted = true;
  //   if (this.myProfileForm.valid) {
  //     let data = {
  //       Age: this.myProfileForm.value.Age,
  //       Gender: this.myProfileForm.value.Gender,
  //       ZIPCode: this.myProfileForm.value.ZIPCode,
  //       Country: this.myProfileForm.value.Country,
  //       State: this.myProfileForm.value.State,
  //       company: this.myProfileForm.value.company,
  //       designation: this.myProfileForm.value.designation,
  //       phone: this.myProfileForm.value.phone,
  //       userId: localStorage.getItem("userId"),
  //       role: this.auth.getRoleId(this.rolesData, localStorage.getItem("role"))
  //     }

  //     const payload = {
  //       token: localStorage.getItem('token'),
  //       user: data
  //     }
  //     this.auth.updateUserDetails(payload).subscribe(res => {
  //       this.submitted = false;
  //       if (res && res.responseCode == 'OK') {
  //         this.dataService.showSuccess('Thanks your profile has been successfully updated.', 'Success', this.dataService.getAlertTimeOut());
  //       }
  //       else {
  //         this.dataService.showError('Something went wrong.', 'Server Error', this.dataService.getAlertTimeOut());
  //       }
  //     }, err => {
  //       this.dataService.showError('Something went wrong.', 'Server Error', this.dataService.getAlertTimeOut());
  //       console.error('submit data error', err);
  //     })
  //   }
  //   else {
  //     this.dataService.showError('Please fill mandatory fields', 'Foam Invalid Error', this.dataService.getAlertTimeOut());
  //   }
  // }

  onSaveMyProfile() {
    this.submitted = true;
    if (this.checkForTagsValidation(this.myProfileForm.value)) {
      this.dataService.showError('Please Insert Valid Text', 'Invalid Data', 5000);
    }
    else {
      if (this.myProfileForm.valid) {
        let data = {
          Age: this.myProfileForm.value.Age,
          Gender: this.myProfileForm.value.Gender,
          ZIPCode: this.myProfileForm.value.ZIPCode,
          Country: this.myProfileForm.value.Country,
          State: this.myProfileForm.value.State,
          company: this.myProfileForm.value.company,
          designation: this.myProfileForm.value.designation,
          phone: this.myProfileForm.value.phone,
          userId: localStorage.getItem("userId"),
          role: this.auth.getRoleId(this.rolesData, localStorage.getItem("role"))
        }

        const payload = {
          token: localStorage.getItem('token'),
          user: data
        }
        // console.log(payload);
        this.auth.updateUserDetails(payload).subscribe(res => {
          this.submitted = false;
          if (res && res.responseCode == 'OK') {
            this.dataService.showSuccess('Thanks your profile has been successfully updated.', 'Success', this.dataService.getAlertTimeOut());
          }
          else {
            this.dataService.showError('Profile could not updated.', 'Try Again', this.dataService.getAlertTimeOut());
          }
        }, err => {
          this.dataService.showError('Something went wrong.', 'Server Error', this.dataService.getAlertTimeOut());
          console.error('submit data error', err);
        })
      }
      else {
        this.dataService.showError('Invalid Form Details', 'Invalid Data', this.dataService.getAlertTimeOut());
      }
    }
  }

  checkForTagsValidation(formValue) {
    let status = false;
    let checkedTags = ['<script', '/script', 'script>',
      '<title', '/title', 'title>',
      '<import', '/import', 'import>',
      '<link', '/link', 'link>']
    let formValueArray = [];
    for (var i in formValue) {
      formValueArray.push(formValue[i]);
    }
    if (formValueArray && formValueArray.length > 0) {
      for (var i in checkedTags) {
        formValueArray.forEach(element => {
          if (element.toString().includes(checkedTags[i])) {
            status = true
          }
        });
      }
    } else {
      status = false
    }
    return status
  }

  getStates(countryCode) {
    this.statesList = this.countryService.getStates(countryCode);
    this.isState = false;
  }

  // getStatesByCountryName(countryName) {
  //   let countryObj;
  //   // countryObj = this.countriesList.filter((countryObj) => {
  //   //   return countryObj.name === countryName;
  //   // });
  //   this.statesList = this.countryService.getStates(countryObj.code);
  //   this.isState = false;
  // }

  getUserDetails() {
    this.auth.getUserDetails().subscribe(res => {

      if (res && res.responseCode === 'OK' && res.result) {
        // this.emailId = this.auth.decrypt(res.result.emailId);
        // this.userName = this.auth.decrypt(res.result.userName);
        this.emailId = res.result.emailId;
        this.userName = res.result.userName;
        this.userDetails = res.result;
        this.loadFormData();
      }
      else {
        this.handleError();
      }
    }, err => {
      this.handleError(err);
    })
  }

  handleError(err?) {
    if (err) {
      console.error(err);
    }

    this.userDetails = null;
    this.dataService.showError('Error while fetching user details', 'error');
  }
}
