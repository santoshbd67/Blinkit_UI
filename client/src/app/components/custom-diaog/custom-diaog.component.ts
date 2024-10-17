import { Component, OnInit, ViewChild, Output, EventEmitter, Input } from '@angular/core';
// import { DialogComponent } from '@syncfusion/ej2-angular-popups';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from './../../services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { APIConfig } from 'src/app/config/api-config';

@Component({
  selector: 'app-custom-diaog',
  templateUrl: './custom-diaog.component.html',
  styleUrls: ['./custom-diaog.component.scss']
})
export class CustomDiaogComponent implements OnInit {
  public dialogWidth: string = '50%';
  public dialogHeight: string = '70%';
  public showCloseIcon: boolean = true;

  @Output() close = new EventEmitter<string>();
  @Output() startDownload = new EventEmitter<string>();
  @Input() docId: any;
  isFormSubmitted = false;

  heading: string = "Download Results";
  //subHeading: string = "We hope you loved our service. Please take a moment of your time "
  //subHeading1: string = "to complete below form. So we could maintain your experience better."
  subHeading: string = "Provide the below information to download the results"

  signupForm: FormGroup;
  submitted = false;
  apiConfig: any = APIConfig;

  rolesData: any;
  display = "block";

  constructor(public fb: FormBuilder, private auth: AuthService, private dataService: DataService) {
    this.fetchRoles()
  }

  fetchRoles() {
    this.auth.getAllRoles().subscribe((res) => {
      if (res && res.responseCode == 'OK' && res.result && res.result.length) {
        this.rolesData = res.result;
      }
    })
  }

  ngOnInit() {
    this.signupForm = this.fb.group({
      company: ["", [Validators.required, Validators.maxLength(100)]],
      designation: ["", [Validators.required, Validators.maxLength(50)]],
      phone: ["", [Validators.required, Validators.maxLength(10)]],
    });
  }

  downloadNow() {
    this.startDownload.emit(this.docId);
  }

  onSubmit() {
    this.submitted = true;
    if (this.signupForm.valid) {
      let data = {
        company: this.signupForm.value.company,
        designation: this.signupForm.value.designation,
        phone: this.signupForm.value.phone,
        userId: localStorage.getItem("userId"),
        role: this.auth.getRoleId(this.rolesData, localStorage.getItem("role"))
      }

      const payload = {
        token: localStorage.getItem('token'),
        user: data
      }

      this.auth.updateUserDetails(payload).subscribe(res => {
        if (res && res.responseCode == 'OK') {
          this.dataService.showSuccess('Thanks for providing the details', 'Success', this.dataService.getAlertTimeOut());
          // this.auth.setUserDetails(res.result);
          this.nextActionAfterSubmit(res.result);
        }
        else {
          this.dataService.showError('Something went wrong.', 'Server Error', this.dataService.getAlertTimeOut());
        }
      }, err => {
        this.dataService.showError('Something went wrong.', 'Server Error', this.dataService.getAlertTimeOut());
        console.error('submit data error', err);
      })
    }
  }

  nextActionAfterSubmit(result) {
    this.closeDialog();
    this.signupForm.reset();
    this.downloadNow();
    // this.isFormSubmitted = true;
  }

  closeDialog() {
    this.close.emit('dialog closed');
  }

  onCloseHandled() {
    this.display = 'none';
    this.closeDialog();
  }
}
