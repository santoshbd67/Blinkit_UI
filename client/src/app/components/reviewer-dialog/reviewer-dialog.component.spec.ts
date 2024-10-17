import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ReviewerDialogComponent } from './reviewer-dialog.component';

describe('ReviewerDialogComponent', () => {
  let component: ReviewerDialogComponent;
  let fixture: ComponentFixture<ReviewerDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ReviewerDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ReviewerDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
