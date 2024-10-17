import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DemoInstuctionsComponent } from './demo-instuctions.component';

describe('DemoInstuctionsComponent', () => {
  let component: DemoInstuctionsComponent;
  let fixture: ComponentFixture<DemoInstuctionsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DemoInstuctionsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DemoInstuctionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
