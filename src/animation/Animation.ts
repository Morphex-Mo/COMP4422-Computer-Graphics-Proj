/**
 * 缓动函数类型
 */
export type EasingFunction = (t: number) => number;

/**
 * 常用缓动函数集合
 */
export class Easing {
    /** 线性 */
    static linear(t: number): number {
        return t;
    }

    /** 二次缓入 */
    static easeInQuad(t: number): number {
        return t * t;
    }

    /** 二次缓出 */
    static easeOutQuad(t: number): number {
        return t * (2 - t);
    }

    /** 二次缓入缓出 */
    static easeInOutQuad(t: number): number {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    /** 三次缓入 */
    static easeInCubic(t: number): number {
        return t * t * t;
    }

    /** 三次缓出 */
    static easeOutCubic(t: number): number {
        return (--t) * t * t + 1;
    }

    /** 三次缓入缓出 */
    static easeInOutCubic(t: number): number {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }

    /** 弹性缓出 */
    static easeOutElastic(t: number): number {
        const p = 0.3;
        return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
    }

    /** 回弹缓出 */
    static easeOutBounce(t: number): number {
        if (t < 1 / 2.75) {
            return 7.5625 * t * t;
        } else if (t < 2 / 2.75) {
            return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
        } else if (t < 2.5 / 2.75) {
            return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
        } else {
            return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
        }
    }
}

/**
 * 动画配置选项
 */
export interface AnimationOptions {
    /** 持续时间（毫秒） */
    duration: number;
    /** 缓动函数 */
    easing?: EasingFunction;
    /** 更新回调 */
    onUpdate?: (progress: number, value: number) => void;
    /** 完成回调 */
    onComplete?: () => void;
    /** 是否循环 */
    loop?: boolean;
    /** 是否往返循环 */
    yoyo?: boolean;
}

/**
 * 动画类
 */
export class Animation {
    private startValue: number;
    private endValue: number;
    private options: Required<AnimationOptions>;
    private startTime: number = 0;
    private isRunning: boolean = false;
    private isPaused: boolean = false;
    private pauseTime: number = 0;
    private direction: number = 1; // 1: 正向, -1: 反向
    private animationId: number | null = null;

    constructor(
        startValue: number,
        endValue: number,
        options: AnimationOptions
    ) {
        this.startValue = startValue;
        this.endValue = endValue;
        this.options = {
            duration: options.duration,
            easing: options.easing || Easing.linear,
            onUpdate: options.onUpdate || (() => {}),
            onComplete: options.onComplete || (() => {}),
            loop: options.loop || false,
            yoyo: options.yoyo || false
        };
    }

    /**
     * 开始动画
     */
    start(): this {
        if (this.isRunning) return this;

        this.isRunning = true;
        this.isPaused = false;
        this.startTime = performance.now();
        this.animate();
        return this;
    }

    /**
     * 暂停动画
     */
    pause(): this {
        if (!this.isRunning || this.isPaused) return this;

        this.isPaused = true;
        this.pauseTime = performance.now();
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        return this;
    }

    /**
     * 恢复动画
     */
    resume(): this {
        if (!this.isPaused) return this;

        this.isPaused = false;
        this.startTime += performance.now() - this.pauseTime;
        this.animate();
        return this;
    }

    /**
     * 停止动画
     */
    stop(): this {
        this.isRunning = false;
        this.isPaused = false;
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        return this;
    }

    /**
     * 动画主循环
     */
    private animate = (): void => {
        if (!this.isRunning || this.isPaused) return;

        const currentTime = performance.now();
        let elapsed = currentTime - this.startTime;

        // 计算进度 (0-1)
        let progress = Math.min(elapsed / this.options.duration, 1);

        // 应用缓动函数
        const easedProgress = this.options.easing(progress);

        // 计算当前值
        const currentValue = this.direction > 0
            ? this.startValue + (this.endValue - this.startValue) * easedProgress
            : this.endValue - (this.endValue - this.startValue) * easedProgress;

        // 更新回调
        this.options.onUpdate(progress, currentValue);

        // 检查是否完成
        if (progress >= 1) {
            if (this.options.yoyo) {
                // 往返模式：反转方向
                this.direction *= -1;
                this.startTime = currentTime;
                this.animationId = requestAnimationFrame(this.animate);
            } else if (this.options.loop) {
                // 循环模式：重新开始
                this.startTime = currentTime;
                this.animationId = requestAnimationFrame(this.animate);
            } else {
                // 完成
                this.isRunning = false;
                this.options.onComplete();
            }
        } else {
            this.animationId = requestAnimationFrame(this.animate);
        }
    }
}

