/**
 * 极简事件中心，仿 AzureNotificationCenter。
 */
export type TimeSystemListener = (payload: {
  timeline: number;       // 0..24
  timeOfDay: number;      // 0..24
  hour: number;
  minute: number;
  evaluationTime: number; // 曲线评估用
}) => void;

export type WeatherSystemListener = (payload: {
  evaluationTime: number;
  evaluationTimeGradient: number;
}) => void;

type VoidListener = () => void;

export class NotificationCenter {
  // Time events
  private timelineChanged: TimeSystemListener[] = [];
  private minuteChanged: TimeSystemListener[] = [];
  private hourChanged: TimeSystemListener[] = [];
  private dayChanged: VoidListener[] = [];

  // Weather events
  private beforeWeatherUpdate: WeatherSystemListener[] = [];
  private afterWeatherUpdate: WeatherSystemListener[] = [];
  private weatherTransitionEnd: VoidListener[] = [];

  onTimelineChanged(cb: TimeSystemListener) { this.timelineChanged.push(cb); }
  onMinuteChanged(cb: TimeSystemListener) { this.minuteChanged.push(cb); }
  onHourChanged(cb: TimeSystemListener) { this.hourChanged.push(cb); }
  onDayChanged(cb: VoidListener) { this.dayChanged.push(cb); }

  onBeforeWeatherSystemUpdate(cb: WeatherSystemListener) { this.beforeWeatherUpdate.push(cb); }
  onAfterWeatherSystemUpdate(cb: WeatherSystemListener) { this.afterWeatherUpdate.push(cb); }
  onWeatherTransitionEnd(cb: VoidListener) { this.weatherTransitionEnd.push(cb); }

  emitTimelineChanged(payload: Parameters<TimeSystemListener>[0]) { this.timelineChanged.forEach(f => f(payload)); }
  emitMinuteChanged(payload: Parameters<TimeSystemListener>[0]) { this.minuteChanged.forEach(f => f(payload)); }
  emitHourChanged(payload: Parameters<TimeSystemListener>[0]) { this.hourChanged.forEach(f => f(payload)); }
  emitDayChanged() { this.dayChanged.forEach(f => f()); }

  emitBeforeWeatherSystemUpdate(payload: Parameters<WeatherSystemListener>[0]) { this.beforeWeatherUpdate.forEach(f => f(payload)); }
  emitAfterWeatherSystemUpdate(payload: Parameters<WeatherSystemListener>[0]) { this.afterWeatherUpdate.forEach(f => f(payload)); }
  emitWeatherTransitionEnd() { this.weatherTransitionEnd.forEach(f => f()); }
}

// 单例（也可按需每个 Manager 自己持有实例）
export const AzureEvents = new NotificationCenter();