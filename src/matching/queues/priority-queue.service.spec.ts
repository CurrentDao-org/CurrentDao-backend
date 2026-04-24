import { Test, TestingModule } from '@nestjs/testing';
import { PriorityQueueService } from './priority-queue.service';

describe('PriorityQueueService', () => {
  let service: PriorityQueueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PriorityQueueService],
    }).compile();

    service = module.get<PriorityQueueService>(PriorityQueueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('enqueue', () => {
    it('should enqueue an order', () => {
      const order = {
        id: 'order1',
        type: 'buy' as const,
        quantity: 100,
        price: 50,
        energyType: 'solar',
        location: 'US',
        userId: 'user1',
        status: 'pending',
        createdAt: new Date(),
        priority: 0,
        isRenewable: true,
      };

      const result = service.enqueue(order, 5);

      expect(result).toBe(true);
      expect(service.size()).toBe(1);
    });

    it('should reject orders when queue is full', () => {
      // Fill queue to max capacity
      for (let i = 0; i < 100000; i++) {
        const order = {
          id: `order${i}`,
          type: 'buy' as const,
          quantity: 100,
          price: 50,
          energyType: 'solar',
          location: 'US',
          userId: 'user1',
          status: 'pending',
          createdAt: new Date(),
          priority: 0,
          isRenewable: true,
        };
        service.enqueue(order);
      }

      const order = {
        id: 'order100001',
        type: 'buy' as const,
        quantity: 100,
        price: 50,
        energyType: 'solar',
        location: 'US',
        userId: 'user1',
        status: 'pending',
        createdAt: new Date(),
        priority: 0,
        isRenewable: true,
      };

      const result = service.enqueue(order);

      expect(result).toBe(false);
    });
  });

  describe('dequeue', () => {
    it('should dequeue highest priority order', () => {
      const order1 = {
        id: 'order1',
        type: 'buy' as const,
        quantity: 100,
        price: 50,
        energyType: 'solar',
        location: 'US',
        userId: 'user1',
        status: 'pending',
        createdAt: new Date(),
        priority: 5,
        isRenewable: true,
      };

      const order2 = {
        id: 'order2',
        type: 'buy' as const,
        quantity: 100,
        price: 50,
        energyType: 'solar',
        location: 'US',
        userId: 'user2',
        status: 'pending',
        createdAt: new Date(),
        priority: 10,
        isRenewable: true,
      };

      service.enqueue(order1, 5);
      service.enqueue(order2, 10);

      const dequeued = service.dequeue();

      expect(dequeued).toBeDefined();
      expect(dequeued?.id).toBe('order2'); // Higher priority
    });

    it('should return null when queue is empty', () => {
      const dequeued = service.dequeue();

      expect(dequeued).toBeNull();
    });
  });

  describe('dequeueBatch', () => {
    it('should dequeue multiple orders', () => {
      for (let i = 0; i < 5; i++) {
        const order = {
          id: `order${i}`,
          type: 'buy' as const,
          quantity: 100,
          price: 50,
          energyType: 'solar',
          location: 'US',
          userId: 'user1',
          status: 'pending',
          createdAt: new Date(),
          priority: i,
          isRenewable: true,
        };
        service.enqueue(order, i);
      }

      const orders = service.dequeueBatch(3);

      expect(orders).toBeDefined();
      expect(orders.length).toBe(3);
    });
  });

  describe('getMetrics', () => {
    it('should return queue metrics', () => {
      const order = {
        id: 'order1',
        type: 'buy' as const,
        quantity: 100,
        price: 50,
        energyType: 'solar',
        location: 'US',
        userId: 'user1',
        status: 'pending',
        createdAt: new Date(),
        priority: 0,
        isRenewable: true,
      };

      service.enqueue(order);

      const metrics = service.getMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.totalOrders).toBe(1);
      expect(metrics.buyOrders).toBe(1);
      expect(metrics.queueDepth).toBe(1);
    });
  });

  describe('detectManipulation', () => {
    it('should detect suspicious activity', () => {
      // Add many orders from same user
      for (let i = 0; i < 1001; i++) {
        const order = {
          id: `order${i}`,
          type: 'buy' as const,
          quantity: 100,
          price: 50,
          energyType: 'solar',
          location: 'US',
          userId: 'suspicious_user',
          status: 'pending',
          createdAt: new Date(),
          priority: 0,
          isRenewable: true,
        };
        service.enqueue(order);
      }

      const detection = service.detectManipulation('suspicious_user');

      expect(detection).toBeDefined();
      expect(detection.isSuspicious).toBe(true);
      expect(detection.reasons.length).toBeGreaterThan(0);
    });
  });

  describe('getServiceInfo', () => {
    it('should return service information', () => {
      const info = service.getServiceInfo();

      expect(info).toBeDefined();
      expect(info.maxQueueSize).toBe(100000);
      expect(info.targetThroughput).toBe(100000);
      expect(info.description).toBeDefined();
    });
  });
});
