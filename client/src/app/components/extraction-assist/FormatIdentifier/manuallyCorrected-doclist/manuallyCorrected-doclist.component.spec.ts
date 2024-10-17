import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ManuallyCorrectedDocListComponent } from './manuallyCorrected-doclist.component';

describe('RuleCreationComponent', () => {
  let component: ManuallyCorrectedDocListComponent;
  let fixture: ComponentFixture<ManuallyCorrectedDocListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ManuallyCorrectedDocListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ManuallyCorrectedDocListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
