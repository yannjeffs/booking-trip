import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Impression } from './impression';

describe('Impression', () => {
  let component: Impression;
  let fixture: ComponentFixture<Impression>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Impression]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Impression);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
