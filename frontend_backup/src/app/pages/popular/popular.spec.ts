import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Popular } from './popular';

describe('Popular', () => {
  let component: Popular;
  let fixture: ComponentFixture<Popular>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Popular],
    }).compileComponents();

    fixture = TestBed.createComponent(Popular);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
