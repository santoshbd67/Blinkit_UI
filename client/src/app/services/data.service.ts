import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, tap } from 'rxjs/operators';
import { of, BehaviorSubject } from 'rxjs';
import { APIConfig } from '../config/api-config';
import { AppConfig } from '../config/app-config';
import { ToastrManager } from 'ng6-toastr-notifications';
import * as moment from 'moment';
import * as uuid from 'uuid';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  constructor(private http: HttpClient, public toastr: ToastrManager) { }

  apiConfig: any = APIConfig;
  appConfig: any = AppConfig;

  vendorData = new BehaviorSubject<any>(null);
  vendorObserver = this.vendorData.asObservable();

  selectedFilter = new BehaviorSubject<any>(null);
  filterObserver = this.selectedFilter.asObservable();

  consumedPages = new BehaviorSubject<string>('0');
  consumedPagesObservable = this.consumedPages.asObservable();

  reviewerBody = {
    content_msg: '',
    action: '',
    RefreshMessage: ''
  }

  // Fetch a particular document using documentId
  getDocument(documentId) {
    let dataURL = environment.baseAPI + this.apiConfig.API.getDocument + documentId;
    return this.http.get(dataURL).pipe(
      tap(_ => {
        // console.log('fetched data')
      }),
      catchError(this.handleError('getData', null))
    );
  }

  // Fetch a particular document status whether it is under review or not
  getDocumentReviewStatus(documentId) {

    const dataURL = environment.baseAPI + this.apiConfig.API.getDocumentReviewStatus + documentId;

    return this.http.get(dataURL).pipe(
      tap(_ => {
        // console.log('fetched data')
      }),
      catchError(this.handleError('getData', null))
    );
  }

  // get sinle document for reviewer whose status is in Review and document_review_status is not UnderReview
  getSingleDocumentForReviewer() {
    const payload = {
      id: 'api.document.getSingleDocumentForReviewer',
      ver: '2.0',
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: { token: localStorage.getItem("token") }
    };

    const dataURL = environment.baseAPI + this.apiConfig.API.getSingleDocumentForReviewer;

    return this.http.post(dataURL, payload).pipe(
      tap(_ => {
        // console.log('fetched data')
      }),
      catchError(this.handleError('getData', null))
    );
  }

  getEndOfTheDay(ts) {
    return new Date(ts).setHours(23, 59, 59, 59);
  }

  getStartOfTheDay(ts) {
    return new Date(ts).setHours(0, 0, 0, 0);
  }

  getISOString(date, ts?): any {
    if (ts) {
      return new Date(date).getTime();
    } else {
      return new Date(date).toISOString();
    }
  }

  getUTCString(date, ts?): any {
    if (ts) {
      date = new Date(date);
      var now_utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(),
        date.getUTCDate(), date.getUTCHours(),
        date.getUTCMinutes(), date.getUTCSeconds());
      return new Date(now_utc).getTime();
      //return new Date(date).getTime();
    } else {
      return new Date(date).toUTCString();
    }
  }

  getAppropriateFilters(originalFilter) {
    let updatedFilter = JSON.parse(JSON.stringify(originalFilter));

    if (updatedFilter && updatedFilter.invoiceDate) {
      const date = updatedFilter.invoiceDate.split('_');
      if (date && date.length > 1) {
        updatedFilter.invoiceDate = {
          '>=': this.getISOString(this.getStartOfTheDay(date[0])),
          '<=': this.getISOString(this.getEndOfTheDay(date[1]))
        };
      } else if (date && date.length === 1) {
        const eachDateBlock = updatedFilter.invoiceDate.split('-');
        updatedFilter.invoiceDate =
          eachDateBlock[0] +
          '-' +
          (eachDateBlock[1].length === 1
            ? '0' + eachDateBlock[1]
            : eachDateBlock[1]) +
          '-' +
          (eachDateBlock[2].length === 1
            ? '0' + eachDateBlock[2]
            : eachDateBlock[2]);
      }
    }

    if (updatedFilter && updatedFilter.submittedOn) {
      const date = updatedFilter.submittedOn.split('_');

      if (date && date.length > 1) {
        updatedFilter.submittedOn = {
          '>=': this.getISOString(this.getStartOfTheDay(date[0]), 'ts'),
          '<=': this.getISOString(this.getEndOfTheDay(date[1]), 'ts')
        };

      }
      else if (date && date.length === 1) {
        // commented to fix the timezone issue for single date on 19-03-2023
        // const eachDateBlock = updatedFilter.submittedOn.split('-');

        // updatedFilter.submittedOn = this.getISOString(
        //   eachDateBlock[0] +
        //   '-' +
        //   (eachDateBlock[1].length === 1
        //     ? '0' + eachDateBlock[1]
        //     : eachDateBlock[1]) +
        //   '-' +
        //   (eachDateBlock[2].length === 1
        //     ? '0' + eachDateBlock[2]
        //     : eachDateBlock[2]),
        //   'ts'
        // );

        // updatedFilter.submittedOn = {
        //   '>=':
        //     moment(updatedFilter.submittedOn)
        //       .startOf('day')
        //       .unix() * 1000,
        //   '<=':
        //     moment(updatedFilter.submittedOn)
        //       .endOf('day')
        //       .unix() * 1000
        // };


        updatedFilter.submittedOn = {
          '>=': this.getISOString(this.getStartOfTheDay(date[0]), 'ts'),
          '<=': this.getISOString(this.getEndOfTheDay(date[0]), 'ts')
        };
      }
    }

    //TODO on 23-12-2022 
    if (updatedFilter && updatedFilter.approvalStatus && updatedFilter.approvalStatus == 'Hold OR Pending') {
      let statusList = updatedFilter.approvalStatus.split("OR");
      let status1 = statusList[0].trim();
      let status2 = statusList[1].trim();

      updatedFilter.approvalStatus = [status1, status2]
    }

    let userRole = localStorage.getItem('role');
    if (userRole !== "admin" && userRole !== "clientadmin") {
      updatedFilter.userId = localStorage.getItem('userId');
    }

    return updatedFilter;
  }

  // Find documents on filter
  findDocument(filter, page) {

    let docUrl = environment.baseAPI + this.apiConfig.API.findDocument;

    switch (localStorage.getItem('role')) {
      case 'reviewer':
        docUrl = environment.baseAPI + this.apiConfig.API.findDocsForReveiwer;
        break;
      case 'approver':
        docUrl = environment.baseAPI + this.apiConfig.API.findDocsForApprover;
        break;
      default:
        break;
    }

    const updatedFilter = this.getAppropriateFilters(filter);

    localStorage.setItem("CurrentFilter", JSON.stringify(updatedFilter));

    const perItem = 12;

    const payload = {
      id: 'api.document.find',
      ver: '1.0',
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: {
        filter: updatedFilter,
        offset: (page - 1) * perItem,
        limit: perItem,
        page,
        token: localStorage.getItem('token'),
        emailId: localStorage.getItem('emailId')
      }
    };

    return this.http
      .post(docUrl, payload, {})
      .pipe(catchError(this.handleError('getData', null)));
  }

  validateDocumentResult(data) {
    const docUrl = environment.baseAPI + this.apiConfig.API.validateDocumentResult;
    const payload = {
      id: 'api.document.validateDocumentResult',
      ver: '2.0',
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: {
        documentId: data.documentId
      }
    }

    return this.http
      .post(docUrl, payload, {});
  }

  searchDocument(searchKey, page) {
    const perItem = 12;
    const docUrl = environment.baseAPI + this.apiConfig.API.searchDocument;

    const payload = {
      id: 'api.document.find',
      ver: '1.0',
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: {
        filter: { searchKey },
        offset: (page - 1) * perItem,
        limit: perItem,
        page,
        token: localStorage.getItem('token')
      }
    };

    return this.http
      .post(docUrl, payload, {})
      .pipe(catchError(this.handleError('getData', null)));
  }

  // Fetch a template using templateId
  getTemplate(templateId) {
    const docUrl =
      environment.baseAPI + this.apiConfig.API.getTemplate + templateId;
    return this.http
      .get(docUrl, {})
      .pipe(catchError(this.handleError('getData', null)));
  }

  // Fetch document result using documentId
  getDocumentResult(documentId) {

    const docUrl =
      environment.baseAPI + this.apiConfig.API.getDocumentResult + documentId;
    return this.http
      .get(docUrl, { headers: { tokenid: 'vtucupWt0pZBVYcPVgzQ/A==' } })
      .pipe(catchError(this.handleError('getData', null)));
  }

  // Handle errors
  handleError(operation = 'operation', result?) {
    return (error: any) => {
      return of(error);
    };
  }

  // Setting vendor data to be used in other components
  setVendorData(vendorData) {
    this.vendorData.next(vendorData);
  }

  setSelectedFilter(selectedFilter) {
    this.selectedFilter.next(selectedFilter);
  }

  // Generate documentId
  generateDocumentId() {
    const docUrl = environment.baseAPI + this.apiConfig.API.generateDocumentId;
    return this.http
      .get(docUrl, {})
      .pipe(catchError(this.handleError('getData', null)));
  }

  // Generate Timestamp
  generateTimestamp() {
    return Math.round(new Date().getTime() / 1000);
  }

  checkDocumnetsExceedLimit() {
    const docUrl = environment.baseAPI + this.apiConfig.API.validateNoOfDocsUploaded;
    return this.http
      .get(docUrl)
      .pipe(catchError(this.handleError('checkDocumnetsExceedLimit', null)));
  }

  checkConsumedQuota() {
    this.checkDocumnetsExceedLimit().subscribe(res => {
      if (res && res.result && res.result.length > 0 && res.result[0]) {
        localStorage.setItem('consumedPages', res.result[0].totalPageCount);
        this.consumedPages.next(res.result[0].totalPageCount);
      } else {
        localStorage.setItem('consumedPages', "0");
        this.consumedPages.next("0");
      }
    })
  }

  // get docs that needs to be discussed.
  getDocumentsToBeRefreshed(documents: any[]) {
    let refreshingDocs = [];

    if (documents.length > 0) {
      documents.filter((doc, index) => {
        // if (doc && doc.extraction_completed === 0 && doc.status !== 'FAILED') {
        //   refreshingDocs.push({ documentId: doc.documentId, index })
        // }
        //  updated condition for refreshing doc, it would be only
        //  considered for refreshing if doc's extraction_completed
        //  key is 0 and doc's status is either NEW or EXTRACTION_INPROGRESS
        if (doc && doc.extraction_completed === 0 && (doc.status === 'NEW' || doc.status === 'EXTRACTION_INPROGRESS')) {
          refreshingDocs.push({ documentId: doc.documentId, index })
        }
      })
    }

    return refreshingDocs;
  }

  getActualConsumptionData() {
    const docUrl = environment.baseAPI + this.apiConfig.API.actualConsumptionData;
    return this.http.get(docUrl).pipe(catchError(this.handleError('getActualConsumptionData', null)));
  }

  // Add a new document (Invoice)
  addDocument(body) {
    const payload = {
      id: 'api.document.add',
      ver: '1.0',
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: body
    };

    const docUrl = environment.baseAPI + this.apiConfig.API.addDocument;
    return this.http
      .post(docUrl, payload, {})
      .pipe(catchError(this.handleError('add Data', null)));
  }

  // Start extraction
  startExtraction(data) {
    const payload = {
      id: 'api.document.add',
      ver: '1.0',
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: data
    };

    const docUrl = environment.baseAPI + this.apiConfig.API.startExtraction;

    return this.http
      .post(docUrl, payload, {})
      .pipe(catchError(this.handleError('add Data', null)));
  }

  // Start Preprocessing
  startPreprocessing(data) {
    const payload = {
      id: 'api.document.update',
      ver: '1.0',
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: data
    };

    const docUrl = environment.baseAPI + this.apiConfig.API.startPreprocessing;

    return this.http
      .post(docUrl, payload, {})
      .pipe(catchError(this.handleError('update data', null)));
  }

  retryExraction(data) {
    const url =
      environment.baseAPI + this.apiConfig.API.updateDocument + data.documentId;
    const payload = {
      id: 'api.document.update',
      ver: '1.0',
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: {
        documentId: data.documentId,
        status: 'READY_FOR_EXTRACTION',
        stage: 'PRE-PROCESSOR'
      }
    };
    return this.http
      .post(url, payload, {})
      .pipe(catchError(this.handleError('update Document:', null)));
  }

  updateDocumentData(data) {
    const url =
      environment.baseAPI + this.apiConfig.API.updateDocument + data.documentId;
    const payload = {
      id: 'api.document.update',
      ver: '1.0',
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: data
    };
    return this.http
      .post(url, payload, {})
      .pipe(catchError(this.handleError('update Document:', null)));
  }

  // Update document result
  updateDocumentResult(payload, action, storedTime, reassignReviewTime?) {
    delete payload._id;
    const modifiedPayload = {
      ver: '1.0',
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4(),
        action
      },
      request: payload,
      reviewTime: storedTime
    };

    if(reassignReviewTime) modifiedPayload['reassignReviewTime'] = reassignReviewTime;

    const docUrl =
      environment.baseAPI +
      this.apiConfig.API.updateDocumentResult +
      payload.documentId;
    return this.http
      .post(docUrl, modifiedPayload, {})
      .pipe(catchError(this.handleError('result update data', null)));
  }

  // epoch to milliseconds
  epochTsToMili(epoch) {
    if (epoch && epoch.toString().length > 10) {
      return epoch;
    } else {
      return epoch * 1000;
    }
  }

  calculateTotalReviewTime(documentMetadata, startReviewBtnClickedAt) {
    let reviewTime = Math.round(new Date().getTime()) - startReviewBtnClickedAt;
    let totalReviewTimeTaken = ((documentMetadata.totalReviewedTime ? documentMetadata.totalReviewedTime * 1000 : 0) + reviewTime) / 1000;
    // let totalReviewTimeTaken;
    // if (documentMetadata.totalReviewedTime) {
    //   totalReviewTimeTaken = ((documentMetadata.totalReviewedTime * 1000) + reviewTime) / 1000;
    // }
    // else {
    //   totalReviewTimeTaken = reviewTime / 1000;
    // }
    //((documentMetadata.totalReviewedTime ? documentMetadata.totalReviewedTime * 1000 : 0) + reviewTime) / 1000;
    return totalReviewTimeTaken;
  }

  calculateReassignReviewTime(documentMetadata, startReviewBtnClickedAt) {
    let reviewTime = Math.round(new Date().getTime()) - startReviewBtnClickedAt;
    let totalReviewTimeTaken = ((documentMetadata.reassignReviewTime ? documentMetadata.reassignReviewTime * 1000 : 0) + reviewTime) / 1000;
    return totalReviewTimeTaken;
  }

  // Delete a document using documentId
  deleteDocument(deleteObj) {
    const docUrl = environment.baseAPI + this.apiConfig.API.deleteDocument;

    const payload = {
      id: 'api.document.delete',
      ver: '1.0',
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: {
        documentId: deleteObj.documentId,
        reason: deleteObj.deleteReason,
        totalReviewTime: deleteObj.totalReviewTime
      }
    };
    return this.http
      .post(docUrl, payload, {})
      .pipe(catchError(this.handleError('getData', null)));
  }

  // Fetch list of all vendors
  getVendorList(vendorObj) {
    const payload = {
      id: 'api.vendor.list',
      ver: '1.0',
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: {
        filter: vendorObj.filter,
        offset: vendorObj.offset,
        limit: vendorObj.limit,
        page: vendorObj.page,
        token: localStorage.getItem('token')
      }
    };
    const url = environment.baseAPI + this.apiConfig.API.getVendorList;
    return this.http
      .post(url, payload, {})
      .pipe(catchError(this.handleError('getData', null)));
  }

  // edit Vendor
  editVendor(request) {
    const payload = {
      id: 'api.dashboard.Vendor.edit',
      ver: '1.0',
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request
    };
    const url =
      environment.baseAPI + this.apiConfig.API.editVendor + request.vendorId;
    return this.http
      .post(url, payload, {})
      .pipe(catchError(this.handleError('edit Vendor', null)));
  }

  validateUser(request) {
    const payload = {
      id: 'api.user.add',
      ver: '1.0',
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: {
        userDetails: request
      }
    };
    const url = environment.baseAPI + this.apiConfig.API.addUser;
    return this.http
      .post(url, payload, {})
      .pipe(catchError(this.handleError('add user', null)));
  }

  encryptPayload(payload) {
    let encoded = window.btoa(payload);
    return encoded;
  }

  updateUser(request) {
    const payload = {
      id: 'api.user.update',
      ver: '1.0',
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: this.encryptPayload(JSON.stringify(request))
    };
    const url = environment.baseAPI + this.apiConfig.API.updateUser;
    return this.http
      .post(url, payload, {})
      .pipe(catchError(this.handleError('add user', null)));
  }

  // validate vendorId before creating
  validateVendorId(vendorId) {
    const payload = {
      id: 'api.vendor.validate',
      ver: '1.0',
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: { vendorId }
    };
    const url = environment.baseAPI + this.apiConfig.API.validateVendorId;
    return this.http
      .post(url, payload, {})
      .pipe(catchError(this.handleError('validate vendorId', null)));
  }

  // add Vendor
  addVendor(request) {
    const payload = {
      id: 'api.dashboard.Vendor.add',
      ver: '1.0',
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request
    };
    const url = environment.baseAPI + this.apiConfig.API.addVendor;
    return this.http
      .post(url, payload, {})
      .pipe(catchError(this.handleError('add vendor', null)));
  }
  // delete Vendor
  deleteVendor(request) {
    const payload = {
      id: 'api.dashboard.Vendor.delete',
      ver: '1.0',
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request
    };
    const url = environment.baseAPI + this.apiConfig.API.deleteVendor;
    return this.http
      .post(url, payload, {})
      .pipe(catchError(this.handleError('delete vendor', null)));
  }



  // generate SAS token to be used while uploading document(Invoice)
  generateSASToken(blobName, type) {
    const docUrl =
      environment.baseAPI +
      this.apiConfig.API.generateSASToken +
      '?blobName=' +
      blobName +
      '&type=' +
      type;
    return this.http
      .get(docUrl)
      .pipe(catchError(this.handleError('getData', null)));
  }

  // Toast methods

  // Success Toast
  showSuccess(message: string, title: string, toastTimeout = 10000) {
    this.toastr.successToastr(message, title, {
      position: 'top-center',
      animate: 'slideFromTop',
      showCloseButton: 'x',
      toastTimeout: toastTimeout,
      dismiss: 'click'
    });
  }

  // Error Toast
  showError(message: string, title: string, toastTimeout = 10000) {
    this.toastr.errorToastr(message, title, {
      position: 'top-center',
      animate: 'slideFromTop',
      showCloseButton: 'x',
      toastTimeout: toastTimeout,
      dismiss: 'click'
    });
  }

  // Info Toast
  showInfo(message: string, title: string) {
    this.toastr.infoToastr(message, title, {
      position: 'top-center',
      animate: 'slideFromTop',
      showCloseButton: 'x',
      toastTimeout: 10000,
      dismiss: 'click'
    });
  }

  setImageScrollToTop() {
    document.getElementById('scrollContainer').scrollTop = 0;
  }

  hideCroppedImageContainer() {
    document.getElementById("cropped-image-container").style.display = "none";
  }

  hideHighligherDiv() {
    let div = document.getElementsByClassName("highlight")[0] as HTMLElement;
    if (div) {
      div.style.display = "none";
    }
  }

  showHighlighterDiv() {
    let div = document.getElementsByClassName("highlight")[0] as HTMLElement;
    if (div) {
      div.style.removeProperty("display")
    }
  }

  copyToClipboard(docId) {
    let selBox = document.createElement("textarea");
    selBox.style.position = "fixed";
    selBox.style.left = "0";
    selBox.style.top = "0";
    selBox.style.opacity = "0";
    selBox.value = docId;
    document.body.appendChild(selBox);
    selBox.focus();
    selBox.select();
    document.execCommand("copy");
    document.body.removeChild(selBox);
    this.showSuccess("Document Id copied to clipboard", "success");
  }

  getAlertTimeOut() {
    return this.getUserSettings('ALERT_TIMEOUT');
  }

  getDocumentStats() {
    const docUrl = environment.baseAPI + this.apiConfig.API.getDocumentStats;
    return this.http
      .get(docUrl)
      .pipe(catchError(this.handleError('getData', null)));
  }

  // Fetch Dashboard Statistics
  getDashboardStats(request) {
    const payload = {
      id: 'api.dashboard.stats.read',
      ver: '1.0',
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request
    };

    // let url = environment.baseAPI + this.apiConfig.API.getDashboardStats;
    const url =
      environment.dashboardBase + this.apiConfig.API.getDashboardStats;
    return this.http
      .post(url, payload, {})
      .pipe(catchError(this.handleError('get Dashboard stats', null)));
  }
  // Fetch Dashboard Statistics
  storeFileUpload(payload, folderType) {
    const url =
      environment.baseAPI + this.apiConfig.API.storeUploadFiles + folderType;
    return this.http
      .post(url, payload, {})
      .pipe(catchError(this.handleError('get Dashboard stats', null)));
  }

  getDocumentInfo(key) {
    const payload = {
      id: 'api.document.getInfo',
      ver: '1.0',
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: key
    };
    let dataURL = environment.baseAPI + this.apiConfig.API.getDocumentInfo;
    return this.http.post(dataURL, payload, {}).pipe(
      catchError(this.handleError('getInfo', null)));
  }

  getRawPredictionExistance(documentId) {
    const payload = {
      id: 'api.document.getRawPredictionExistance',
      ver: '1.0',
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: { documentId }
    };
    let dataURL = environment.baseAPI + this.apiConfig.API.getRawPredictionExistance;
    return this.http.post(dataURL, payload, {}).pipe(
      catchError(this.handleError('getRawPredictionExistance', null)));
  }

  getBlobURL(request) {
    const payload = {
      id: 'api.storage.bloburl.read',
      ver: '1.0',
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request
    };

    const url = environment.baseAPI + this.apiConfig.API.getBlobURL;
    return this.http
      .post(url, payload, {})
      .pipe(catchError(this.handleError('get blob URL', null)));
  }

  getFileAvailability(documentId: string, downloadKey: string) {

    const payload = {
      id: 'api.download.fileResult',
      ver: '2.0',
      ts: this.generateTimestamp(),
      params: { msgid: uuid.v4() },
      request: { "documentId": documentId }
    };

    let apiurl = '';

    switch (downloadKey) {
      case 'singleResult':
        apiurl = environment.baseAPI + this.apiConfig.API.downloadSingleFileResult;
        break;
      case 'originalFile':
        apiurl = environment.baseAPI + this.apiConfig.API.downloadOriginalFile;
        break;
      default:
        break;
    }

    return this.http.post(apiurl, payload)
      .pipe(catchError(this.handleError('getFileAvailability', null)));
  }

  getAvailabilityForDownloadFiles(reqPayload) {

    const payload = {
      id: 'api.download.getAvailabilityForDownloadFiles',
      ver: '2.0',
      ts: this.generateTimestamp(),
      params: { msgid: uuid.v4() },
      request: reqPayload,
      time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    let apiurl = environment.baseAPI + this.apiConfig.API.downloadMultipleFilesResult;

    return this.http.post(apiurl, payload)
      .pipe(catchError(this.handleError('getAvailabilityForDownloadFiles', null)));
  }


  saveFile(fileName, downloadablePath) {
    var tempEl = document.createElement("a");
    document.body.appendChild(tempEl);
    tempEl.style.display = "none";
    tempEl.href = downloadablePath;
    tempEl.download = fileName;
    tempEl.click();
    window.URL.revokeObjectURL(downloadablePath);
  }

  saveOrOpenBlob(blob, documentId) {
    var fileName = 'Download_' + documentId + '.xlsx';
    var tempEl = document.createElement("a");
    document.body.appendChild(tempEl);
    tempEl.style.display = "none";
    const url = window.URL.createObjectURL(blob);
    tempEl.href = url;
    tempEl.download = fileName;
    tempEl.click();
    window.URL.revokeObjectURL(url);
  }

  getTiffInvoiceURL(request) {
    const payload = {
      id: 'api.dashboard.Tiff.read',
      ver: '1.0',
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request
    };
    const url = environment.baseAPI + this.apiConfig.API.convertToTiff;
    return this.http
      .post(url, payload, {})
      .pipe(catchError(this.handleError('get Tiff URL', null)));
  }

  getMasterData() {
    const url = environment.baseAPI + this.apiConfig.API.getMaster;
    return this.http
      .get(url)
      .pipe(catchError(this.handleError('getMasterData', null)));
  }

  getConfidence() {
    return this.getUserSettings('CONFIDENCE_THRESHOLD')
  }

  decryptPayload(encryptedPayload) {
    let decoded = window.atob(encryptedPayload);
    return decoded;
  }

  getOrgAndDocType() {
    let UPLOAD_DETAILS = {
      ORGTYPE_OPTIONS: this.getUserSettings('ORGTYPE_OPTIONS'),
      DOCTYPE_OPTIONS: this.getUserSettings('DOCTYPE_OPTIONS')
    }
    return UPLOAD_DETAILS;
  }

  getOrganizationConfiguration() {
    const url = environment.baseAPI + this.apiConfig.API.getOrganizationConfiguration;
    return this.http
      .get(url)
      .pipe(catchError(this.handleError('getOrganizationConfiguration', null)));
  }

  getVendorLogo(url) {
    const dataURL =
      environment.baseAPI + this.apiConfig.API.getVendorLogo + '?url=' + url;
    return this.http
      .get(dataURL)
      .pipe(catchError(this.handleError('getVendorLogo', null)));
  }

  getXMLMapping(mapId) {
    const dataURL =
      environment.baseAPI + this.apiConfig.API.getXMLMapping + mapId;
    return this.http
      .get(dataURL)
      .pipe(catchError(this.handleError('getXMLMapping', null)));
  }

  // check document status 
  checkStatus(documentId) {
    const dataURL =
      environment.baseAPI + this.apiConfig.API.checkStatus + documentId;
    return this.http
      .get(dataURL)
      .pipe(catchError(this.handleError('checkStatus', null)));
  }

  updateXMLMapping(request) {
    const payload = {
      id: 'api.vendor-xml-map.update',
      ver: '1.0',
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request
    };
    const url = environment.baseAPI + this.apiConfig.API.updateXMLMapping;
    return this.http
      .post(url, payload, {})
      .pipe(catchError(this.handleError('updateXMLMapping', null)));
  }

  allowView(element) {
    // if (localStorage.getItem('role') === 'approver' && element.approverEmail == localStorage.getItem('emailId')) {
    //   return !["RPA_PENDING_APPROVAL"].includes(element.status);
    // }
    // else {
    //   return !['READY_FOR_EXTRACTION', 'REVIEW'].includes(element.status);
    // }

    //<--removing apporverEmail - bcp - new requirement-->
    if (localStorage.getItem('role') === 'approver' && element.approvalStatus && (element.approvalStatus == 'Hold' || element.approvalStatus == 'Pending')) {
      return !["RPA_PENDING_APPROVAL"].includes(element.status);
    }
    else {
      return !['READY_FOR_EXTRACTION', 'REVIEW'].includes(element.status);
    }
  }

  allowReviewView(element) {
    return (
      (this.appConfig.documentStatus.indexOf(element.status) >=
        this.appConfig.documentStatus.indexOf('EXTRACTION_DONE') &&
        element.status !== 'REVIEW' &&  element.status !== 'REASSIGN') ||
      (element.stage && element.stage === 'RPA')
    );
  }

  addQueryForResult(request) {
    const payload = {
      id: 'api.result.query.add',
      ver: '1.0',
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request
    };
    const url = environment.baseAPI + this.apiConfig.API.addQueryForResult;
    return this.http.post(url, payload, {}).pipe(catchError(this.handleError('addQueryForResult', null)));
  }

  deleteQueryForResult(documentId, queryId) {
    const url = environment.baseAPI + this.apiConfig.API.deleteQueryForResult + documentId + '/' + queryId;
    return this.http.delete(url).pipe(catchError(this.handleError('deleteQueryForResult', null)));
  }

  getUserSettings(key: string) {
    let value: any;
    let userSettings = localStorage.getItem('UserSettings');
    let settings = JSON.parse(this.decryptPayload(userSettings.substring(1, userSettings.length - 1)));

    switch (key) {
      case 'ALERT_TIMEOUT':
        value = Number(settings.ALERT_TIMEOUT);
        break;
      case 'DOWNLOAD_PATH':
        value = settings.DOWNLOAD_PATH;
        break;
      case 'CONFIDENCE_THRESHOLD':
        value = settings.CONFIDENCE_THRESHOLD;
        break;
      case 'ORGTYPE_OPTIONS':
        value = settings.ORGTYPE_OPTIONS;
        break;
      case 'DOCTYPE_OPTIONS':
        value = settings.DOCTYPE_OPTIONS;
        break;
      default:
        break;
    }
    return value;
  }

  //<=========================Reviewer Methods START===================================>

  getTotalDocsReviewedByReviewer() {
    const url = environment.baseAPI + this.apiConfig.API.getTotalDocsReviewedByReviewer + localStorage.getItem('userId');
    return this.http.get(url).pipe(catchError(this.handleError('getTotalDocsReviewedByReviewer', null)));
  }

  setResponseMessageForReviewer(forState) {
    switch (forState) {
      case 'NODATA':
        this.reviewerBody.content_msg = "No Documents to REVIEW";
        this.reviewerBody.action = "REFRESH";
        this.reviewerBody.RefreshMessage = "Fetching Docs. Please wait..";
        break;
      case 'AFTER_REFRESH':
        this.reviewerBody.content_msg = "New Doc Found.Redirecting to Home screen.";
        this.reviewerBody.action = "CANCEL";
        this.reviewerBody.RefreshMessage = "closing dialog..";
        break;
      case 'UNDER_REVIEW':
        this.reviewerBody.content_msg = "Document is already UNDER REVIEW";
        this.reviewerBody.action = "CANCEL";
        this.reviewerBody.RefreshMessage = "closing dialog..";
        break;
      case 'REVIEW_COMPLETED':
        this.reviewerBody.content_msg = "Document has already been marked as REVIEW COMPLETED.";
        this.reviewerBody.action = "CANCEL";
        this.reviewerBody.RefreshMessage = "closing dialog..";
        break;
      case 'PAUSE':
        this.reviewerBody.content_msg = "Review Process Paused";
        this.reviewerBody.action = "RESUME";
        this.reviewerBody.RefreshMessage = "Resuming..";
        break;
      default:
        break;
    }
    this.reviewerBody = JSON.parse(JSON.stringify(this.reviewerBody));
  }

  //<=========================Reviewer Methods END===================================>
}
