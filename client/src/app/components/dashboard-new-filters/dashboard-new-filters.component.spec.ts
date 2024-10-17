import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardNewFiltersComponent } from './dashboard-new-filters.component';

describe('DashboardNewFiltersComponent', () => {
  let component: DashboardNewFiltersComponent;
  let fixture: ComponentFixture<DashboardNewFiltersComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DashboardNewFiltersComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardNewFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
