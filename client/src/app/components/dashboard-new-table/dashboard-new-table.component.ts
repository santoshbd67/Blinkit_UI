import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';

@Component({
  selector: 'app-dashboard-new-table',
  templateUrl: './dashboard-new-table.component.html',
  styleUrls: ['./dashboard-new-table.component.scss']
})
export class DashboardNewTableComponent implements OnInit {

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  @Input() chartConfig: any;

  tableHeaderNames: string[] = [];
  clickedRows = new Set<any>();
  dataSet = [];
  dataSource: MatTableDataSource<any>

  constructor() { }

  ngOnInit() {
    this.setTableHeaderNames();
  }

  setTableHeaderNames() {
    if (this.chartConfig) {
      this.dataSet = this.chartConfig.currentData ? this.chartConfig.currentData : this.chartConfig.defaultData;

      let firstObject = this.dataSet[0];
      for (const keys in firstObject) {
        this.tableHeaderNames.push(keys);
      }
    }

    this.dataSource = new MatTableDataSource(this.dataSet);
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  clickedRowsEvent(event) {
    console.log(event);
  }
}
