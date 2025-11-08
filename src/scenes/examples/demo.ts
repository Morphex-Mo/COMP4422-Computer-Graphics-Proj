/**
 * 动画库和定时器演示
 */

import * as THREE from 'three';
import { globalTimer } from '../../core';
import { globalAnimationManager, Easing } from '../../animation';

export function runAnimationDemo(scene: THREE.Scene) {
    console.log('=== 动画库演示 ===');

    // 创建多个立方体用于演示不同的动画效果
    const cubes: THREE.Mesh[] = [];
    const materials = [
        new THREE.MeshPhongMaterial({ color: 0xff0000 }), // 红色
        new THREE.MeshPhongMaterial({ color: 0x00ff00 }), // 绿色
        new THREE.MeshPhongMaterial({ color: 0x0000ff }), // 蓝色
        new THREE.MeshPhongMaterial({ color: 0xffff00 }), // 黄色
    ];

    for (let i = 0; i < 4; i++) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const cube = new THREE.Mesh(geometry, materials[i]);
        cube.position.x = (i - 1.5) * 2;
        cube.position.y = 2;
        scene.add(cube);
        cubes.push(cube);
    }

    // 演示1: 线性动画
    console.log('演示1: 线性动画 (红色立方体)');
    globalAnimationManager.animate(
        2, -2,
        2000,
        (value) => {
            cubes[0].position.y = value;
        },
        Easing.linear
    ).then(() => {
        console.log('线性动画完成');
    });

    // 演示2: 缓动动画
    console.log('演示2: 二次缓入缓出 (绿色立方体)');
    globalTimer.addTask(500,() => {
        globalAnimationManager.animate(
            2, -2,
            2000,
            (value) => {
                cubes[1].position.y = value;
            },
            Easing.easeInOutQuad
        ).then(() => {
            console.log('缓动动画完成');
        });
    });

    // 演示3: 弹性动画
    console.log('演示3: 弹性动画 (蓝色立方体)');
    globalTimer.addTask(1000,() => {
        globalAnimationManager.animate(
            2, -2,
            2000,
            (value) => {
                cubes[2].position.y = value;
            },
            Easing.easeOutElastic
        ).then(() => {
            console.log('弹性动画完成');
        });
    });

    // 演示4: 回弹动画
    console.log('演示4: 回弹动画 (黄色立方体)');
    globalTimer.addTask(1500,() => {
        globalAnimationManager.animate(
            2, -2,
            2000,
            (value) => {
                cubes[3].position.y = value;
            },
            Easing.easeOutBounce
        ).then(() => {
            console.log('回弹动画完成');
        });
    });
}

export function runTimerDemo() {
    console.log('\n=== 定时器演示 ===');

    // 演示1: 基础定时任务
    console.log('演示1: 1秒后执行任务');
    globalTimer.addTask(1000, () => {
        console.log('✓ 1秒定时任务执行');
    });

    // 演示2: 带参数的任务
    console.log('演示2: 2秒后执行带参数的任务');
    globalTimer.addTask(2000, (name: string, count: number) => {
        console.log(`✓ 任务执行: ${name}, 计数: ${count}`);
    }, ['定时任务', 42]);

    // 演示3: 多个定时任务
    console.log('演示3: 添加多个定时任务');
    for (let i = 0; i < 5; i++) {
        globalTimer.addTask(500 * (i + 1), (index: number) => {
            console.log(`✓ 任务 ${index} 执行 (${500 * (index + 1)}ms)`);
        }, [i]);
    }

    // 演示4: 使用 Sleep
    console.log('演示4: 异步 Sleep 演示');
    (async () => {
        console.log('开始异步等待...');
        await globalTimer.sleep(3000);
        console.log('✓ 3秒等待完成');

        await globalTimer.sleep(1000);
        console.log('✓ 再等待1秒完成');
    })();

    // 演示5: 任务移除
    console.log('演示5: 任务移除演示');
    const task = globalTimer.addTask(4000, () => {
        console.log('这个任务不会执行');
    });
    setTimeout(() => {
        globalTimer.removeTask(task);
        console.log('✓ 任务已移除');
    }, 500);

    // 演示6: 调试信息
    setTimeout(() => {
        const info = globalTimer.getDebugInfo();
        console.log('定时器调试信息:', info);
    }, 100);

    // 演示7: 连续任务链
    console.log('演示7: 连续任务链');
    (async () => {
        console.log('任务链开始...');
        await globalTimer.sleep(5000);
        console.log('→ 步骤 1 完成');
        await globalTimer.sleep(1000);
        console.log('→ 步骤 2 完成');
        await globalTimer.sleep(1000);
        console.log('→ 步骤 3 完成');
        console.log('✓ 任务链全部完成');
    })();
}

export function runPerformanceTest() {
    console.log('\n=== 性能测试 ===');

    const testCount = 10000;
    console.log(`添加 ${testCount} 个任务...`);

    const startTime = performance.now();

    for (let i = 0; i < testCount; i++) {
        globalTimer.addTask(Math.random() * 10000, () => {
            // 空任务
        });
    }

    const endTime = performance.now();
    console.log(`✓ 添加完成，耗时: ${(endTime - startTime).toFixed(2)}ms`);

    const info = globalTimer.getDebugInfo();
    console.log('任务队列状态:', info);
}
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

