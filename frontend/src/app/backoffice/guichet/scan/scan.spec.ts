import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Scan } from './scan';

describe('Scan', () => {
  let component: Scan;
  let fixture: ComponentFixture<Scan>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Scan]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Scan);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
