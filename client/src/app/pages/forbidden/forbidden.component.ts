import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-forbidden',
  templateUrl: './forbidden.component.html',
  styleUrls: ['./forbidden.component.scss']
})
export class ForbiddenComponent implements OnInit {

  ipAddress = '';

  constructor(private http:HttpClient) { }

  ngOnInit() {
    this.getIPAddress();
  }

  getIPAddress() {
    this.http.get("http://api64.ipify.org?format=json").subscribe((res: any) => {
      this.ipAddress = res.ip;
    });
  }

}
