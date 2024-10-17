import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-payment-invoice',
  templateUrl: './payment-invoice.component.html',
  styleUrls: ['./payment-invoice.component.scss']
})
export class PaymentInvoiceComponent implements OnInit {

  applyHover: boolean = false;

  constructor() { }

  ngOnInit() {
  }

  overMe(event){
    this.applyHover = true;
  }
  outMe(event){
    this.applyHover = false;
  }
  invovice = [
    {
      files: 1152,
      number: "1,50,000cr",
      process: "Invoices gone for payment",
    },
    {
      files: 1152,
      number: "1,50,000cr",
      process: "Invoices gone for payment",
    },
    {
      files: 1152,
      number: "1,50,000cr",
      process: "Invoices gone for payment",
    },
    {
      files: 1152,
      number: "1,50,000cr",
      process: "Invoices gone for payment",
    },
    {
      files: 1152,
      number: "1,50,000cr",
      process: "Invoices gone for payment",
    },
  ]
}
