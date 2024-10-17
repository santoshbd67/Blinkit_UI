import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';

@Component({
  selector: 'app-multi-select-dropdown',
  templateUrl: './multi-select-dropdown.component.html',
  styleUrls: ['./multi-select-dropdown.component.scss']
})
export class MultiSelectDropdownComponent implements OnInit {
  @Input() documentTypesList: any[];
  @Input() mode: string;

  @Output() shareCheckedList = new EventEmitter();
  @Output() shareIndividualCheckedList = new EventEmitter();

  checkedList: any[];
  currentSelected: {};
  selectedCheckedList: any[];
  hiddenItems: number;
  initialLength: number = 3;
  showDropDown: boolean = false;

  constructor() {
    this.checkedList = [];
    this.selectedCheckedList = [];
  }

  ngOnInit() {
    this.documentTypesList.forEach(element => {
      if (element.checked)
        this.checkedList.push(element.name)
    });
    if (this.checkedList.length > 0) {
      this.checkedList.forEach((element, index) => {
        if (this.selectedCheckedList.length < 3) {
          this.selectedCheckedList.push(element);
        }
      });
      this.hiddenItems = this.checkedList.length - this.initialLength;
    }
  }

  getSelectedValue(status: Boolean, value: String) {
    if (status) {
      this.checkedList.push(value);
      if (this.selectedCheckedList.length < 3) {
        this.selectedCheckedList.push(value);
      }
    } else {
      var index = this.checkedList.indexOf(value);
      this.checkedList.splice(index, 1);

      var index1 = this.selectedCheckedList.indexOf(value);
      if (index1 >= 0) {
        this.selectedCheckedList.splice(index1, 1);
      }

      if (this.selectedCheckedList.length < 3 && this.checkedList[2]) {
        this.selectedCheckedList.push(this.checkedList[2]);
      }
    }

    this.hiddenItems = this.checkedList.length - this.initialLength;
    this.currentSelected = { checked: status, name: value };

    //share checked list
    this.shareCheckedlist();

    //share individual selected item
    this.shareIndividualStatus();
  }

  shareCheckedlist() {
    this.shareCheckedList.emit(this.checkedList);
  }

  shareIndividualStatus() {
    this.shareIndividualCheckedList.emit(this.currentSelected);
  }
}