import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResultEntryComponent } from './result.component';

describe('ResultComponent', () => {
  let component: ResultEntryComponent;
  let fixture: ComponentFixture<ResultEntryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResultEntryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResultEntryComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
