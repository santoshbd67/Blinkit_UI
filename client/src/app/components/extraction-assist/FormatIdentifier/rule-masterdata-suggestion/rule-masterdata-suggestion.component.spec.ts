import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RuleMasterdataSuggestionComponent } from './rule-masterdata-suggestion.component';

describe('RuleMasterdataSuggestionComponent', () => {
  let component: RuleMasterdataSuggestionComponent;
  let fixture: ComponentFixture<RuleMasterdataSuggestionComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RuleMasterdataSuggestionComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RuleMasterdataSuggestionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
