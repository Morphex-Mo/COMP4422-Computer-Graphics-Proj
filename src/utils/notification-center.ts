export type TimeSystemListener = (payload: {
  timeline: number;
  timeOfDay: number;
  hour: number;
  minute: number;
  evaluationTime: number;
}) => void;

export type WeatherSystemListener = (payload: {
  evaluationTime: number;
  evaluationTimeGradient: number;
}) => void;

type VoidListener = () => void;

export class NotificationCenter {
  private timelineChanged: TimeSystemListener[] = [];
  private minuteChanged: TimeSystemListener[] = [];
  private hourChanged: TimeSystemListener[] = [];
  private dayChanged: VoidListener[] = [];

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

export const AzureEvents = new NotificationCenter();