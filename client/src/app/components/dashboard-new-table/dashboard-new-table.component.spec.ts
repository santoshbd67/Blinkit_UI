import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardNewTableComponent } from './dashboard-new-table.component';

describe('DashboardNewTableComponent', () => {
  let component: DashboardNewTableComponent;
  let fixture: ComponentFixture<DashboardNewTableComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DashboardNewTableComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardNewTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
