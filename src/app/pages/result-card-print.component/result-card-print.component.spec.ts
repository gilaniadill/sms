import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResultCardPrintComponent } from './result-card-print.component';

describe('ResultCardPrintComponent', () => {
  let component: ResultCardPrintComponent;
  let fixture: ComponentFixture<ResultCardPrintComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResultCardPrintComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResultCardPrintComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
