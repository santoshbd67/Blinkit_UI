import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TestingDocDetailviewComponent } from './testing-doc-detailview.component';

describe('TestingDocDetailviewComponent', () => {
  let component: TestingDocDetailviewComponent;
  let fixture: ComponentFixture<TestingDocDetailviewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TestingDocDetailviewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestingDocDetailviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
