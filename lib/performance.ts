// Performance monitoring utilities
interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();

  start(name: string): void {
    this.metrics.set(name, {
      name,
      startTime: performance.now()
    });
  }

  end(name: string): number {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric "${name}" not found`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;
    
    metric.endTime = endTime;
    metric.duration = duration;
    
    console.log(`⏱️ Performance: ${name} took ${duration.toFixed(2)}ms`);
    
    return duration;
  }

  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  getAllMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  clear(): void {
    this.metrics.clear();
  }

  // Helper function to measure async operations
  async measureAsync<T>(name: string, operation: () => Promise<T>): Promise<T> {
    this.start(name);
    try {
      const result = await operation();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  // Helper function to measure sync operations
  measure<T>(name: string, operation: () => T): T {
    this.start(name);
    try {
      const result = operation();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;

// Helper function to measure API response times
export function measureAPICall<T>(
  apiName: string,
  operation: () => Promise<T>
): Promise<T> {
  return performanceMonitor.measureAsync(`API: ${apiName}`, operation);
}

// Helper function to measure database queries
export function measureDBQuery<T>(
  queryName: string,
  operation: () => Promise<T>
): Promise<T> {
  return performanceMonitor.measureAsync(`DB: ${queryName}`, operation);
}

// Helper function to measure component render times
export function measureRender<T>(
  componentName: string,
  operation: () => T
): T {
  return performanceMonitor.measure(`Render: ${componentName}`, operation);
}
