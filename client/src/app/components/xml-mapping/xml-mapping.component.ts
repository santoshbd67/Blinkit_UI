import { Component, OnInit } from '@angular/core';
import { DataService } from 'src/app/services/data.service';

@Component({
  selector: 'app-xml-mapping',
  templateUrl: './xml-mapping.component.html',
  styleUrls: ['./xml-mapping.component.scss']
})
export class XmlMappingComponent implements OnInit {
  constructor(private dataService: DataService) {}
  mapId = 1;
  xmlMapping: any;
  xmlMapId: any;
  ngOnInit() {
    this.getXMLMapping();
  }

  getXMLMapping() {
    this.dataService.getXMLMapping(this.mapId).subscribe(
      res => {
        if (res && res.responseCode === 'OK' && res.result) {
          this.xmlMapping = res.result;
          this.convertObjectToArray();
        } else {
          this.dataService.showError(
            'Error while fetching XML Mapping',
            'Info'
          );
        }
      },
      err => {
        this.dataService.showError('Error while fetching XML Mapping', 'Info');
      }
    );
  }

  saveForm() {
    const payload = this.createPayload();
    this.dataService.updateXMLMapping(payload).subscribe(
      res => {
        if (res && res.responseCode === 'OK') {
          this.dataService.showSuccess(
            'successfully updated xml mapping',
            'success'
          );
        } else {
          this.dataService.showError(
            'error while updating XML mapping',
            'error'
          );
        }
      },
      err => {
        this.dataService.showError('error while updating XML mapping', 'error');
      }
    );
  }

  createPayload() {
    let payload: any = {};
    this.xmlMapping.forEach(each => {
      payload[each.key] = each.value.split(',');
    });

    payload.xmlMapId = this.xmlMapId;
    return payload;
  }
  convertObjectToArray() {
    const convertedObject: any[] = [];
    this.xmlMapId = this.xmlMapping.xmlMapId;
    // tslint:disable-next-line: forin
    for (let key in this.xmlMapping) {
      if (!['_id', 'xmlMapId', 'lastUpdatedOn'].includes(key)) {
        convertedObject.push({ key, value: this.xmlMapping[key] });
      }
    }
    this.xmlMapping = JSON.parse(JSON.stringify(convertedObject));
    const newValues = [];
    this.xmlMapping.forEach((each: { key: string; value: string[] }) => {
      const stringVal = each.value.join(',');
      newValues.push({ key: each.key, value: stringVal });
    });

    this.xmlMapping = JSON.parse(JSON.stringify(newValues));
  }
}
