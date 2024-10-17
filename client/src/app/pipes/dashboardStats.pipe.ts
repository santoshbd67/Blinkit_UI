import { Pipe, PipeTransform } from "@angular/core";
import { PrettifyTime } from "./prettifyTime.pipe";
import { DecimalPipe } from "@angular/common";

@Pipe({ name: "dashboardStatsPipe" })
export class DashboardStatsPipe implements PipeTransform {
  constructor(
    private prettifyTime: PrettifyTime,
    private decimalPipe: DecimalPipe
  ) { }

  transform(value: any, format: any): any {
    let abs;
    let converted;

    if (format === "integer") {
      if (value)
        converted = parseInt(value).toFixed(0);
      else
        converted = 0;
    }

    if (format === "number") {
      if (value)
        converted = this.decimalPipe.transform(value, "1.2-2");
      else
        converted = 0;
    }

    if (format === "time") {
      if (value)
        converted = this.prettifyTime.transform(value);
      else
        converted = "0's";
    }

    if (format === "short") {
      abs = Math.abs(value);
      if (abs >= Math.pow(10, 12)) {
        // trillion
        converted = (value / Math.pow(10, 12)).toFixed(1) + "T";
      } else if (abs < Math.pow(10, 12) && abs >= Math.pow(10, 9)) {
        // billion
        converted = (value / Math.pow(10, 9)).toFixed(1) + "B";
      } else if (abs < Math.pow(10, 9) && abs >= Math.pow(10, 6)) {
        // million
        converted = (value / Math.pow(10, 6)).toFixed(1) + "M";
      } else if (abs < Math.pow(10, 6) && abs >= Math.pow(10, 3)) {
        // thousand
        converted = (value / Math.pow(10, 3)).toFixed(1) + "K";
      } else if (abs < Math.pow(10, 3) && abs >= Math.pow(10, 0)) {
        // thousand
        converted = (value / Math.pow(10, 0)).toFixed(1);
      }
    }

    return converted;
  }
}
