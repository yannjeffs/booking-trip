import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Voyages } from './voyages';

describe('Voyages', () => {
  let component: Voyages;
  let fixture: ComponentFixture<Voyages>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Voyages]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Voyages);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
