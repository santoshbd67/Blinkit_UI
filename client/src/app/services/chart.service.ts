import { Injectable } from "@angular/core";
import { Chart } from "chart.js";
@Injectable({
  providedIn: "root"
})
export class ChartService {
  constructor() { }
  // get chart details service
  getChartDetailsWithMultipleAxis(chartData) {
    return new Chart(chartData.id, {
      type: chartData.type,
      data: {
        labels: chartData.xAxisLabel,
        datasets: chartData.data
      },
      options: {
        hover: { mode: null },
        responsive: true,
        maintainAspectRatio: true,
        legend: {
          display: true,
          position: chartData.legendPosition || "bottom"
        },
        scales: {
          xAxes: [
            {
              scaleLabel: {
                display: true,
                labelString: chartData.xLabel
              },
              ticks: {
                beginAtZero: true,
                stepSize: 1,
                min: 0,
                suggestedMin: 0
              }
            }
          ],
          yAxes: [
            {
              scaleLabel: {
                display: true,
                labelString: chartData.yLabel
              },
              ticks: {
                beginAtZero: true,
                stepSize: 10,
                precision: 0,
                min: 0,
                suggestedMin: 0
              }
            }
          ]
        }
      }
    });
  }

  getChartDetailsForSingleAxis(chartData) {
    return new Chart(chartData.id, {
      type: chartData.type,
      data: {
        labels: chartData.xAxisLabel,
        datasets: chartData.data
      },
      options: {
        hover: { mode: null },
        responsive: true,
        maintainAspectRatio: true,
        legend: {
          display: true,
          position: chartData.legendPosition || "bottom"
        },
        scales: {
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
                labelString: chartData.yLabel1
              },
              ticks: {
                beginAtZero: true,
                precision: 0,
                min: 0,
                suggestedMin: 0
              }
            }
          ]
        }
      }
    });
  }

  getPieChart(chartData) {
    return new Chart(chartData.id, {
      type: chartData.type,
      data: chartData.data,
      options: chartData.options
    });
  }
}
