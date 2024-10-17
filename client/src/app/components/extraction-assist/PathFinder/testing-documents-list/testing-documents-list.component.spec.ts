import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TestingDocumentsListComponent } from './testing-documents-list.component';

describe('TestingDocumentsListComponent', () => {
  let component: TestingDocumentsListComponent;
  let fixture: ComponentFixture<TestingDocumentsListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TestingDocumentsListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestingDocumentsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
