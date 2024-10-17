import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-filter',
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.scss']
})
export class FilterComponent implements OnInit {

  constructor() { }

  filterOptions:any[] = [];
  ngOnInit() {
    this.filterOptions=[{name:"Vendor name",icon:"delete-button.svg"},{name:"New",icon:"delete-button.svg"},{name:"Region name",icon:"delete-button.svg"},{name:"Businessman",icon:"delete-button.svg"},{name:"email/direct",icon:"delete-button.svg"},{name:"Posted",icon:"delete-button.svg"},{name:"Verified",icon:"delete-button.svg"},{name:"City name",icon:"delete-button.svg"},{name:"01-01-2019-01-03-2019",icon:"delete-button.svg"},{name:"Ready for verification",icon:"delete-button.svg"}];
  }
}
