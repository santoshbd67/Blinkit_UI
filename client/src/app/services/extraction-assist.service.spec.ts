import { TestBed } from '@angular/core/testing';

import { ExtractionAssistService } from './extraction-assist.service';

describe('ExtractionAssistService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ExtractionAssistService = TestBed.get(ExtractionAssistService);
    expect(service).toBeTruthy();
  });
});
