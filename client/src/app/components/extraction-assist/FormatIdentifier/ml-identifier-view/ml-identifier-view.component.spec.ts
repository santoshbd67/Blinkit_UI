import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MlIdentifierViewComponent } from './ml-identifier-view.component';

describe('MlIdentifierViewComponent', () => {
  let component: MlIdentifierViewComponent;
  let fixture: ComponentFixture<MlIdentifierViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MlIdentifierViewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MlIdentifierViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
