import { Injectable } from '@nestjs/common';

@Injectable()
export class EventFilterService {
  matchesFilters(event: any, filters: Record<string, any>): boolean {
    if (!filters || Object.keys(filters).length === 0) {
      return true;
    }

    for (const [key, filterValue] of Object.entries(filters)) {
      if (!this.matchesFilter(event[key], filterValue)) {
        return false;
      }
    }

    return true;
  }

  private matchesFilter(eventValue: any, filterValue: any): boolean {
    if (Array.isArray(filterValue)) {
      return filterValue.includes(eventValue);
    }

    if (typeof filterValue === 'object' && filterValue !== null) {
      return this.matchesObjectFilter(eventValue, filterValue);
    }

    return eventValue === filterValue;
  }

  private matchesObjectFilter(eventValue: any, filterObject: any): boolean {
    if (typeof eventValue !== 'object' || eventValue === null) {
      return false;
    }

    for (const [key, value] of Object.entries(filterObject)) {
      if (key === '$gt' && eventValue <= value) return false;
      if (key === '$gte' && eventValue < value) return false;
      if (key === '$lt' && eventValue >= value) return false;
      if (key === '$lte' && eventValue > value) return false;
      if (key === '$ne' && eventValue === value) return false;
      if (key === '$in' && !Array.isArray(value)) return false;
      if (key === '$in' && !value.includes(eventValue)) return false;
      if (key === '$nin' && !Array.isArray(value)) return false;
      if (key === '$nin' && value.includes(eventValue)) return false;
      if (key === '$exists' && (value ? !eventValue : !!eventValue))
        return false;
      if (key === '$regex' && typeof eventValue === 'string') {
        const regex = new RegExp(value);
        if (!regex.test(eventValue)) return false;
      }
    }

    return true;
  }

  filterByEventType(events: string[], eventTypes: string[]): boolean {
    return (
      eventTypes.length === 0 ||
      events.some((event) => eventTypes.includes(event))
    );
  }

  filterByTimeRange(
    timestamp: number,
    startTime?: number,
    endTime?: number,
  ): boolean {
    if (startTime && timestamp < startTime) return false;
    if (endTime && timestamp > endTime) return false;
    return true;
  }

  filterByAmount(
    amount: number,
    minAmount?: number,
    maxAmount?: number,
  ): boolean {
    if (minAmount !== undefined && amount < minAmount) return false;
    if (maxAmount !== undefined && amount > maxAmount) return false;
    return true;
  }
}
