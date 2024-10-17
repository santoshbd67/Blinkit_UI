import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ExtractionAssistRootComponent } from './extraction-assist-root.component';

describe('ExtractionAssistComponent', () => {
  let component: ExtractionAssistRootComponent;
  let fixture: ComponentFixture<ExtractionAssistRootComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ExtractionAssistRootComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ExtractionAssistRootComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
