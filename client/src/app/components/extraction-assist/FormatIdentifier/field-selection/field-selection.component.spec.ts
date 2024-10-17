import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FieldSelectionComponent } from './field-selectioncomponent';

describe('FieldSelectionComponent', () => {
  let component: FieldSelectionComponent;
  let fixture: ComponentFixture<FieldSelectionComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FieldSelectionComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FieldSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
