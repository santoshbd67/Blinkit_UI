import { Pipe, PipeTransform } from "@angular/core";
import * as moment from "moment";


/*
 * Raise the value exponentially
 * Takes an exponent argument that defaults to 1.
 * Usage:
 *   value | exponentialStrength:exponent
 * Example:
 *   {{ 2 | exponentialStrength:10 }}
 *   formats to: 1024
 */
@Pipe({ name: "prettifyTime" })
export class PrettifyTime implements PipeTransform {
  transform(time: any): any {
    if (time) {
      const seconds = moment.duration(time).seconds();
      const minutes = moment.duration(time).minutes();
      const hours = moment.duration(time).hours();
      const days = moment.duration(time).days();

       let prettyTime =
        (days > 0 ? days + "d " : "")+
        (hours > 0 ? hours + "h " : "") +
        (minutes > 0 ? minutes + "m " : "") +
        (seconds > 0 ? seconds + "s" : "");

      return prettyTime;
    } else {
      return 0;
    }
  }
}
