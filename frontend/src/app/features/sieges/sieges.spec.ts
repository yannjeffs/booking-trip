import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Sieges } from './sieges';

describe('Sieges', () => {
  let component: Sieges;
  let fixture: ComponentFixture<Sieges>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sieges]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Sieges);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
