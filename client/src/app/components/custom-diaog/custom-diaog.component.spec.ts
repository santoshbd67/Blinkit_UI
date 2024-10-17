import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomDiaogComponent } from './custom-diaog.component';

describe('CustomDiaogComponent', () => {
  let component: CustomDiaogComponent;
  let fixture: ComponentFixture<CustomDiaogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CustomDiaogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CustomDiaogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
