import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TemplateTestingComponent } from './template-testing.component';

describe('TemplateTestingComponent', () => {
  let component: TemplateTestingComponent;
  let fixture: ComponentFixture<TemplateTestingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TemplateTestingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TemplateTestingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
