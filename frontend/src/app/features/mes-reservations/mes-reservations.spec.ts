import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MesReservations } from './mes-reservations';

describe('MesReservations', () => {
  let component: MesReservations;
  let fixture: ComponentFixture<MesReservations>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MesReservations]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MesReservations);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
