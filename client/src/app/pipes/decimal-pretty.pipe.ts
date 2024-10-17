import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'decimalPretty'
})
export class DecimalPrettyPipe implements PipeTransform {

  transform(value: number, args?: any): any {
    if(value){
      return value.toFixed(2);
    }
    else{
      return value;
    }
  }

}
