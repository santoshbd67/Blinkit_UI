import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { Router } from '@angular/router';
import {
  BlobService,
  UploadConfig,
  UploadParams
} from 'angular-azure-blob-service';
import { DataService } from '../../services/data.service';
import * as S3 from 'aws-sdk/clients/s3';
import { NgbModal, NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { APIConfig } from 'src/app/config/api-config';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-upload-file',
  templateUrl: './upload-file.component.html',
  styleUrls: ['./upload-file.component.scss']
})
export class UploadFileComponent implements OnInit {
  config;
  percent;
  completed = false;
  showUpload = true;
  currentFile: any;
  generatedDocId: any;
  success: boolean = false;
  orgTypeOptions: any;
  docTypeOptions: any;
  orgTypeSelect: any;
  docTypeSelect: any;
  @Output() dataSubmitted = new EventEmitter();
  private uploadConfig: any;
  folderName: any;
  closeResult: string;
  @Input() id: any;
  @Output() submitData = new EventEmitter<any>();
  isUploadFileLimitExceed: boolean;
  apiConfig: any = APIConfig;
  ADMIN_EMAIL;// = `mailto:${APIConfig.ADMIN_EMAILID}`;
  ADMIN;// = APIConfig.ADMIN_EMAILID;
  fileSizeError = false;
  isAdmin = (localStorage.getItem('role') === 'admin') ? true : false;
  filetypeError: boolean = false;

  NO_OF_ALLOWED_PAGES: number;
  MAX_FILE_SIZE: number;
  consumtionMessageVisibility = 0;

  constructor(
    private router: Router,
    private blob: BlobService,
    private dataService: DataService,
    private auth: AuthService,
    private modalService: NgbModal,
    public activeModal: NgbActiveModal,
  ) {
    this.consumtionMessageVisibility = this.auth.getConsumptionVisibility();
  }
  ngOnInit() {
    this.NO_OF_ALLOWED_PAGES = this.auth.getMaximumAllowedPages();
    this.MAX_FILE_SIZE = this.auth.getMaximumFileSizeLimit();

    this.checkUploadLimit();
    this.fetchOrgAndDocType();

    let adminDetails = this.auth.getAdminDetails();
    this.ADMIN = adminDetails.EmailId;
    this.ADMIN_EMAIL = adminDetails.MailToId;
  }

  checkUploadLimit() {
    if (this.consumtionMessageVisibility == 1 && !this.isAdmin) {
      this.dataService.checkDocumnetsExceedLimit().subscribe(res => {

        if (res && res.result[0]) {
          localStorage.setItem('consumedPages', res.result[0].totalPageCount);
          if (res.result[0].totalPageCount >= this.auth.getMaximumAllowedPages()) {
            this.isUploadFileLimitExceed = true;
            this.showUpload = false;
          }
          else {
            this.showUpload = true;
          }
        }
      })
    }
    else {
      this.isUploadFileLimitExceed = false;
      this.showUpload = true;
    }
  }

  fetchOrgAndDocType() {

    let orgAndDocType = this.dataService.getOrgAndDocType();
    this.orgTypeOptions = JSON.parse(orgAndDocType.ORGTYPE_OPTIONS);
    this.docTypeOptions = JSON.parse(orgAndDocType.DOCTYPE_OPTIONS);
    //Set the first to default always
    this.orgTypeSelect = this.orgTypeOptions[0];
    this.docTypeSelect = this.docTypeOptions[0];
  }

  checkExtractionStatus() {
    // will moved to alluploads
    var intervalID = setInterval(() => {
      this.dataService.checkStatus(this.generatedDocId).subscribe((res) => {
        if (res && res.responseCode == 'OK' && res.result && res.result.status == 'COMPLETED') {
          clearInterval(intervalID);
          this.dataSubmitted.emit(true);
        }
        else {
          console.log("status-->InProgress");
        }
      })
    }, 5000);
  }

  upload(files, event) {
    this.currentFile = files[0];
    if (this.currentFile.type == 'application/pdf' || this.currentFile.type == 'image/tiff') {
      (!this.isAdmin) ?
        ((this.currentFile.size / (1024 * 1024) <= this.MAX_FILE_SIZE) ? this.generateDocumentId() : this.fileSizeError = true) :
        this.generateDocumentId();
    }
    else {
      this.filetypeError = true;
    }
  }
  //  get document  id
  generateDocumentId() {
    this.dataService.generateDocumentId().subscribe(res => {
      if (res && res.result && res.result.id) {
        this.generatedDocId = res.result.id;
        this.generateSASToken(event, 'import'); // Get all upload details from the server including the azure blob / aws s3  configuration .
      } else {
        this.generatedDocId = null;
      }
    });
  }

  // get token for uploads
  generateSASToken(event, type) {
    this.dataService.generateSASToken(this.generatedDocId + '_' + this.currentFile.name, 'invoice').subscribe(
      res => {
        if (res && res.token) {
          // Get all upload details from the server including the azure blob / aws s3  configuration
          if (res.storageType === 'azure') {
            let azureConfig = res.config;
            this.uploadConfig = {
              sas: '?' + res.token,
              storageAccount: azureConfig.account,
              containerName: azureConfig.container
            };
            this.azureUpload();
          } else if (res.storageType === 'aws') {
            this.awsUpload(event, res);
          } else if (res.storageType === 'localblob') {
            let input = new FormData();
            input.append('file', this.currentFile, this.currentFile.name);
            this.fileStoreLocalPath(input, type); // call function for local file upload
          } else {
            console.error('Storage Type is not defined OR Invalid Storage Type.');
            this.dataService.showError('Error uploading Document', 'Error!');
          }
        }
      },
      err => {
        console.error('error while fetching the SAS token', err);
        this.dataService.showError('Error uploading Document', 'Error!', this.dataService.getAlertTimeOut());
      }
    );
  }

  //file store on local network path
  fileStoreLocalPath(input, folderType) {
    this.showUpload = false;
    this.dataService.storeFileUpload(input, folderType).subscribe(
      res => {
        if (res && res.responseCode === 'OK' && res.result && res.result.path) {
          const docUrl = res.result.path;
          this.addInvoice(docUrl, this.currentFile);
        } else {
          this.completed = true;
          this.success = false;
          this.dataService.showError('Error while uploading file', 'Error!', this.dataService.getAlertTimeOut());
        }
      },
      err => {
        this.completed = true;
        this.success = false;
        this.dataService.showError('Error while uploading file', 'Error!', this.dataService.getAlertTimeOut());
      }
    );
  }

  //azure files upload function
  azureUpload() {
    if (this.currentFile) {
      this.completed = false;
      this.showUpload = false;
      const baseUrl = this.blob.generateBlobUrl(
        this.uploadConfig,
        this.generatedDocId + '_' + this.currentFile.name
      );
      this.config = {
        baseUrl: baseUrl,
        sasToken: this.uploadConfig.sas,
        blockSize: 1024 * 64, // OPTIONAL, default value is 1024 * 32
        file: this.currentFile,
        complete: res => {
          let docUrl =
            '/import/' + this.generatedDocId + '_' + this.currentFile.name;
          this.addInvoice(docUrl, this.currentFile);
        },
        error: err => {
          this.completed = true;
          this.success = false;
        },
        progress: percent => {
          this.percent = percent + '%';
        }
      };
      this.blob.upload(this.config);
    }
  }

  // select the file for upload
  awsUpload(event, awsConfig) {
    if (event.target.files && event.target.files[0]) {
      const dataLength: any = event.target.files;
      for (var i = 0; i < dataLength.length; i++) {
        let reader = new FileReader();
        reader.readAsDataURL(dataLength[i]);
        let fileName: any = dataLength[i].name;
        reader.onload = (element: any) => {
          let fileData = element.target.result;
          let base64Data = fileData.split(',')[1];
          let filePayload = {
            fileName: fileName,
            fileBody: base64Data
          };
          this.awsFileUpload(filePayload, awsConfig);
        };
      }
    }
  }

  // aws file upload function `
  awsFileUpload(file, awsConfig) {
    let awsConfiguration = awsConfig.config;
    this.folderName = awsConfiguration.folderName;
    const bucket = new S3({
      accessKeyId: awsConfiguration.accessKeyId,
      secretAccessKey: awsConfiguration.secretAccessKey,
      region: awsConfiguration.region
    });
    const params = {
      Bucket: awsConfiguration.bucketName,
      Key: this.folderName + '/' + file.fileName,
      Body: file.fileBody
    };
    let currentFileData = this.currentFile;
    const that = this;
    bucket.upload(params, function (err, data) {
      if (err) {
        this.dataService.showError('Error uploading Image', 'Error!');
      } else {
        const docUrl = data.Location;
        that.addInvoice(docUrl, currentFileData);
      }
    });
  }

  navigateTo(loc) {
    this.router.navigate([loc]);
  }

  addInvoice(uploadUrl, file) {
    if (this.generatedDocId) {
      let payload = {
        documentId: this.generatedDocId,
        fileName: file.name,
        documentType: 'invoice',
        mimeType: file.type,
        uploadUrl: uploadUrl,
        size: file.size,
        orgType: this.orgTypeSelect.orgType || "",
        orgTypeId: this.orgTypeSelect.orgTypeId || "",
        docType: this.docTypeSelect.docType || "",
        docTypeId: this.docTypeSelect.docTypeId || "",
        status: 'NEW',
        submittedBy: 'system',
        userId: localStorage.getItem("userId"), // added by gaurav
        extraction_completed: 0,
        create_rpa_data: true
      };

      this.dataService.addDocument(payload).subscribe(res => {
        if (res && res.responseCode == 'OK') {
          this.completed = true;
          this.success = true;
          this.dataSubmitted.emit(true);

          // this.checkExtractionStatus();
        } else {
          this.completed = true;
          this.success = false;
        }
      });
    } else {
      this.completed = true;
      this.success = false;
    }
  }

  get fileSize() {
    return (Number(this.currentFile.size) / 1024).toFixed(2);
  }

  get fileSizeInMB() {
    return (Number(this.currentFile.size) / (1024 * 1024)).toFixed(2);
  }

  onYes() {
    this.submitData.emit({
      result: 'success',
      id: this.id
    });
    this.activeModal.close();
  }
  dismissModal() {
    this.activeModal.close();
  }
}
