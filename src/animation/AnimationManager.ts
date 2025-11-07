import { Animation, AnimationOptions, Easing } from './Animation';

/**
 * 动画管理器 - 管理多个动画
 */
export class AnimationManager {
    private animations: Map<string, Animation> = new Map();
    private updateCallbacks: Map<string, Function> = new Map();
    private rafId: number | null = null;
    private isRunning: boolean = false;

    /**
     * 创建并添加动画
     */
    add(
        id: string,
        startValue: number,
        endValue: number,
        options: AnimationOptions
    ): Animation {
        const animation = new Animation(startValue, endValue, options);
        this.animations.set(id, animation);
        return animation;
    }

    /**
     * 获取动画
     */
    get(id: string): Animation | undefined {
        return this.animations.get(id);
    }

    /**
     * 移除动画
     */
    remove(id: string): void {
        const animation = this.animations.get(id);
        if (animation) {
            animation.stop();
            this.animations.delete(id);
        }
    }

    /**
     * 开始所有动画
     */
    startAll(): void {
        this.animations.forEach(animation => animation.start());
    }

    /**
     * 暂停所有动画
     */
    pauseAll(): void {
        this.animations.forEach(animation => animation.pause());
    }

    /**
     * 恢复所有动画
     */
    resumeAll(): void {
        this.animations.forEach(animation => animation.resume());
    }

    /**
     * 停止所有动画
     */
    stopAll(): void {
        this.animations.forEach(animation => animation.stop());
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        this.isRunning = false;
    }

    /**
     * 清空所有动画
     */
    clear(): void {
        this.stopAll();
        this.animations.clear();
        this.updateCallbacks.clear();
    }

    /**
     * 创建数值动画（便捷方法）
     */
    animate(
        from: number,
        to: number,
        duration: number,
        onUpdate: (value: number) => void,
        easing: (t: number) => number = Easing.linear
    ): Promise<void> {
        return new Promise((resolve) => {
            const id = `anim_${Date.now()}_${Math.random()}`;
            const animation = this.add(id, from, to, {
                duration,
                easing,
                onUpdate: (progress, value) => onUpdate(value),
                onComplete: () => {
                    this.remove(id);
                    resolve();
                }
            });
            animation.start();
        });
    }

    /**
     * 创建对象属性动画
     */
    animateProperty<T extends Record<string, any>>(
        target: T,
        property: keyof T,
        to: number,
        duration: number,
        easing: (t: number) => number = Easing.linear
    ): Promise<void> {
        const from = target[property] as number;
        return this.animate(
            from,
            to,
            duration,
            (value) => {
                target[property] = value as any;
            },
            easing
        );
    }

    /**
     * 同时动画多个属性
     */
    animateProperties<T extends Record<string, any>>(
        target: T,
        properties: Partial<Record<keyof T, number>>,
        duration: number,
        easing: (t: number) => number = Easing.linear
    ): Promise<void[]> {
        const promises: Promise<void>[] = [];
        for (const [key, value] of Object.entries(properties)) {
            promises.push(
                this.animateProperty(target, key as keyof T, value as number, duration, easing)
            );
        }
        return Promise.all(promises);
    }

    /**
     * 获取动画数量
     */
    get size(): number {
        return this.animations.size;
    }
}

/**
 * 全局动画管理器实例
 */
export const globalAnimationManager = new AnimationManager();

