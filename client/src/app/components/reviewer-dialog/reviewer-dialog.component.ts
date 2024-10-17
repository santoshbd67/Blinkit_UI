import { Component, OnInit, EventEmitter, Output, Input, OnChanges, SimpleChanges } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';
import { DataService } from 'src/app/services/data.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-reviewer-dialog',
  templateUrl: './reviewer-dialog.component.html',
  styleUrls: ['./reviewer-dialog.component.scss']
})
export class ReviewerDialogComponent implements OnInit, OnChanges {
  @Output() onCancel = new EventEmitter<string>();
  @Output() onActionPressed = new EventEmitter<string>();

  @Input() bodyContent: any;

  public dialogWidth: string = '50%';
  public dialogHeight: string = '50%';
  public isShown: boolean = false;
  isRefreshing = false;
  totalDocsReviewed = 0;

  display = "block";

  constructor(private spinner: NgxSpinnerService, private router: Router, private dataService: DataService) { }

  ngOnInit() {
    this.getTotalDocsReviewed();
  }

  getTotalDocsReviewed() {

    this.dataService.getTotalDocsReviewedByReviewer().subscribe(res => {
      if (res && res.responseCode == 'OK' && res.result) {
        this.totalDocsReviewed = res.result.length;
      }
    }, err => {
      console.error(err);
    })
  }

  showSpinner(timeDuration) {
    timeDuration = timeDuration * 1000;
    this.spinner.show();
    setTimeout(() => {
      this.spinner.hide();
    }, timeDuration);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // if (this.bodyContent.FooterAction == 'Hide') {
    //   this.isRefreshing = false;
    // }
  }

  closeDialog(calledFrom) {
    if (calledFrom == 'Home') {
      this.onCancel.emit(calledFrom);
    }
    else {
      this.onCancel.emit('close');
    }
  }

  CheckNewDocuments() {
    setTimeout(() => {
      this.onActionPressed.emit(this.bodyContent.action);
    }, 1000);
    this.isRefreshing = true;
    this.showSpinner(1);
  }

  redirectToHome() {
    this.router.navigateByUrl("/processing");
    this.closeDialog('Home');
    localStorage.setItem("ReviewState", 'RELEASED');
  }
}
