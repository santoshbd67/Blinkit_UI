import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TestingDetailRightViewComponent } from './testing-detail-right-view.component';

describe('TestingDetailRightViewComponent', () => {
  let component: TestingDetailRightViewComponent;
  let fixture: ComponentFixture<TestingDetailRightViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TestingDetailRightViewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestingDetailRightViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
