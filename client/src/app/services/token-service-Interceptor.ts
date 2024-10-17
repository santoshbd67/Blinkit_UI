import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { environment } from './../../environments/environment';
import { APIConfig } from './../config/api-config';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Injectable()
export class TokenInterceptorService implements HttpInterceptor {
    apiConfig = APIConfig;
    constructor(private dataService: DataService, private auth: AuthService, private router: Router, private modelService: NgbModal) { }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        if (!req.url.includes('/user/login') &&
            !req.url.includes('/user/signup') &&
            !req.url.includes('/user/validateUser') &&
            !req.url.includes('/user/resetPassword') &&
            !req.url.includes('/user/forgotPassword')) {
            let userId = localStorage.getItem("userId");
            // const duplicate = req.clone({ headers: req.headers.set('userId', userId) });
            let token = localStorage.getItem('token');
            const duplicate = req.clone({
                headers: req.headers.set('userId', userId).set('token', token ? token : null)
            });
            // return next.handle(duplicate);

            return next.handle(duplicate)
                .pipe(map(res => {
                    return res;
                }),
                    catchError((error: any) => {
                        console.log("THERE IS AN ERROR FOR BELOW API:- " + this.dataService.generateTimestamp());
                        console.log(req.url);
                        let errorMsg = '';
                        if (error && error.error instanceof ErrorEvent) {
                            console.log('This is client side error');
                            errorMsg = `Error: ${error.error.message}`;
                        } else {
                            console.log('This is server side error');
                            errorMsg = `Error Code: ${error.status},  Message: ${error.message}`;
                        }
                        if (error && error.status == 404 && error.error && error.error.params && error.error.params.reason == 'session expired') {
                            errorMsg = `Error Code: ${error.status},  Message: ${error.error.params.reason}`;
                            this.dataService.showInfo('please login again', 'session expired');
                            localStorage.clear();
                            this.modelService.dismissAll();

                            let Url = environment.baseAPI + this.apiConfig.API.getUserSettings;
                            fetch(Url)
                                .then(response => response.json())
                                .then(json => {
                                    this.router.navigate(['/login']);
                                    this.auth.setUserAccessbilitySettings(json.result.UserSettings)
                                })
                        }
                        console.log(errorMsg);
                        return throwError(error);
                    })
                )
        }
        else {
            return next.handle(req).pipe(map(res => { return res; }), catchError((error: any) => {
                console.log("THERE IS AN ERROR FOR BELOW API:- " + this.dataService.generateTimestamp());
                console.log("FROM ELSE BLOCK");
                console.log(req.url);
                console.log(error);
                return throwError(error);
            }))
        }
    }
}