import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalModifyUserComponent } from './modal-modify-user.component';

describe('ModalModifyUserComponent', () => {
  let component: ModalModifyUserComponent;
  let fixture: ComponentFixture<ModalModifyUserComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ModalModifyUserComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ModalModifyUserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
