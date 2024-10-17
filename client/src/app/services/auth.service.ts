import { Injectable } from "@angular/core";
import { environment } from "src/environments/environment";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { catchError, map, tap } from "rxjs/operators";
import { of, BehaviorSubject } from "rxjs";
import { APIConfig } from "../config/api-config";
import { AppConfig } from '../config/app-config';
import { ToastrManager } from "ng6-toastr-notifications";
import * as moment from "moment";
import * as uuid from "uuid";

import * as CryptoJS from 'crypto-js';

@Injectable({
    providedIn: "root"
})
export class AuthService {
    constructor(private http: HttpClient, public toastr: ToastrManager) { }

    apiConfig: any = APIConfig;
    appConfig: any = AppConfig;
    userDetails = new BehaviorSubject<any>(null);
    userObserver = this.userDetails.asObservable();

    // secretPassphrase = CryptoJS.enc.Utf16.parse(this.apiConfig.SECRET_KEY);

    // encrypt(plainText: any) {
    //     return CryptoJS.AES.encrypt(plainText, this.secretPassphrase, { mode: CryptoJS.mode.ECB }).toString();
    // }

    // decrypt(cipherText: any) {
    //     let plainText = CryptoJS.AES.decrypt(cipherText, this.secretPassphrase, { mode: CryptoJS.mode.ECB }).toString(CryptoJS.enc.Utf8);
    //     return plainText;
    // }

    userLogin(data) {
        let docUrl = environment.baseAPI + this.apiConfig.API.userLogin;

        let payload = {
            id: "api.user.login",
            ver: "1.0",
            ts: this.generateTimestamp(),
            params: {
                msgid: uuid.v4()
            },
            request: this.encryptPayload(JSON.stringify(data))
        };

        return this.http.post<any>(docUrl, payload, {});
    }

    userSignUp(data) {
        let docUrl = environment.baseAPI + this.apiConfig.API.userSignUp;

        let payload = {
            id: "api.user.signup",
            ver: "1.0",
            ts: this.generateTimestamp(),
            params: { msgid: uuid.v4() },
            userDetails: data
        };

        return this.http.post<any>(docUrl, payload, {});
    }

    getRoleId(rolesData, roleName) {
        let obj;
        if (rolesData) {
            obj = rolesData.filter((roleObj) => {
                if (roleObj.role === roleName) {
                    return roleObj._id;
                }
            })
            if (obj && obj.length > 0) {
                return obj[0]._id;
            } else {
                return roleName;
            }
        }
        else {
            return roleName;
        }
    }

    getRoleName(rolesData, roleId) {
        let obj;
        if (rolesData) {
            obj = rolesData.filter((roleObj) => {
                if (roleObj._id === roleId) {
                    return roleObj.role;
                }
            })
            if (obj && obj.length > 0) {
                return obj[0].role;
            } else {
                return roleId;
            }
        }
        else {
            return roleId;
        }
    }

    getPayload(formData, userCreatedBy) {
        let payload = {
            userName: formData.userName.toLowerCase(),
            emailId: formData.emailId.toLowerCase(),
            password: CryptoJS.SHA256(formData.password).toString(),
            role: formData.role && formData.role != ' ' ? formData.role : 'viewer',
            userCreatedBy: userCreatedBy,
            documentType: formData.documentType ? formData.documentType : undefined
        }
        if (userCreatedBy == 'organization') {
            payload["token"] = localStorage.getItem('token');
        }
        let encryptedPayload = this.encryptPayload(JSON.stringify(payload));
        return encryptedPayload;
    }

    encryptPayload(payload) {
        let encoded = window.btoa(payload);
        return encoded;
    }

    decryptPayload(encryptedPayload) {
        let decoded = window.atob(encryptedPayload);
        return decoded;
    }

    sendEmail(data) {
        let docUrl = environment.baseAPI + this.apiConfig.API.sendEmail;

        let payload = {
            id: "api.user.signup",
            ver: "1.0",
            ts: this.generateTimestamp(),
            params: { msgid: uuid.v4() },
            data: data
        };

        return this.http.post<any>(docUrl, payload, {});
    }

    verifyToken() {
        let resObj = { isValid: false, RoutesAccess: [] };
        return this.handleVerifyToken().toPromise().then(res => {

            if (res && res.responseCode == 'OK' && res.result) {
                localStorage.setItem('emailId', res.result.emailId);
                localStorage.setItem('lastLogin', res.result.lastLogin);
                localStorage.setItem('token', res.result.token);
                localStorage.setItem('userId', res.result.userId);
                localStorage.setItem('role', res.result.role);
                resObj.isValid = true;
                resObj.RoutesAccess = res.result.RoutesAccess;

                this.setUserAccessbilitySettings(res.result.UserSettings);
                this.setUserDetails(res.result);

                return resObj;
            }
            else {
                return resObj;
            }
        }).catch(err => {
            return resObj;
        })
    }

    setUserAccessbilitySettings(UserSettings) {
        localStorage.setItem("UserSettings", JSON.stringify(UserSettings));
    }

    getAllRoles() {
        let docUrl = environment.baseAPI + this.apiConfig.API.getRoles;

        let payload = {
            id: "api.role.getAll",
            ver: "1.0",
            ts: this.generateTimestamp(),
            params: { msgid: uuid.v4() },
            request: {
                role: "Admin",
                token: localStorage.getItem('token')
            }
        };

        return this.http.post<any>(docUrl, payload, {});
    }

    userLogout() {
        let docUrl = environment.baseAPI + this.apiConfig.API.userLogout;
        let payload = {
            id: "api.user.login",
            ver: "1.0",
            ts: this.generateTimestamp(),
            params: {
                msgid: uuid.v4()
            },
            request: {
                emailId: localStorage.getItem('emailId'),
                token: localStorage.getItem('token')
            }
        }
        return this.http
            .post(docUrl, payload, {})
            .pipe(catchError(this.handleError("userLogout", null)));
    }

    handleVerifyToken() {
        let docUrl = environment.baseAPI + this.apiConfig.API.verifyToken;
        const token = localStorage.getItem('token');
        let payload = {
            id: "api.user.reLogin",
            ver: "1.0",
            ts: this.generateTimestamp(),
            params: {
                msgid: uuid.v4()
            },
            request:
                { token }
        }

        return this.http
            .post(docUrl, payload, {})
            .pipe(catchError(this.handleError("userReLogin", null)));
    }

    changePassword(data) {
        if (data && data.oldPassword && data.newPassword && data.confirmPassword) {
            let docUrl = environment.baseAPI + this.apiConfig.API.changePassword;

            let details = {
                token: localStorage.getItem('token'),
                user: {
                    emailId: localStorage.getItem('emailId'),
                    oldPassword: CryptoJS.SHA256(data.oldPassword).toString(),
                    password: CryptoJS.SHA256(data.newPassword).toString()
                }
            }
            let payload = {
                id: "api.user.password.change",
                ver: "1.0",
                ts: this.generateTimestamp(),
                params: {
                    msgid: uuid.v4()
                },
                request: this.encryptPayload(JSON.stringify(details))
            }
            return this.http
                .post(docUrl, payload, {})
                .pipe(catchError(this.handleError("userLogout", null)));
        }
    }

    getUserDetails() {
        let email = localStorage.getItem('emailId');

        if (email) {
            let docUrl = environment.baseAPI + this.apiConfig.API.getUserDetails + '?emailId=' + email;
            return this.http
                .get(docUrl, {})
                .pipe(catchError(this.handleError("userLogout", null)));
        }
    }

    getUserList(data) {
        let docUrl = environment.baseAPI + this.apiConfig.API.getUserList;
        data['emailId'] = localStorage.getItem("emailId");

        let payload = {
            id: "api.user.list",
            ver: "1.0",
            ts: this.generateTimestamp(),
            params: {
                msgid: uuid.v4()
            },
            request: data
        };

        return this.http
            .post(docUrl, payload, {})
            .pipe(catchError(this.handleError("getUserList", null)));
    }

    getAllUsersMetaData() {
        let docUrl = environment.baseAPI + this.apiConfig.API.fetchAllUsers;
        let userDetails: any = {
            emailId: localStorage.getItem('emailId'),
            role: localStorage.getItem('role'),
            token: localStorage.getItem('token')
        }
        userDetails = this.encryptPayload(JSON.stringify(userDetails));

        let payload = {
            id: "api.users.metadata",
            ver: "1.0",
            ts: this.generateTimestamp(),
            params: {
                msgid: uuid.v4()
            },
            userDetails: userDetails
        }

        return this.http.post<any>(docUrl, payload, {});
    }

    verifyUser(token) {
        let docUrl = environment.baseAPI + this.apiConfig.API.verifyUser + '?verificationToken=' + token;
        return this.http.get<any>(docUrl, {});
    }

    checkDataExists(userId) {
        let docUrl = environment.baseAPI + this.apiConfig.API.checkData + '?userId=' + userId;
        return this.http.get<any>(docUrl, {});
    }

    forgotPassword(data) {

        if (data && data.emailId) {
            let docUrl = environment.baseAPI + this.apiConfig.API.forgotPassword;
            let payload = {
                id: "api.user.password.forgot",
                ver: "1.0",
                ts: this.generateTimestamp(),
                params: {
                    msgid: uuid.v4()
                },
                userDetails: data

            }
            return this.http.post<any>(docUrl, payload, {});

        }
    }

    resetPassword(data) {
        if (data && data.password) {
            let docUrl = environment.baseAPI + this.apiConfig.API.resetPassword;
            let payload = {
                id: "api.user.password.reset",
                ver: "1.0",
                ts: this.generateTimestamp(),
                params: {
                    msgid: uuid.v4()
                },
                request: data

            }
            return this.http.post<any>(docUrl, payload, {});
            // .pipe(catchError(this.handleError("userLogout", null)));
        }
    }

    updateUserDetails(data) {
        let docUrl = environment.baseAPI + this.apiConfig.API.updateUser;

        let payload = {
            id: "api.user.update",
            ver: "1.0",
            ts: this.generateTimestamp(),
            params: {
                msgid: uuid.v4()
            },
            request: this.encryptPayload(JSON.stringify(data))
        };

        return this.http
            .post(docUrl, payload, {})
            .pipe(catchError(this.handleError("updateUserDetails", null)));
    }

    isDomainBlackListed(domain: string) {
        let BLACKLISTED_DOMAINS = this.getUserSettings('BLACKLISTED_DOMAINS');
        if (BLACKLISTED_DOMAINS) {
            if (domain && BLACKLISTED_DOMAINS.includes(domain)) {
                return "YES";
            }
            else {
                return "NO";
            }
        }
        else {
            return "NO";
        }
    }

    getMaximumAllowedPages() {
        return this.getUserSettings('NO_OF_ALLOWED_PAGES');
    }

    getMaximumFileSizeLimit() {
        return this.getUserSettings('MAX_FILE_SIZE_ALLOWED');
    }

    getConsumptionVisibility() {
        return this.getUserSettings('DAILY_CONSUMPTION_LIMIT_VISIBILITY');
    }

    getFAQVisibility() {
        return this.getUserSettings('FAQ_PAGE_VISIBILITY');
    }

    getReasonOptions() {
        let Url = environment.baseAPI + this.apiConfig.API.getReasonOptions;
        let payload = {
            id: "api.user.ReasonOptions",
            ver: "1.0",
            ts: this.generateTimestamp(),
            params: {
                msgid: uuid.v4()
            },
            request: {}
        };
        return this.http.get<any>(Url, payload);
    }
    getReassignReasons() {
        let Url = environment.baseAPI + this.apiConfig.API.getAssignResons;
        let payload = {
            id: "api.user.ReassignReasonOptions",
            ver: "1.0",
            ts: this.generateTimestamp(),
            params: {
                msgid: uuid.v4()
            },
            request: {}
        };
        return this.http.get<any>(Url, payload);
    }

    getAdminDetails() {
        let ADMIN_DETAILS = {
            EmailId: '',
            MailToId: ''
        }
        ADMIN_DETAILS.EmailId = this.getUserSettings('ADMIN_EMAIL_ID');
        ADMIN_DETAILS.MailToId = `mailto:${ADMIN_DETAILS.EmailId}`;

        return ADMIN_DETAILS;
    }

    deleteUser(data) {
        let docUrl = environment.baseAPI + this.apiConfig.API.deleteUser;

        let payload = {
            id: "api.user.delete",
            ver: "1.0",
            ts: this.generateTimestamp(),
            params: {
                msgid: uuid.v4()
            },
            request: {
                token: localStorage.getItem('token'),
                user: {
                    //emailId: this.encrypt(data.emailId),
                    emailId: data.emailId,
                    userId: data.userId
                }
            }
        };

        return this.http
            .post(docUrl, payload, {})
            .pipe(catchError(this.handleError("deleteUser", null)));
    }

    handleUser(data, reqFor: string) {
        let docUrl = environment.baseAPI + this.apiConfig.API.manageUser;

        let payload = {
            id: "api.user.manageUser",
            ver: "1.0",
            ts: this.generateTimestamp(),
            params: {
                msgid: uuid.v4()
            },
            request: {
                reqFor: reqFor,
                user: {
                    //emailId: this.encrypt(data.emailId),
                    emailId: data.emailId,
                    userId: data.userId
                }
            }
        };

        return this.http
            .post(docUrl, payload, {})
            .pipe(catchError(this.handleError("manageUser", null)));
    }

    updateUserVendorMapping(data) {
        let docUrl = environment.baseAPI + this.apiConfig.API.updateUserVendorMapping;

        let payload = {
            id: "api.user.map",
            ver: "1.0",
            ts: this.generateTimestamp(),
            params: {
                msgid: uuid.v4()
            },
            request: {
                token: localStorage.getItem('token'),
                map: data
            }
        };

        return this.http
            .post(docUrl, payload, {})
            .pipe(catchError(this.handleError("updateUserVendorMapping", null)));
    }

    //New User Vendor Mapping test
    getUserVendorMap(userId) {
        let docUrl = environment.baseAPI + this.apiConfig.API.getUserVendorMap + '?userId=' + userId;
        return this.http
            .get(docUrl, {})
            .pipe(catchError(this.handleError("updateUserVendorMapping", null)));
    }

    //New add user vendor map
    addUserVendorMap(map) {
        let payload = {
            id: "api.user.map.add",
            ver: "1.0",
            ts: this.generateTimestamp(),
            params: {
                msgid: uuid.v4()
            },
            request: {
                token: localStorage.getItem('token'),
                map: map
            }
        };

        let docUrl = environment.baseAPI + this.apiConfig.API.addUserVendorMap;

        return this.http
            .post(docUrl, payload, {})
            .pipe(catchError(this.handleError("addUserVendorMap", null)));
    }

    deleteUserVendorMap(map) {
        let payload = {
            id: "api.user.map.delete",
            ver: "1.0",
            ts: this.generateTimestamp(),
            params: {
                msgid: uuid.v4()
            },
            request: {
                token: localStorage.getItem('token'),
                filter: map
            }
        };

        let docUrl = environment.baseAPI + this.apiConfig.API.deleteUserVendorMap;

        return this.http
            .post(docUrl, payload, {})
            .pipe(catchError(this.handleError("deleteUserVendorMap", null)));
    }

    setUserDetails(userDetails) {
        this.userDetails.next(userDetails);
    }

    //Handle errors
    handleError(operation = "operation", result?) {
        return (error: any) => {
            return of(result);
        };
    }
    //Generate Timestamp
    generateTimestamp() {
        return Math.round(new Date().getTime() / 1000);
    }

    downloadUsersData(data, filename = 'data') {
        let csvData = this.ConvertToCSV(data, ['Username', 'EmailId',/*'AgeGroup',*/ 'Company', 'Designation', 'Phone', 'Country', 'State', 'ZIPCode', 'CreatedAt', 'ReccentActivityAt', 'TotalFiles', 'UserStatus']);
        let blob = new Blob(['\ufeff' + csvData], { type: 'text/csv;charset=utf-8;' });
        let dwldLink = document.createElement("a");
        let url = URL.createObjectURL(blob);
        let isSafariBrowser = navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1;
        if (isSafariBrowser) {  //if Safari open in new window to save file with random filename.
            dwldLink.setAttribute("target", "_blank");
        }
        dwldLink.setAttribute("href", url);
        dwldLink.setAttribute("download", filename + ".csv");
        dwldLink.style.visibility = "hidden";
        document.body.appendChild(dwldLink);
        dwldLink.click();
        document.body.removeChild(dwldLink);
    }

    ConvertToCSV(objArray, headerList) {

        let array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
        let str = '';
        let row = 'S.No,';

        for (let index in headerList) {
            row += headerList[index] + ',';
        }
        row = row.slice(0, -1);
        str += row + '\r\n';
        for (let i = 0; i < array.length; i++) {
            let line = (i + 1) + '';
            for (let index in headerList) {
                let head = headerList[index];

                // line += ',' + array[i][head];
                line += ',' + this.strRep(array[i][head]);
            }
            str += line + '\r\n';
        }
        return str;
    }

    strRep(data) {
        if (typeof data == "string") {
            let newData = data.replace(/,/g, " ");
            return newData;
        }
        else if (typeof data == "undefined") {
            return "-";
        }
        else if (typeof data == "number") {
            return data.toString();
        }
        else {
            return data;
        }
    }

    getUserSettings(key: string) {
        let value: any;
        let userSettings = localStorage.getItem('UserSettings');
        if (userSettings) {
            let settings = JSON.parse(this.decryptPayload(userSettings.substring(1, userSettings.length - 1)));
            switch (key) {
                case 'ACTIONS_VISIBILITY':
                    value = Number(settings.ACTIONS_VISIBILITY)
                    break;
                case 'PROCESSING_VISIBILITY':
                    value = Number(settings.PROCESSING_VISIBILITY);
                    break;
                case 'DASHBOARD_VISIBILITY':
                    value = Number(settings.DASHBOARD_VISIBILITY)
                    break;
                case 'EXTRACTION_ASSIST_VISIBILITY':
                    value = Number(settings.EXTRACTION_ASSIST_VISIBILITY);
                    break;
                case 'SETTINGS_VISIBILITY':
                    value = Number(settings.SETTINGS_VISIBILITY);
                    break;
                case 'POINT_AND_SHOOT_VISIBILITY':
                    value = Number(settings.POINT_AND_SHOOT_VISIBILITY);
                    break;
                case 'BUZ_RULE_API_VISIBILITY':
                    value = Number(settings.BUZ_RULE_API_VISIBILITY);
                    break;
                case 'SIGNUP_PAGE_VISIBILITY':
                    value = Number(settings.SIGNUP_PAGE_VISIBILITY);
                    break;
                case 'FAQ_PAGE_VISIBILITY':
                    value = Number(settings.FAQ_PAGE_VISIBILITY);
                    break;
                case 'CARDVIEW_VISIBILITY':
                    value = Number(settings.CARDVIEW_VISIBILITY);
                    break;
                case 'TIPS_VISIBILITY':
                    value = Number(settings.TIPS_VISIBILITY);
                    break;
                case 'LINE_ITEMS_VISIBILITY':
                    value = Number(settings.LINE_ITEMS_VISIBILITY);
                    break;
                case 'DAILY_CONSUMPTION_LIMIT_VISIBILITY':
                    value = Number(settings.DAILY_CONSUMPTION_LIMIT_VISIBILITY);
                    break;
                case 'ADMIN_UPLOAD_VISIBILITY':
                    value = Number(settings.ADMIN_UPLOAD_VISIBILITY);
                    break;
                case 'TAPP_CHANGES_VISIBILITY':
                    value = settings.TAPP_CHANGES_VISIBILITY;
                    break;
                case 'REASSIGN_REASON_OPTIONS':
                    value = settings.REASSIGN_REASON_OPTIONS;
                    break;
                case 'SEARCH_AND_SELECT':
                    value = settings.SEARCH_AND_SELECT;
                    break;
                case 'DOCTYPES_VISIBILITY':
                    value = settings.DOCTYPES_VISIBILITY;
                    break;
                case 'LOGO_VISIBILITY':
                    value = settings.LOGO_VISIBILITY;
                    break;
                case 'UPLOAD_BUTTON_VISIBILITY':
                    value = settings.UPLOAD_BUTTON_VISIBILITY;
                    break;
                case 'STP_AND_ACE_VISIBILITY':
                    value = settings.STP_AND_ACE_VISIBILITY;
                    break;
                case 'PRIORITY_RANK_FILTER_VISIBILITY':
                    value = settings.PRIORITY_RANK_FILTER_VISIBILITY;
                    break;
                case 'REASSIGN_REASON_FILTER':
                    value = settings.REASSIGN_REASON_FILTER;
                    break;
                case 'UI_VIEW':
                    value = settings.UI_VIEW;
                    break;
                case 'CONSUMPTION_LIMIT':
                    value = settings.CONSUMPTION_LIMIT;
                    break;
                case 'DEFAULT_FUNCTIONALITY':
                    value = settings.DEFAULT_FUNCTIONALITY;
                    break;
                case 'AUTO_REFRESH_IN':
                    value = Number(settings.AUTO_REFRESH_IN);
                    break;
                case 'BLACKLISTED_DOMAINS':
                    value = settings.BLACKLISTED_DOMAINS;
                    break;
                case 'NO_OF_ALLOWED_PAGES':
                    value = settings.NO_OF_ALLOWED_PAGES;
                    break;
                case 'MAX_FILE_SIZE_ALLOWED':
                    value = settings.MAX_FILE_SIZE_ALLOWED;
                    break;
                case 'ADMIN_EMAIL_ID':
                    value = settings.ADMIN_EMAIL_ID;
                    break;
                case 'UNEXTRACTED_FIELDS_LIST':
                    value = settings.UNEXTRACTED_FIELDS_LIST;
                    break;
                case 'HOW_IT_WORKS_URL':
                    value = settings.HOW_IT_WORKS_URL;
                    break;
                case 'RAISE_TICKET_EMAIL':
                    value = settings.RAISE_TICKET_EMAIL;
                    break;
                case 'DEFAULT_EA_TIMEGAP':
                    value = settings.DEFAULT_EA_TIMEGAP;
                    break;
                case 'ALERT_DISSMISS_REVIEWER':
                    value = Number(settings.ALERT_DISSMISS_REVIEWER);
                    break;
                case 'ACTIVITY_TIME_REVIEWER':
                    value = Number(settings.ACTIVITY_TIME_REVIEWER);
                    break;
                case 'DOCUMENT_TYPES_LIST':
                    value = settings.DOCUMENT_TYPES_LIST;
                    break;
                case 'PRIORITY_RANKING_LIST':
                    value = settings.PRIORITY_RANKING_LIST;
                    break;
                case 'DOCTYPE_CHECK_FOR_ROLES':
                    value = settings.DOCTYPE_CHECK_FOR_ROLES;
                    break;
                case 'DOWNLOAD_ALL_THRESHOLD':
                    value = settings.DOWNLOAD_ALL_THRESHOLD;
                    break;
                case 'PROJECT_CONFIGURATIONS':
                    value = settings.PROJECT_CONFIGURATIONS;
                    break;
                case 'DSAHBOARD_FILTERS':
                    value = settings.DSAHBOARD_FILTERS;
                    break;
                case 'INITIAL_DOCS_EXTRACTED':
                    value = settings.INITIAL_DOCS_EXTRACTED;
                    break;
                case 'POSTINGTABINDASHBOARD':
                    value = settings.POSTINGTABINDASHBOARD;
                    break;
                case 'DASHBOARD_OPTIONS':
                    value = settings.DASHBOARD_OPTIONS;
                    break;
                case 'DASHBOARD_CAL_PREV_MONTH_VALUE':
                    value = settings.DASHBOARD_CAL_PREV_MONTH_VALUE;
                    break;
                case 'AUTO_REASSIGN_DOCUMENT':
                    value = settings.AUTO_REASSIGN_DOCUMENT;
                    break;
                case 'REASSIGN_BUTTON_VISIBILITY':
                    value = Number(settings.REASSIGN_BUTTON_VISIBILITY);
                    break;
                case 'DROPDOWN_VISIBILITY':
                    value = Number(settings.DROPDOWN_VISIBILITY);
                    break;
                default:
                    break;
            }
        }
        return value || 0;
    }
}