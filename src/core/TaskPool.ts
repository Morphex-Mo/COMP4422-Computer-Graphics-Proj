/**
 * 任务对象池 - 用于复用任务对象，减少GC压力
 */
export class TaskPool {
    private taskPool: any[] = [];

    /**
     * 从对象池获取任务对象
     */
    get<T = any>(executeTime: number, callback: Function, taskIndex: number, args: any[]): TaskObject<T> {
        let taskObject = this.taskPool.pop() ?? {} as TaskObject<T>;
        taskObject.T = executeTime;
        taskObject.f = callback;
        taskObject.taskIndex = taskIndex;
        taskObject.ar = args;
        return taskObject;
    }

    /**
     * 回收任务对象到对象池
     */
    recycle(taskObject: TaskObject): void {
        delete taskObject.f;
        delete taskObject.ar;
        this.taskPool.push(taskObject);
    }
}

/**
 * 任务对象接口
 */
export interface TaskObject<T = any> {
    T: number;           // 执行时间
    f: Function;         // 执行函数
    taskIndex: number;   // 任务索引
    ar: any[];          // 参数数组
}

