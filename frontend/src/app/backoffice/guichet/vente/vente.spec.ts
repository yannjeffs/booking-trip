import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Vente } from './vente';

describe('Vente', () => {
  let component: Vente;
  let fixture: ComponentFixture<Vente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Vente]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Vente);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
