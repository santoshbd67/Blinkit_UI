import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ApproverDialogComponent } from './approver-dialog.component';

describe('ApproverDialogComponent', () => {
  let component: ApproverDialogComponent;
  let fixture: ComponentFixture<ApproverDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ApproverDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ApproverDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
