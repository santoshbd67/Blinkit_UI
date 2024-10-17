import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalModifyViewComponent } from './modal-modify-view.component';

describe('ModalModifyViewComponent', () => {
  let component: ModalModifyViewComponent;
  let fixture: ComponentFixture<ModalModifyViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ModalModifyViewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ModalModifyViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
