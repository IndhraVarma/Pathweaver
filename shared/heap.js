/** Minimal binary min-heap keyed by a numeric priority. */
export class MinHeap {
  constructor() {
    this.items = [];
  }

  get size() {
    return this.items.length;
  }

  push(value, priority) {
    this.items.push({ value, priority });
    this.#bubbleUp(this.items.length - 1);
  }

  pop() {
    const { items } = this;
    if (items.length === 0) return undefined;
    const top = items[0];
    const last = items.pop();
    if (items.length > 0) {
      items[0] = last;
      this.#sinkDown(0);
    }
    return top.value;
  }

  #bubbleUp(index) {
    const { items } = this;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (items[parent].priority <= items[index].priority) break;
      [items[parent], items[index]] = [items[index], items[parent]];
      index = parent;
    }
  }

  #sinkDown(index) {
    const { items } = this;
    const length = items.length;
    for (;;) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;
      if (left < length && items[left].priority < items[smallest].priority) smallest = left;
      if (right < length && items[right].priority < items[smallest].priority) smallest = right;
      if (smallest === index) break;
      [items[smallest], items[index]] = [items[index], items[smallest]];
      index = smallest;
    }
  }
}
