
class SummaryStore {
  private cache: Record<string, any> = {};

  set(key: string, value: any) {
    this.cache[key] = value;
  }

  get(key: string) {
    return this.cache[key];
  }
}

export const summaryStore = new SummaryStore();
