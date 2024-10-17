import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RuleMasterdataCreationComponent } from './rule-masterdata-creation.component';

describe('RuleMasterdataCreationComponent', () => {
  let component: RuleMasterdataCreationComponent;
  let fixture: ComponentFixture<RuleMasterdataCreationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RuleMasterdataCreationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RuleMasterdataCreationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
