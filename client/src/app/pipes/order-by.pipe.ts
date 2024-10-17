import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'orderBy'
})
export class OrderByPipe implements PipeTransform {
  sortingBy:string;
  transform(value: any, args?: any): any {
    this.sortingBy = args;
    if(value && value.length){
     let sorted = value.sort((a,b)=>{
      // Use toUpperCase() to ignore character casing
      const bandA = a[this.sortingBy].toUpperCase();
      const bandB = b[this.sortingBy].toUpperCase();
      return bandA > bandB?1:-1;
     });
      return sorted;
    }
    else{
      return [];
    }
  }
}
