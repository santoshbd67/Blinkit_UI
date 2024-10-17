import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable()
export class UrlService {

  private previousUrl: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  public previousUrl$: Observable<string> = this.previousUrl.asObservable();

  constructor() {
    if (this.previousUrl && !this.previousUrl.value && localStorage.getItem('previousUrl')) {
      this.previousUrl.next(localStorage.getItem('previousUrl'))
    }
  }
  setPreviousUrl(previousUrl: string) {
    localStorage.setItem('previousUrl', previousUrl)
    this.previousUrl.next(previousUrl);
  }
}