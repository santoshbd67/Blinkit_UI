import {
  Component,
  OnInit,
  Output,
  EventEmitter,
  Input,
  SimpleChange,
  SimpleChanges
} from "@angular/core";
import { NgbModal, NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { DataService } from "src/app/services/data.service";
import { VendorDataModel } from "./vendorData.model";
import { BlobService } from "angular-azure-blob-service";

import { VendorInputFields } from "./modal-modify-vendor.config";
import { environment } from "src/environments/environment";
import { debounce } from "rxjs/operators";
import { timer } from "rxjs";

@Component({
  selector: "app-modal-modify-vendor",
  templateUrl: "./modal-modify-vendor.component.html",
  styleUrls: ["./modal-modify-vendor.component.scss"]
})
export class ModalModifyVendorComponent implements OnInit {
  @Input() mode: any; // Add or Edit
  @Input() vendorData: VendorDataModel; //vendorData to modify
  @Output() submitData = new EventEmitter<any>(); //data to be submitted after form submission

  /*All the field that is being used for vendor data add/update.
  Check the config.ts for the const where the values are stored & fetched from
  */
  fields = JSON.parse(JSON.stringify(VendorInputFields));

  vendorLogoFile: any; //Azure or AWS file object to be uploaded

  localCurrentFile: any; //base64 image while uploading vendor logo

  vendorLogoUrl: any; //Path for vendor logo assigned when url is generated for the resource (azure or localblob)
  sampleInvoiceUrl: any; //Path for sampleinvoices assigned when url is generated for the resource (azure or localblob)

  /*getSASToken updates these values to be used while uploading invoice or sampleinvoice 
  for azure or aws(not implemented yet)
  */
  vendorLogoUploadConfig: any; //Returns storage configuration for vendor logo
  sampleInvoiceConfig: any; //Returns storage configuration for sample invoice

  sampleInvoiceFile: any; //Sample Invoice File to be uploaded
  sampleInvoiceLocalFile: any; //Sample Invoice File Name Selected for upload
  sampleMimeType: any; //Storing mimetype for sampleinvoices file to be used in payload when calls getTiffInvoiceURL

  sampleInvoiceFileContainer: any; //Container configuration received in getSASToken while  uploading sampleinvoices
  configureStorageType: any; //StorageType is assigned when getSASToken returns the storage type in configuration
  storageContainer: any; // Stores container type while uploading
  validVendorId: boolean = false; //validation status of vendorId while adding a new vendor

  sampleInvoiceURLFull:string;
  
  constructor(
    private modalService: NgbModal,
    public activeModal: NgbActiveModal,
    private dataService: DataService,
    private blob: BlobService
  ) {}

  ngOnInit() {
    if (this.vendorData) {
      this.vendorData = JSON.parse(JSON.stringify(this.vendorData));
      this.vendorData["xmlMapping"] = JSON.stringify(
        this.vendorData["xmlMapping"]
      );
      this.fetchVendorLogo();
      this.getSampleInvoice(this.vendorData.sampleInvoices);
    }
    this.defaultVendorData();
  }

  defaultVendorData() {
    if (!this.vendorData) {
      this.vendorData = {
        name: "",
        logo: "",
        address: "",
        vendorId: "",
        currency: "",
        xmlMapping: "",
        sampleInvoices: ""
      };
    }
  }

  // close the modal
  dismissModal() {
    this.activeModal.close();
  }
  // close the modal
  closeModal(result) {
    this.submitData.emit({
      result: result
    });
    this.activeModal.close();
  }

  // upload logo for vendor
  uploadImage(event, type) {
    let reader = new FileReader();
    reader.readAsDataURL(event.target.files[0]);
    reader.onload = (element: any) => {
      this.localCurrentFile = reader.result;
    };
    this.generateSASToken(event.target.files[0], type);
  }
  // upload logo for vendor
  addSampleInvoice(event, type) {
    this.sampleInvoiceLocalFile = event.target.files[0].name;
    const mimeType = event.target.files[0].type;
    this.sampleMimeType = mimeType;
    this.generateSASToken(event.target.files[0], type);
  }

  // get token for uploads
  generateSASToken(fileData, type) {
    this.dataService.generateSASToken(fileData.name, type).subscribe(
      res => {
        if (res && res.token) {
          this.configureStorageType = res.storageType;
          this.vendorData.storageType = this.configureStorageType;
          if (res.storageType === "azure") {
            // Get all upload details from the server including te azure blob / aws s3  configuration
            let azureConfig = res.config;
            if (type === "assets") {
              this.vendorLogoFile = fileData;
              this.vendorLogoUploadConfig = {
                sas: "?" + res.token,
                storageAccount: azureConfig.account,
                containerName: azureConfig.container
              };
              this.storageContainer = azureConfig.container;
              this.vendorLogoUrl = this.blob.generateBlobUrl(
                this.vendorLogoUploadConfig,
                fileData.name
              );
            }
            //  check  sampleInvoice type
            else if (type === "sampleinvoices") {
              this.sampleInvoiceFile = fileData;
              this.sampleInvoiceFileContainer = azureConfig.container;
              this.storageContainer = azureConfig.container;
              this.sampleInvoiceConfig = {
                sas: "?" + res.token,
                storageAccount: azureConfig.account,
                containerName: azureConfig.container
              };
              this.sampleInvoiceUrl = this.blob.generateBlobUrl(
                this.sampleInvoiceConfig,
                fileData.name
              );
            }
          } else if (res.storageType === "aws") {
            // this.awsUpload(event, res);
          } else if (res.storageType === "localblob") {
            let input = new FormData();
            input.append("file", fileData, fileData.name);
            this.fileStoreLocalPath(input, type); // call function for local file upload
          } else {
            this.dataService.showError("Error uploading Image", "Error!");
          }
        }
      },
      err => {
        this.dataService.showError("Error uploading Image", "Error!");
      }
    );
  }
  //file store on local network path
  fileStoreLocalPath(input, folderType) {
    this.dataService.storeFileUpload(input, folderType).subscribe(
      res => {
        if (res && res.responseCode === "OK" && res.result && res.result.path) {
          if (folderType === "sampleinvoices") {
            this.sampleInvoiceUrl = res.result.path;
            // this.vendorData.sampleInvoices =this.sampleInvoiceUrl;
          }
          if (folderType === "assets") {
            this.vendorLogoUrl = res.result.path;
            this.vendorData.logo = this.vendorLogoUrl;
          }
        } else {
          this.dataService.showError("Error while uploading file", "Error!");
        }
      },
      err => {
        this.dataService.showError("Error while uploading file", "Error!");
      }
    );
  }

  saveForm(isFormValid) {
    if (isFormValid) {
      let userVendorMap = this.validateXMLMapping();

      if (userVendorMap) {
        if (this.configureStorageType === "azure") {
          this.checkVendorLogoAndInvoice();
        } else if (this.configureStorageType === "localblob") {
          this.checkLocalBlobLogoAndInvoice();
        } else if (this.configureStorageType === "aws") {
        } else {
          if (this.vendorData && this.mode === "Edit") {
            // if(this.vendorLogoUrl === this.vendorData.logo && this.sampleInvoiceUrl && this.sampleInvoiceUrl ===this.vendorData.sampleInvoices){
            this.saveVendor();
            // }
          } else {
            this.dataService.showInfo(
              "Select vendor logo & sample invoice to add vendor",
              "Warning"
            ); //fix here
          }
        }
      } else {
        this.dataService.showError(
          "xml Mapping has invalid JSON Format!",
          "error"
        );
      }
    } else {
      this.dataService.showInfo("Fill the required fields & proceed", "info");
    }
  }
  // check XML mapping
  validateXMLMapping() {
    if (this.vendorData.xmlMapping) {
      var mappingText;
      try {
        mappingText = JSON.parse(this.vendorData.xmlMapping);
      } catch (err) {
        console.error("wrong format");
      } finally {
        return mappingText;
      }
    }
  }

  checkLocalBlobLogoAndInvoice() {
    // this.vendorData.logo = this.vendorLogoUrl;//**
    // this.vendorData.sampleInvoices = this.sampleInvoiceUrl;//**
    this.getTiffInvoiceURL();
  }

  fetchVendorLogo() {
    if (this.vendorData && this.vendorData.logo) {
      this.dataService.getVendorLogo(this.vendorData.logo).subscribe(res => {
        if (res.result.blobURL) {
          this.vendorData.logo = res.result.blobURL;
        }
      });
    }
  }

  // check the  logo and sample invoices URL
  checkVendorLogoAndInvoice() {
    switch (this.mode) {
      case "Add": {
        if (this.vendorLogoUrl && this.sampleInvoiceUrl) {
          this.azureVendorLogoUpload("callSampleInvoiceUpload");
        } else {
          this.dataService.showInfo(
            "Please upload the logo and Sample invoice",
            "info"
          );
        }
        break;
      }
      case "Edit": {
        if (this.vendorLogoUrl || this.sampleInvoiceUrl) {
          if (this.vendorLogoUrl) {
            this.azureVendorLogoUpload();
          }
          if (this.sampleInvoiceUrl) {
            this.azureSampleInvoicesUpload();
          }
        } else {
          this.getTiffInvoiceURL();
        }
        break;
      }
      default: {
        this.dataService.showInfo(
          "Please upload the logo or Sample invoice",
          "info"
        );
        break;
      }
    }
  }

  //azure files upload function
  azureVendorLogoUpload(action?) {
    if (this.vendorLogoFile) {
      let azureConfig: any = {
        baseUrl: this.vendorLogoUrl,
        sasToken: this.vendorLogoUploadConfig.sas,
        blockSize: 1024 * 64, // OPTIONAL, default value is 1024 * 32
        file: this.vendorLogoFile,
        complete: res => {
          this.vendorData.logo = this.vendorLogoUrl; //**
          if (action) {
            this.azureSampleInvoicesUpload();
          } else {
            this.getTiffInvoiceURL();
          }
        },
        error: err => {
          this.dataService.showError("Error uploading vendor logo", "Error!");
        }
      };
      this.blob.upload(azureConfig);
    }
  }

  //azure files upload function
  azureSampleInvoicesUpload() {
    if (this.sampleInvoiceFile) {
      let azureConfig: any = {
        baseUrl: this.sampleInvoiceUrl,
        sasToken: this.sampleInvoiceConfig.sas,
        blockSize: 1024 * 64, // OPTIONAL, default value is 1024 * 32
        file: this.sampleInvoiceFile,
        complete: res => {
          let invoiceStr = this.sampleInvoiceUrl.split(
            this.sampleInvoiceFileContainer
          );
          let location = "/" + this.sampleInvoiceFileContainer + invoiceStr[1];
          // this.vendorData.sampleInvoices = location;//**
          this.sampleInvoiceUrl = location; //**
          this.getTiffInvoiceURL();
        },
        error: err => {
          this.dataService.showError("Error uploading vendor logo", "Error!");
        }
      };
      this.blob.upload(azureConfig);
    }
  }

  getTiffInvoiceURL() {
    if (
      this.vendorData &&
      this.sampleInvoiceUrl &&
      this.vendorData.sampleInvoices !== this.sampleInvoiceUrl
    ) {
      let req = {
        vendorId: this.vendorData.vendorId,
        location: this.sampleInvoiceUrl,
        mimeType: this.sampleMimeType,
        pageIndex: 1
      };

      this.dataService
        .getTiffInvoiceURL(req)
        .toPromise()
        .then(res => {
          if (res && res.result && res.result.location) {
            this.vendorData.sampleInvoices = res.result.location;
            this.saveVendor();
          } else {
            this.dataService.showInfo(
              "Error while updating sample invoice for the vendor",
              "Error"
            );
          }
        })
        .catch(err => {
          this.dataService.showInfo(
            "Error while updating sample invoice for the vendor",
            "Error"
          );
        });
    } else {
      this.saveVendor();
    }
  }

  // check the mode and call functions
  saveVendor() {
    if (this.mode === "Add") {
      if (this.validVendorId) {
        this.addVendor();
      } else {
        this.dataService.showError(
          "VendorId is not available, please choose a different one",
          "Error"
        );
      }
    } else if (this.mode === "Edit") {
      this.updateVendor();
    } else {
      this.dataService.showInfo("Choose Add or Edit Vendor action", "Info");
    }
  }
  // ADD VENDOR
  addVendor() {
    let payload = JSON.parse(JSON.stringify(this.vendorData));

    if (payload.xmlMapping && typeof payload.xmlMapping !== "object") {
      payload.xmlMapping = JSON.parse(payload.xmlMapping);
    }

    this.dataService.addVendor(payload).subscribe(
      res => {
        if (res && res.responseCode === "OK") {
          this.dataService.showSuccess("Vendor added successfully", "Success");
          this.closeModal("success");
        } else {
          this.dataService.showError("Error while adding vendor", "Error");
        }
      },
      err => {
        this.dataService.showError("Error while adding vendor", "Error");
      }
    );
  }

  // EDIT VENDOR
  updateVendor() {
    let payload = JSON.parse(JSON.stringify(this.vendorData));
    if (payload.xmlMapping && typeof payload.xmlMapping !== "object") {
      payload.xmlMapping = JSON.parse(payload.xmlMapping);
    }

    this.dataService.editVendor(payload).subscribe(
      res => {
        if (res && res.responseCode === "OK") {
          this.dataService.showSuccess(
            this.vendorData.name + " " + "Vendor info updated",
            "Success"
          );
          this.closeModal("success");
        } else {
          this.dataService.showError(
            "Error while updating vendor" + " " + this.vendorData.name,
            "Error"
          );
        }
      },
      err => {
        this.dataService.showError(
          "Error while updating vendor" + " " + this.vendorData.name,
          "Error"
        );
      }
    );
  }

  validateVendorId(vendordata) {
    if (this.mode === "Add") {
      const debouncedRequest = this.dataService
        .validateVendorId(this.vendorData.vendorId)
        .pipe(debounce(() => timer(1500)));

      debouncedRequest.subscribe(
        res => {
          if (res.responseCode === "OK") {
            this.validVendorId = true;
          } else {
            this.validVendorId = false;
          }
        },
        err => {
          console.error("error while validating vendorId", err);
          this.validVendorId = false;
        }
      );
    }
  }

  // getSampleInvoice(path){
  //   let fullPath;
  //   if(path.search('http') === -1){
  //     const file = path.substring(path.lastIndexOf('/')+1,path.length);
  //     fullPath = environment.baseAPI +'static/sampleinvoices/'+file;
  //   }
  //   else{
  //     fullPath = path;
  //   }
  //   return fullPath;
  // }

  getSampleInvoice(relativePath) {
    // let data = {
    //   container: relativePath.split("/")[0],
    //   blobName: relativePath.split("/")[1],
    //   fullPath: relativePath,
    //   storageType: "azure"
    // };
    const fileName = relativePath.substring(relativePath.lastIndexOf('/'),relativePath.length);
    
    let data = {
      container: 'sampleinvoices',
      blobName: fileName,
      fullPath: relativePath,
      storageType: "azure"
    };

    this.dataService.getBlobURL(data).subscribe(
      res => {
        if(res && res.responseCode==='OK' && res.result.blobURL){
          this.sampleInvoiceURLFull = res.result.blobURL;
        }
        else{
          this.sampleInvoiceURLFull = null;
        }
      },
      err => {
        console.error("error while fetching the invoice url", err);
        this.sampleInvoiceURLFull = null;
      }
    );
  }
}
