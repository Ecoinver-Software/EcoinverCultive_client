import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComercialGroupedComponent } from './comercial-grouped.component';

describe('ComercialGroupedComponent', () => {
  let component: ComercialGroupedComponent;
  let fixture: ComponentFixture<ComercialGroupedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComercialGroupedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComercialGroupedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
