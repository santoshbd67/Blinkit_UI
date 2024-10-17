import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { NgbDate, NgbCalendar } from '@ng-bootstrap/ng-bootstrap';
import * as moment from 'moment';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-sorting-button',
  templateUrl: './sorting-button.component.html',
  styleUrls: ['./sorting-button.component.scss']
})
export class SortingButtonComponent implements OnInit {
  @Input() currentViewType: string;

  @Output() toShow = new EventEmitter();

  public isCollapsed = false;
  // displayMonths = 2;
  // navigation = 'select';
  // showWeekNumbers = false;
  // outsideDays = 'visible';
  fromDate: NgbDate;
  toDate: NgbDate;
  hoveredDate: NgbDate;
  rangetime;
  startDate: any;
  endDate: any;
  toggleCal: boolean = false;
  cardViewVisibility = 0;

  show(viewType: string) {
    localStorage.setItem('view', viewType);
    this.toShow.emit({ view: viewType });
  }

  /* date formate code */

  formatDate(date: NgbDate) {

    const myMoment: moment.Moment = moment(date);

    // NgbDates use 1 for Jan, Moement uses 0, must substract 1 month for proper date conversion
    var convertedMoment = myMoment.subtract(1, 'months');

    if (convertedMoment.isValid()) {
      return convertedMoment.format('DD/MMM/YYYY');
    } else {
      return '';
    }
  }

  /* -----xxxxx----- */

  constructor(calendar: NgbCalendar, private auth: AuthService) {
    this.fromDate = calendar.getToday();
    this.toDate = calendar.getNext(calendar.getToday(), 'd', 10);
  }
  onDateSelection(date: NgbDate) {
    if (!this.fromDate && !this.toDate) {
      this.fromDate = date;
    } else if (this.fromDate && !this.toDate && date.after(this.fromDate)) {
      this.toDate = date;
    } else {
      this.toDate = null;
      this.fromDate = date;
    }
    this.startDate =
      this.fromDate.day + '-' + this.fromDate.month + '-' + this.fromDate.year;
    this.endDate =
      this.toDate.day + '-' + this.toDate.month + '-' + this.toDate.year;
    if (this.startDate && this.endDate) {
      this.toggleDp();
    }

    this.rangetime = this.formatDate(this.fromDate) + ' to ' + this.formatDate(this.toDate);
  }
  isHovered(date: NgbDate) {
    return (
      this.fromDate &&
      !this.toDate &&
      this.hoveredDate &&
      date.after(this.fromDate) &&
      date.before(this.hoveredDate)
    );
  }

  isInside(date: NgbDate) {
    return date.after(this.fromDate) && date.before(this.toDate);
  }

  isRange(date: NgbDate) {
    return (
      date.equals(this.fromDate) ||
      date.equals(this.toDate) ||
      this.isInside(date) ||
      this.isHovered(date)
    );
  }

  toggleDp() {
    this.toggleCal = !this.toggleCal;
  }

  ngOnInit() {
    this.cardViewVisibility = this.auth.getUserSettings('CARDVIEW_VISIBILITY');
  }

  _keyPress(event: any) {
    const pattern = /[]/;
    let inputChar = String.fromCharCode(event.charCode);
    if (!pattern.test(inputChar)) {
      event.preventDefault();
    }
  }

}
