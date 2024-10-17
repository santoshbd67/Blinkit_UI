import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { APIConfig } from 'src/app/config/api-config';
import { environment } from 'src/environments/environment';
import * as uuid from 'uuid';
import { Subject, BehaviorSubject } from 'rxjs';

export interface ValidateResult {
  message: string,
  score: number,
  validate_result: string
}

@Injectable({
  providedIn: 'root'
})
export class ExtractionAssistService {

  constructor(private http: HttpClient) { }

  apiConfig: any = APIConfig;
  ruleCreationData = { vendorName: '', identifiertext: '' };
  pathFinderData = {
    VendorId: '',
    SelectedField: '',
    FormData: {}
  }

  masterDataValidateResult: BehaviorSubject<ValidateResult> = new BehaviorSubject<ValidateResult>({ message: '', score: 0, validate_result: '' });

  masterDataValidateResultMessage = this.masterDataValidateResult.asObservable();

  fileSelectionData = new BehaviorSubject<{ format: string, fileSelection }>({ format: '', fileSelection: [] });
  fileSelectionDataObserver = this.fileSelectionData.asObservable();

  //Generate Timestamp
  generateTimestamp() {
    return Math.round(new Date().getTime() / 1000);
  }

  getSuggestions(documentId) {

    let docUrl = environment.baseAPI + this.apiConfig.API.getSuggestions;

    let payload = {
      id: "api.extraction.suggestions",
      ver: "2.0",
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: {
        documentId: documentId
      }
    };

    return this.http.post<any>(docUrl, payload, {});
  }

  getUpdatedDocumnetFormats(documentIds) {
    let docUrl = environment.baseAPI + this.apiConfig.API.getUpdatedFormats;

    let payload = {
      id: "api.extraction.refreshedFormats",
      ver: "2.0",
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: {
        list_document_id: documentIds
      }
    };

    return this.http.post<any>(docUrl, payload, {});
  }

  updateUnknownDocuments(documentIds, updatedValues) {
    let docUrl = environment.baseAPI + this.apiConfig.API.updateManyDocument;

    let payload = {
      id: "api.document.updateMany",
      ver: "2.0",
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: {
        documentIds: documentIds,
        vendorIds: updatedValues
      }
    };

    return this.http.post<any>(docUrl, payload, {});
  }

  updateDocsForSelectedVendor(obj) {
    let docUrl = environment.baseAPI + this.apiConfig.API.setExtAssistFlag;

    let payload = {
      id: "api.document.setExtAssistFlag",
      ver: "2.0",
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: {
        emailId: localStorage.getItem('emailId'),
        filter: { status: "REVIEW_COMPLETED", vendorId: obj.format, selectedFieldIds: obj.selectedFieldIds, action: obj.action },
        token: localStorage.getItem('token')
      }
    };

    return this.http.post<any>(docUrl, payload, {});
  }

  deleteTemplate(obj) {
    let docUrl = environment.baseAPI + this.apiConfig.API.deleteTemplate;

    let payload = {
      id: "api.document.deleteTemplate",
      ver: "2.0",
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: obj
    };

    return this.http.post<any>(docUrl, payload, {});
  }

  deleteVendorMasterdata(obj) {
    let docUrl = environment.baseAPI + this.apiConfig.API.deleteVendorMasterdata;

    let payload = {
      id: "api.document.deleteVendorMasterdata",
      ver: "2.0",
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: { vendor_name: obj.VENDOR_NAME, vendor_id: obj.VENDOR_ID }
    };

    return this.http.post<any>(docUrl, payload, {});
  }

  updateVendorIds(obj) {
    let docUrl = environment.baseAPI + this.apiConfig.API.updateVendorIds;

    let payload = {
      id: "api.extraction.updateVendorIds",
      ver: "2.0",
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: { vendorId: obj }
    };

    return this.http.post<any>(docUrl, payload, {});
  }

  getAllFormatsAndCorrections(selectedTab) {
    let docUrl = environment.baseAPI + this.apiConfig.API.getAllFormatsAndCorrections;

    let payload = {
      id: "api.document.getAllFormatsAndCorrections",
      ver: "2.0",
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: {
        emailId: localStorage.getItem('emailId'),
        filter: { status: "REVIEW_COMPLETED" },
        selectedTab: selectedTab ? selectedTab : 0,
        token: localStorage.getItem('token')
      }
    };

    return this.http.post<any>(docUrl, payload, {});
  }

  createMasterData(dataObj) {
    let docUrl = environment.baseAPI + this.apiConfig.API.createMasterData;

    let payload = {
      id: "api.extraction.createmasterdata",
      ver: "2.0",
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: dataObj
    };

    return this.http.post<any>(docUrl, payload, {});
  }

  validateMasterData(dataObj) {
    let docUrl = environment.baseAPI + this.apiConfig.API.validateMasterData;

    let payload = {
      id: "api.extraction.validatemasterdata",
      ver: "2.0",
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: dataObj
    };

    return this.http.post<any>(docUrl, payload, {});
  }

  getRuleMasterData() {
    let ruleMasterData = [
      // { fieldId: 'Vendor Name', fieldValue: '', confidence: 75 },
      { fieldId: 'Name', fieldValue: '', confidence: 75 }, //TODO renamed VendorName to Name on 29-09-2022
    ]
    return ruleMasterData
  }

  getMastersSuggetion() {
    return [
      {
        "fieldId": "vendorName",
        "fieldValue": "PREMIUM",
        "confidence": 91.16,
        "suspiciousSymbol": "0000000",
        "boundingBox": {
          "left": 151,
          "right": 331,
          "top": 145,
          "bottom": 174
        },
        "pageNumber": "1",
        "OCRConfidence": 100,
        "vendorMasterdata": 0
      }
    ]
  }

  getTemplates(reqObj) {

    let docUrl = environment.baseAPI + this.apiConfig.API.getTemplates;

    let payload = {
      id: "api.extraction.pathfinder.getTemplates",
      ver: "2.0",
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: reqObj
    };

    return this.http.post<any>(docUrl, payload, {});
  }

  getMLIdentifiersList() {
    let docUrl = environment.baseAPI + this.apiConfig.API.getMLIdentifiers;

    let payload = {
      id: "api.extraction.formatIdentifier.getMLIdentifiers",
      ver: "2.0",
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: {}
    };

    return this.http.post<any>(docUrl, payload, {});
  }

  validateTemplate(reqObj) {

    let docUrl = environment.baseAPI + this.apiConfig.API.validateTemplate;

    let payload = {
      id: "api.extraction.pathfinder.validateTemplate",
      ver: "2.0",
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: reqObj
    };

    return this.http.post<any>(docUrl, payload, {});
  }

  createTemplate(reqObj) {

    let docUrl = environment.baseAPI + this.apiConfig.API.createTemplate;

    let payload = {
      id: "api.extraction.pathfinder.createTemplate",
      ver: "2.0",
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: reqObj
    };

    return this.http.post<any>(docUrl, payload, {});
  }

  raiseTicketSendEmail(data) {
    let docUrl = environment.baseAPI + this.apiConfig.API.raiseTicketSendEmail;

    let payload = {
      id: "api.user.raiseTicketSendEmail",
      ver: "1.0",
      ts: this.generateTimestamp(),
      params: { msgid: uuid.v4() },
      userDetails: data
    };

    return this.http.post<any>(docUrl, payload, {});
  }

  getDocumentsForTesting(reqObj) {
    let docUrl = environment.baseAPI + this.apiConfig.API.getTestingDocs;

    let payload = {
      id: "api.extraction.pathfinder.getTestingDocs",
      ver: "2.0",
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: reqObj
    };

    return this.http.post<any>(docUrl, payload, {});
  }

  testTemplates(reqObj) {

    let docUrl = environment.baseAPI + this.apiConfig.API.testTemplates;

    let payload = {
      id: "api.extraction.pathfinder.testTemplates",
      ver: "2.0",
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: reqObj
    };

    return this.http.post<any>(docUrl, payload, {});
  }

  getOCRLines(reqObj) {

    let docUrl = environment.baseAPI + this.apiConfig.API.getOCRLines;

    let payload = {
      id: "api.extraction.pathfinder.getOCRLines",
      ver: "2.0",
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: reqObj
    };

    return this.http.post<any>(docUrl, payload, {});
  }

  getDataForRulesCreatedTab() {

    let docUrl = environment.baseAPI + this.apiConfig.API.getRulesData;

    let payload = {
      id: "api.extraction.pathfinder.getRulesData",
      ver: "2.0",
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: {}
    };

    return this.http.post<any>(docUrl, payload, {});

    // let data = {
    //   "status": "Success",
    //   "responseCode": 200,
    //   "templates": [
    //     {
    //       "vendor_name": "MEDIAEDGE CIA INDIA PRIVATE LIMITED",
    //       "vendor_id": "FLIPKART_006",
    //       "field_name": "totalAmount",
    //       "default_value": "Not Applicable",
    //       "field_type": "SINGLE_TOKEN",
    //       "template_type": "anchor_label",
    //       "horizontal_anchor": "Total Amount Payable",
    //       "vertical_anchor": "Total",
    //       "field_shape": "dddddd.dd",
    //       "horizontal_anchor_location": "LEFT",
    //       "vertical_anchor_location": "TOP"
    //     },
    //     {
    //       "vendor_name": "ATLAS FORMEN ",
    //       "vendor_id": "KGS_3",
    //       "field_name": "Season",
    //       "default_value": " ",
    //       "field_type": "MULTI_TOKEN",
    //       "template_type": "bounding_box_identifier",
    //       "top": "CATEGORY",
    //       "include_top": "NO",
    //       "bottom": "SIZES",
    //       "include_bottom": "YES",
    //       "left": "SEASON",
    //       "right": "VERSION",
    //       "page_identifier": "Not Applicable"
    //     },
    //     {
    //       "vendor_name": "ATLAS FORMEN ",
    //       "vendor_id": "KGS_3",
    //       "field_name": "ItemCode",
    //       "default_value": " ",
    //       "field_type": "SINGLE_TOKEN",
    //       "template_type": "single_label",
    //       "label": "STYLE #",
    //       "label_position": "Left",
    //       "field_shape": "xxddd",
    //       "field_location": "NONE"
    //     },
    //     {
    //       "vendor_name": "ATLAS FORMEN ",
    //       "vendor_id": "KGS_3",
    //       "field_name": "ItemName",
    //       "default_value": " ",
    //       "field_type": "MULTI_TOKEN",
    //       "template_type": "bounding_box_identifier",
    //       "top": "STYLE#",
    //       "include_top": "NO",
    //       "bottom": "CATEGORY",
    //       "include_bottom": "NO",
    //       "left": "NAME",
    //       "right": "SEASON",
    //       "page_identifier": "Not Applicable"
    //     },
    //     {
    //       "vendor_name": "DR.LEONARD'S",
    //       "vendor_id": "KGS_0003",
    //       "field_name": "ItemCode",
    //       "default_value": " ",
    //       "field_type": "MULTI_TOKEN",
    //       "template_type": "bounding_box_identifier",
    //       "top": "PAGE_BOUNDARY",
    //       "include_top": "NO",
    //       "bottom": "ARTICLE NAME",
    //       "include_bottom": "NO",
    //       "left": "ARTICLE CODE",
    //       "right": "DESCRIPTION",
    //       "page_identifier": "Not Applicable"
    //     }
    //   ],

    //   "message": "Success"

    // }

    //return data;
  }

  setfileSelectionData(vendorId, fileSelectionData) {
    let data = { format: '', fileSelection: [] }
    data.format = vendorId
    data.fileSelection = fileSelectionData
    this.fileSelectionData.next(data);
  }
}
