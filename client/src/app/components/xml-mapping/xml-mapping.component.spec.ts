import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { XmlMappingComponent } from './xml-mapping.component';

describe('XmlMappingComponent', () => {
  let component: XmlMappingComponent;
  let fixture: ComponentFixture<XmlMappingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ XmlMappingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(XmlMappingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
