import {TaskObject, TaskPool} from './TaskPool';
import {MinHeap} from './MinHeap';

/**
 * 定时器配置选项
 */
export interface TimerOptions {
    /** 时间强同步 */
    forceTimeSync?: boolean;
    /** 速度倍率 */
    speed?: number;
    /** 是否开启调试 */
    debug?: boolean;
}

/**
 * 统一定时工具 - 优化版
 * 使用优先队列（最小堆）替代排序，性能更优
 */
export class Timer {
    /** 监控刷新频率（毫秒） */
    static readonly MONITOR_REFRESH = 100;
    /** 基础监控刷新频率（毫秒） */
    static readonly BASE_MONITOR_REFRESH = 10;

    /** 系统时间 */
    private now: number = 0;
    /** 定时器ID */
    private timerId: number | null = null;
    /** 任务优先队列（使用最小堆） */
    private taskQueue: MinHeap<TaskObject>;
    /** 短任务集合（用于频繁触发的任务） */
    private taskSet: Set<TaskObject>;
    /** 时间步长 */
    private timeStep: number = 1;
    /** 速度倍率 */
    private speed: number = 1;
    /** 任务计数器 */
    private taskTotal: number = 0;
    /** 时间偏移（用于时间强同步） */
    private timeOffset: number | null = null;
    /** 任务对象池 */
    private pool: TaskPool;
    /** 配置选项 */
    private options: TimerOptions;

    constructor(options: TimerOptions = {}) {
        this.taskQueue = new MinHeap<TaskObject>();
        this.taskSet = new Set<TaskObject>();
        this.pool = new TaskPool();
        this.options = {
            forceTimeSync: true,
            speed: 1,
            debug: false,
            ...options
        };
        this.speed = this.options.speed!;
    }

    /**
     * 初始化定时器
     */
    init(callback?: Function, args: any[] = []): void {
        this.now = 0;
        this.timerId = null;
        this.taskQueue.clear();
        this.taskSet.clear();
        this.timeStep = 1;
        this.taskTotal = 0;
        this.timeOffset = null;

        if (callback) {
            this.addTask(0, callback, args);
        }
        this.start();
    }

    /**
     * 添加任务
     * @param delayTime 延迟时间（毫秒）
     * @param callback 回调函数
     * @param args 参数数组
     * @param useSet 是否使用Set存储（用于频繁触发的任务）
     */
    addTask(delayTime: number = 0, callback: Function, args: any[] = [], useSet: boolean = false): TaskObject {
        // 时间强同步：加上时间偏移
        if (this.timeOffset !== null) {
            delayTime += this.timeOffset;
        }

        const task = this.pool.get(
            this.now + delayTime,
            callback,
            this.taskTotal++,
            args
        );

        // 短时间任务或频繁触发的任务使用 Set
        if (delayTime < 15 || useSet) {
            this.taskSet.add(task);
        } else {
            // 长时间任务使用优先队列（最小堆）
            this.taskQueue.push(task);
        }

        return task;
    }

    /**
     * 移除任务
     */
    removeTask(task: TaskObject): void {
        if (!this.taskSet.delete(task)) {
            // 如果不在Set中，标记为已删除
            task.T = -Infinity;
        }
    }

    /**
     * 启动定时器
     */
    start(): void {
        if (this.timerId !== null) return;

        {
            this.startWithTimeSync();
        }
    }

    /**
     * 时间强同步模式启动
     */
    private startWithTimeSync(): void {
        let task: TaskObject | undefined;
        let now: number;
        let step: number;
        let lastTime = Date.now();
        let curTime: number;
        const self = this;
        const process = () => {
            // 计算实际经过的时间
            curTime = Date.now();
            step = Math.max(self.calcTimePassed(curTime - lastTime) * self.speed, 0);
            lastTime = curTime;

            now = self.now += step;

            // 处理优先队列中的任务
            while ((task = self.taskQueue.peek()) && now >= task.T) {
                self.taskQueue.pop();
                if (task.T === -Infinity) {
                    if (self.options.debug) {
                        console.warn('[Timer] Skipped removed task', task);
                    }
                    continue;
                }
                try {
                    // 设置时间偏移
                    self.timeOffset = task.T - self.now;
                    task.f(...task.ar);
                    self.pool.recycle(task);
                } catch (err) {
                    console.error('[Timer] Task execution error:', err);
                }
            }

            // 处理Set中的短任务
            self.taskSet.forEach(task => {
                if (now >= task.T) {
                    try {
                        self.timeOffset = task.T - self.now;
                        task.f(...task.ar);
                    } catch (err) {
                        console.error('[Timer] Task execution error:', err);
                    }
                    self.taskSet.delete(task);
                    self.pool.recycle(task);
                }
            });

            // 重置时间偏移
            self.timeOffset = null;
        };

        const loopId = self.timerId = Math.random();
        requestAnimationFrame(function loop() {
            if ((self as any).timerId !== loopId) {
                return;
            }
            process();
            requestAnimationFrame(loop);
        }.bind(self));
    }

    stop(): void {
        if (this.timerId !== null) {
            clearInterval(this.timerId as any);
            this.timerId = null;
        }
    }

    clear(): void {
        this.taskQueue.clear();
        this.taskSet.clear();
        this.taskTotal = 0;
    }

    sleep(delayTime: number): Promise<void> {
        return new Promise(resolve => this.addTask(delayTime, resolve));
    }

    setSpeed(speed: number): void {
        this.speed = speed;
    }

    getTime(): number {
        return this.now;
    }

    private calcTimePassed(delta: number): number {
        return Math.min(delta, 100);
    }

    getDebugInfo(): { queueSize: number; setSize: number; totalTasks: number; currentTime: number } {
        return {
            queueSize: this.taskQueue.size,
            setSize: this.taskSet.size,
            totalTasks: this.taskTotal,
            currentTime: this.now
        };
    }
}

export const globalTimer = new Timer({ forceTimeSync: true, speed: 1 });

