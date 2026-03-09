import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentUpdate } from './student-update';

describe('StudentUpdate', () => {
  let component: StudentUpdate;
  let fixture: ComponentFixture<StudentUpdate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentUpdate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudentUpdate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
