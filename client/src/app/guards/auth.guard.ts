import { DataService } from '../services/data.service';
import { Injectable } from '@angular/core';
import {
    CanActivate,
    Router,
    ActivatedRouteSnapshot,
    RouterStateSnapshot
} from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NavigationEnd } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { filter, map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})

export class AuthGuard implements CanActivate {
    constructor(private dataService: DataService, private router: Router, private auth: AuthService) { }
    canActivate(
        next: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<boolean> | Promise<boolean> | boolean {
        // let userRole = localStorage['emailId'];
        // let password = localStorage['lastLogin'];
        let token = localStorage.getItem('token');
        if (token) {
            // return true;
            return this.auth.verifyToken().then(res => {
                if (res.isValid) {

                    let activeRoute = state.url;
                    if (activeRoute && res.RoutesAccess.includes(activeRoute.split(/[/?]/)[1])) {
                        return true;
                    }
                    else {
                        this.router.navigate(['/403-forbidden']);
                        return false;
                    }

                    //return true;

                    // this.router.events.toPromise().then(route => {
                    //     return true;
                    // }).catch(err => {
                    //     return true;
                    // })

                    //  const subscription = this.router.events.pipe(filter(event => event instanceof NavigationEnd), map((event: any) => {
                    //    let activeRoute = event.url;
                    //     if (activeRoute && res.RoutesAccess.includes(activeRoute.split('/')[1])) {
                    //         return true;
                    //     }
                    //     else {
                    //         alert("Not Allowed")
                    //         return false;
                    //     }
                    // }))
                    //     .subscribe(event => {
                    //         if (subscription)
                    //             subscription.unsubscribe();
                    //     });

                    // return true;
                }
                else {
                    //this.dataService.showInfo('please login again', 'session expired');
                    localStorage.clear();
                    this.router.navigate(['/login']);
                    return false;
                }
            })
        } else {
            this.dataService.showError('Unauthorized', 'Error!');
            localStorage.clear();
            this.router.navigate(['/login']);
            return false;
        }
    }
}