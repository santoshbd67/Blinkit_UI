import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RulesViewComponent } from './rules-view.component';

describe('RulesViewComponent', () => {
  let component: RulesViewComponent;
  let fixture: ComponentFixture<RulesViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RulesViewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RulesViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
