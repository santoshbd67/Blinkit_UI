import { Injectable } from "@angular/core";
import { Chart, Colors } from "chart.js";
import { environment } from './../../environments/environment';
import { APIConfig } from './../config/api-config';
import { HttpClient } from '@angular/common/http';
import * as uuid from 'uuid';
import { catchError, map, tap } from 'rxjs/operators';
import { of, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: "root"
})
export class ChartNewService {
  apiConfig: any = APIConfig;

  constructor(private http: HttpClient) {
    // Chart.register(Colors)
  }

  getChartDetailsForSingleAxis(chartData) {
    const renderingChart = new Chart(chartData.id, {
      type: chartData.type,
      data: {
        labels: chartData.data.labels,
        datasets: chartData.data.datasets
      },
      options: {
        hover: { mode: null },
        responsive: true,
        maintainAspectRatio: false,
        legend: {
          display: true,
          position: chartData.legendPosition || "bottom"
        },
        title: {
          display: true,
          text: chartData.name
        },
        scales: this.getScale(chartData)
      }
    });

    return renderingChart;
  }

  getPieChart(chartData) {
    const renderingChart = new Chart(chartData.id, {
      type: chartData.type,
      data: chartData.data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        legend: {
          position: 'right',
        },
        title: {
          display: true,
          text: chartData.name
        }
      },
    });

    return renderingChart;
  }

  getScale(chartData) {
    let scale;
    if (chartData.type == 'bar') {
      if (chartData.rescale && chartData.rescale == true) {
        scale = {
          xAxes: [{
            stacked: true,
            scaleLabel: {
              display: true,
              labelString: chartData.xLabel
            }
          }],
          yAxes: [{
            ticks: {
              suggestedMin: 80,
              suggestedMax: 100
            },
            scaleLabel: {
              display: true,
              labelString: chartData.yLabel
            }
          }]
        }
      }
      else {
        scale = {
          xAxes: [{
            stacked: true,
            scaleLabel: {
              display: true,
              labelString: chartData.xLabel
            }
          }],
          yAxes: [{
            stacked: true,
            scaleLabel: {
              display: true,
              labelString: chartData.yLabel
            }
          }]
        }
      }
    }
    else {
      scale = {
        xAxes: [
          {
            scaleLabel: {
              display: true,
              labelString: chartData.xLabel
            }
          }
        ],
        yAxes: [
          {
            scaleLabel: {
              display: true,
              labelString: chartData.yLabel
            }
          }
        ]
      }
    }

    return scale
  }

  getChartsData(chartObj) {
    if (chartObj && chartObj.defaultData) {
      delete chartObj.defaultData;
    }
    const payload = {
      id: 'api.charts.getChartsData',
      ver: '1.0',
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: chartObj
    };
    let dataURL = environment.baseAPI + this.apiConfig.API.getChartsData;
    return this.http.post(dataURL, payload, {}).pipe(
      catchError(this.handleError('getChartsData', null)));
  }

  updateChartsData(updatedChartsData, calledFrom?) {

    const payload = {
      id: 'api.charts.updateChartsData',
      ver: '1.0',
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: {
        updatedChartsData: updatedChartsData,
        calledFrom: calledFrom ? calledFrom : null,
        token: localStorage.getItem("token")
      }
    };
    let dataURL = environment.baseAPI + this.apiConfig.API.updateChartsData;
    return this.http.post(dataURL, payload, {}).pipe(
      catchError(this.handleError('updateChartsData', null)));
  }

  getChartConfigs(filter, tabId) {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log(`Current TimeZone is ${timeZone}`);

    const payload = {
      id: 'api.charts.getChartConfigs',
      ver: '2.0',
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: { filter, tabId, timeZone }
    };
    let dataURL = environment.baseAPI + this.apiConfig.API.getChartConfigs;
    return this.http.post(dataURL, payload, {}).pipe(
      catchError(this.handleError('getChartConfigs', null)));
  }

  bulkUpdateCharts(updatedCharts) {
    const payload = {
      id: 'api.charts.bulkUpdateCharts',
      ver: '2.0',
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: {
        updatedChartsData: updatedCharts,
        token: localStorage.getItem("token")
      }
    };
    let dataURL = environment.baseAPI + this.apiConfig.API.bulkUpdateCharts;
    return this.http.post(dataURL, payload, {}).pipe(
      catchError(this.handleError('bulkUpdateCharts', null)));
  }

  getVendorsList() {
    const payload = {
      id: 'api.charts.getVendorsList',
      ver: '2.0',
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: { token: localStorage.getItem("token") }
    };
    let dataURL = environment.baseAPI + this.apiConfig.API.getVendorsList;
    return this.http.post(dataURL, payload, {}).pipe(
      catchError(this.handleError('getVendorsList', null)));
  }

  getBillingStatesList() {
    const payload = {
      id: 'api.charts.getBillingStatesList',
      ver: '2.0',
      ts: this.generateTimestamp(),
      params: {
        msgid: uuid.v4()
      },
      request: { token: localStorage.getItem("token") }
    };
    let dataURL = environment.baseAPI + this.apiConfig.API.getBillingStatesList;
    return this.http.post(dataURL, payload, {}).pipe(
      catchError(this.handleError('getBillingStatesList', null)));
  }

  generateTimestamp() {
    return Math.round(new Date().getTime() / 1000);
  }

  // Handle errors
  handleError(operation = 'operation', result?) {
    return (error: any) => {
      return of(error);
    };
  }
}
