import {TaskObject} from './TaskPool';

/**
 * 最小堆实现 - 用于优化任务队列
 * 比排序更高效，时间复杂度 O(log n)
 */
export class MinHeap<T extends TaskObject> {
    private heap: T[] = [];

    /**
     * 获取堆的大小
     */
    get size(): number {
        return this.heap.length;
    }

    /**
     * 获取堆顶元素（不移除）
     */
    peek(): T | undefined {
        return this.heap[0];
    }

    /**
     * 插入元素
     */
    push(task: T): void {
        this.heap.push(task);
        this.bubbleUp(this.heap.length - 1);
    }

    /**
     * 移除并返回堆顶元素
     */
    pop(): T | undefined {
        if (this.heap.length === 0) return undefined;
        if (this.heap.length === 1) return this.heap.pop();

        const top = this.heap[0];
        this.heap[0] = this.heap.pop()!;
        this.bubbleDown(0);
        return top;
    }

    /**
     * 清空堆
     */
    clear(): void {
        this.heap.length = 0;
    }

    /**
     * 获取所有元素（用于调试）
     */
    toArray(): T[] {
        return [...this.heap];
    }

    /**
     * 上浮操作
     */
    private bubbleUp(index: number): void {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (this.compare(this.heap[index], this.heap[parentIndex]) >= 0) {
                break;
            }
            this.swap(index, parentIndex);
            index = parentIndex;
        }
    }

    /**
     * 下沉操作
     */
    private bubbleDown(index: number): void {
        const length = this.heap.length;
        while (true) {
            let minIndex = index;
            const leftChild = 2 * index + 1;
            const rightChild = 2 * index + 2;

            if (leftChild < length && this.compare(this.heap[leftChild], this.heap[minIndex]) < 0) {
                minIndex = leftChild;
            }
            if (rightChild < length && this.compare(this.heap[rightChild], this.heap[minIndex]) < 0) {
                minIndex = rightChild;
            }
            if (minIndex === index) {
                break;
            }
            this.swap(index, minIndex);
            index = minIndex;
        }
    }

    /**
     * 比较两个任务
     * 返回负数表示 a < b，0 表示相等，正数表示 a > b
     */
    private compare(a: T, b: T): number {
        if (a.T !== b.T) {
            return a.T - b.T;
        }
        return a.taskIndex - b.taskIndex;
    }

    private swap(i: number, j: number): void {
        const temp = this.heap[i];
        this.heap[i] = this.heap[j];
        this.heap[j] = temp;
    }
}

