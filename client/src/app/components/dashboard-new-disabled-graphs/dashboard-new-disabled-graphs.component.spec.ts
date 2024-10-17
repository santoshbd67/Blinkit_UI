import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardNewDisabledGraphsComponent } from './dashboard-new-disabled-graphs.component';

describe('DashboardNewDisabledGraphsComponent', () => {
  let component: DashboardNewDisabledGraphsComponent;
  let fixture: ComponentFixture<DashboardNewDisabledGraphsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DashboardNewDisabledGraphsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardNewDisabledGraphsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
