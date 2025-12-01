import {AnimationCurve} from "./animation-curve";
import {AzureEvents} from "./notification-center";
import {TimeDirection, TimeLoop, TimeMode} from "./types";

export class TimeSystem {
  timeMode: TimeMode = TimeMode.Simple;
  timeDirection: TimeDirection = TimeDirection.Forward;
  timeLoop: TimeLoop = TimeLoop.Off;

  startTime = 6.5;
  dayLength = 24.0;
  dawnTime = 6.0;
  duskTime = 18.0;

  timeline = 6.5;
  timeOfDay = 6.5;
  hour = 6;
  minute = 0;
  evaluationTime = 6.5;

  private timeLengthCurve: AnimationCurve = AnimationCurve.Linear(0, 0, 24, 24);
  private timeProgressionStep = 0.0;
  private prevMinute = -1;
  private prevHour = -1;

  constructor() {
    this.updateTimeLengthCurve(this.dawnTime, this.duskTime);
    this.computeTimeProgressionStep();
    this.applyTimeline(this.startTime);
  }

  private computeTimeProgressionStep() {
    if (this.dayLength > 0) {
      this.timeProgressionStep = (24.0 / 60.0) / this.dayLength; // 每秒推进小时的量
    } else {
      this.timeProgressionStep = 0;
    }
  }

  updateConfig(params: Partial<Pick<TimeSystem, "dayLength" | "dawnTime" | "duskTime">>) {
    if (typeof params.dayLength === "number") {
      this.dayLength = params.dayLength;
      this.computeTimeProgressionStep();
    }
    if (typeof params.dawnTime === "number" || typeof params.duskTime === "number") {
      this.dawnTime = params.dawnTime ?? this.dawnTime;
      this.duskTime = params.duskTime ?? this.duskTime;
      this.updateTimeLengthCurve(this.dawnTime, this.duskTime);
    }
  }

  update(deltaTimeSeconds: number) {
    if (this.timeProgressionStep === 0) {
      this.emitTimelineChanged();
      return;
    }

    if (this.timeDirection === TimeDirection.Forward) {
      this.timeline += this.timeProgressionStep * deltaTimeSeconds;
      if (this.timeline >= 24) {
        this.timeline = this.timeline % 24;
        AzureEvents.emitDayChanged();
      }
    } else {
      this.timeline -= this.timeProgressionStep * deltaTimeSeconds;
      if (this.timeline < 0) {
        this.timeline = 24 + (this.timeline % 24);
        AzureEvents.emitDayChanged();
      }
    }

    this.applyTimeline(this.timeline);
  }

  private updateTimeLengthCurve(dawn: number, dusk: number) {
    this.timeLengthCurve = AnimationCurve.Linear(0, 0, 24, 24);
    this.timeLengthCurve.addKey(dawn, 6.0);
    this.timeLengthCurve.addKey(dusk, 18.0);
  }

  private applyTimeline(t: number) {
    this.timeline = Math.max(0, Math.min(24, t));
    this.timeOfDay = this.timeLengthCurve.evaluate(this.timeline);

    this.hour = Math.floor(this.timeOfDay);
    this.minute = Math.floor((this.timeOfDay * 60) % 60);
    this.evaluationTime = this.timeOfDay;

    if (this.prevMinute !== this.minute) {
      this.prevMinute = this.minute;
      AzureEvents.emitMinuteChanged(this.snapshot());
    }
    if (this.prevHour !== this.hour) {
      this.prevHour = this.hour;
      AzureEvents.emitHourChanged(this.snapshot());
    }

    this.emitTimelineChanged();
  }

  private emitTimelineChanged() {
    AzureEvents.emitTimelineChanged(this.snapshot());
  }

  private snapshot() {
    return {
      timeline: this.timeline,
      timeOfDay: this.timeOfDay,
      hour: this.hour,
      minute: this.minute,
      evaluationTime: this.evaluationTime,
    };
  }

  setTime(timeline: number) {
    this.applyTimeline(timeline);
  }
}