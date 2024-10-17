import { Pipe, PipeTransform } from "@angular/core";
@Pipe({ name: "suspiciousSymbolsPipe" })
export class SuspiciousSymbolsPipe implements PipeTransform {
  transform(fieldValue: string, suspiciousSymbols: any): string {

    let suspiciousCharacterArray = [];

    if (suspiciousSymbols) {
      for (let i = 0; i < suspiciousSymbols.length; i++) {
        if (suspiciousSymbols.charAt(i) === "1") {
          suspiciousCharacterArray.push(i);
        }
      }
    }

    //Crude implementation of replace to highlight suspicious characters but it works.
    let output = "";
    if (suspiciousCharacterArray.length > 0) {
      fieldValue.split("").forEach((char, ind) => {
        if (suspiciousCharacterArray.indexOf(ind) > -1) {
          output += '<span class="highlight">' + char + "</span>";
        } else {
          output += char + "";
        }
      });
    }

    if (output.length === 0) {
      output = fieldValue;
    }

    return output;
  }
}
