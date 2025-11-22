import { Test, TestingModule } from '@nestjs/testing';
import { RefreshService } from './refresh.service';

describe('RefreshService', () => {
  let service: RefreshService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RefreshService],
    }).compile();

    service = module.get<RefreshService>(RefreshService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

