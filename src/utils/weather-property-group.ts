import {WeatherProperty} from "./weather-property";

export class WeatherPropertyGroup {
  name = "GroupName";
  isEnabled = true;
  weatherPropertyList: WeatherProperty[] = [];
}