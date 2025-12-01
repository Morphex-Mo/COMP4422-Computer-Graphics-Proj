export class TaskPool {
    private taskPool: any[] = [];

    get<T = any>(executeTime: number, callback: Function, taskIndex: number, args: any[]): TaskObject<T> {
        let taskObject = this.taskPool.pop() ?? {} as TaskObject<T>;
        taskObject.T = executeTime;
        taskObject.f = callback;
        taskObject.taskIndex = taskIndex;
        taskObject.ar = args;
        return taskObject;
    }

    recycle(taskObject: TaskObject): void {
        delete taskObject.f;
        delete taskObject.ar;
        this.taskPool.push(taskObject);
    }
}

export interface TaskObject<T = any> {
    T: number;
    f: Function;
    taskIndex: number;
    ar: any[];
}

