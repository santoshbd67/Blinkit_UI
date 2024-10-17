export const DashboardConfig = {
  defaultMetrics: [],
  summaries: true,
  ranges: true,
  vendorMetrics: true,
  dashboardSummaries: [
    {
      overallSummary: [
        {
          object: "summaries",
          type: "totalDocumentsSubmitted",
          label: "Submitted",
          format: "integer",
          group: "invoices",
          info: "Total invoices submitted for the selected period."
        },
        {
          object: "summaries",
          type: "totalDocumentsProcessed",
          label: "Processed",
          format: "integer",
          group: "invoices"
        },
        {
          object: "summaries",
          type: "failedDocumentsCount",
          label: "Failed",
          format: "integer",
          group: "invoices"
        },
        {
          object: "summaries",
          type: "totalAmount",
          label: "Value of invoices",
          prefix: "$",
          format: "number",
          group: "amount"
        },
        {
          object: "summaries",
          type: "avgAmount",
          label: "Average Value",
          prefix: "$",
          format: "number",
          group: "amount"
        },
        {
          object: "globalAverages",
          type: "avgAmount",
          label: "Average Value for all invoices",
          prefix: "$",
          format: "number",
          group: "amount"
        },
        {
          object: "summaries",
          type: "totalPageCount",
          label: " pages",
          format: "integer",
          group: "pages"
        },
        {
          object: "summaries",
          type: "avgPageCount",
          label: "Average  number of pages",
          format: "number",
          group: "pages"
        },
        {
          object: "globalAverages",
          type: "avgPageCount",
          label: "Average number of pages for all invoices",
          format: "number",
          group: "pages"
        }
      ],
      overallSummaryOthers: [
        {
          object: "summaries",
          type: "totalProcessingTime",
          label: "Processing Time",
          format: "time"
        },
        {
          object: "summaries",
          type: "avgProcessingTime",
          label: "Average Processing Time",
          format: "time"
        },
        {
          object: "globalAverages",
          type: "avgProcessingTime",
          label: "Average Processing Time for all invoices",
          format: "time"
        }
      ],
      automationSummary: [
        {
          object: "summaries",
          type: "totalDocumentsProcessed",
          label: "Processed",
          format: "integer"
        },
        {
          object: "summaries",
          type: "totalDocumentsAutoProcessed",
          label: "Invoices with STP",
          format: "integer"
        },
        {
          object: "summaries",
          type: "totalDocumentsManuallyProcessed",
          label: "Manually processed",
          format: "integer"
        }
      ],
      extractionEngineSummary: [
        {
          object: "summaries",
          type: "totalCorrectionTime",
          label: "Manual correction time",
          format: "time"
        },
        {
          object: "summaries",
          type: "avgCorrectionTime",
          label: "Average Manual correction time",
          format: "time"
        },
        {
          object: "globalAverages",
          type: "avgCorrectionTime",
          label: "Average Correction Time for all invoices",
          format: "time"
        }
      ],
      extractionSummary: [
        {
          object: "summaries",
          type: "totalDocumentsExtracted",
          label: "Extracted",
          format: "integer"
        },
        {
          object: "summaries",
          type: "totalDocumentsManuallyProcessed",
          label: " Manually corrected",
          format: "integer"
        },
        {
          object: "summaries",
          type: "totalDocumentsExtractionFailed",
          label: "Extraction failed",
          format: "integer"
        }
      ],
      extractionSummaryOthers: [
        {
          object: "summaries",
          type: "avgAccuracy",
          label: "Average Accuracy",
          format: "number"
        },
        {
          object: "globalAverages",
          type: "avgAccuracy",
          label: "Average Accuracy for all invoices",
          format: "number"
        }
      ]
    }
  ],
  masterDataOfSelectedPeriods: [
    {
      name: "Last 24 Hours",
      value: "LAST_24_HOURS"
    },
    {
      name: "Last 7 Days",
      value: "LAST_7_DAYS"
    },
    {
      name: "Last 14 Days",
      value: "LAST_14_DAYS"
    },
    {
      name: "Last 4 Weeks",
      value: "LAST_4_WEEKS"
    },
    {
      name: "Last 12 Months ",
      value: "LAST_12_MONTHS"
    }
  ],

  dashboardCharts: [
    {
      index: 0,
      chartId: "vendorVrTotalDocumentsAutoProcessed",
      yAxis_1: "Auto Posted",
      yAxisLabel: "Vendors",
      xAxisLabel: "Posted",
      yAxis_2: "Manually Posted",
      borderColor_1: "#79BA50",
      backgroundColor_1: "#79BA50",
      borderColor_2: "#52C1EE",
      backgroundColor_2: "#52C1EE",
      type: "horizontalBar",
      multipleAxis: "true",
      noOfBar: "2",
      suffix: "",
      chartInfo: "Vendor Invoices Auto and Manual"
    },
    {
      index: 1,
      chartId: "vendorVsManualTimeSpent",
      yAxis_1: "Vendors",
      xAxisLabel: "Manual time spent (seconds)",
      yAxis_2: "",
      yAxisLabel: "",
      borderColor_1: "#79BA50",
      backgroundColor_1: "#79BA50",
      borderColor_2: "#52C1EE",
      backgroundColor_2: "#52C1EE",
      type: "horizontalBar",
      multipleAxis: "false",
      noOfBar: "1",
      suffix: "",
      chartInfo: ""
    },
    {
      index: 2,
      chartId: "accuracyVsTotalInvoices",
      yAxis_1: " Invoices",
      xAxisLabel: "Accuracy (%)",
      yAxis_2: "",
      yAxisLabel: "",
      borderColor_1: "#79BA50",
      backgroundColor_1: "#79BA50",
      borderColor_2: "#52C1EE",
      backgroundColor_2: "#52C1EE",
      type: "bar",
      multipleAxis: "false",
      noOfBar: "1",
      suffix: "%",
      chartInfo: "ACCURACY % VS INVOICES"
    },
    {
      index: 3,
      chartId: "errorCountVsTotalInvoices",
      yAxis_1: " Invoices",
      xAxisLabel: " Fields manually corrected",
      yAxis_2: "",
      yAxisLabel: "",
      borderColor_1: "#79BA50",
      backgroundColor_1: "#79BA50",
      borderColor_2: "#52C1EE",
      backgroundColor_2: "#52C1EE",
      type: "bar",
      multipleAxis: "false",
      noOfBar: "1",
      suffix: "",
      chartInfo: ""
    },
    {
      index: 4,
      chartId: "vendorVsAverageAccuracy",
      yAxis_1: "Vendors (Invoices Reviewed)",
      xAxisLabel: "Average Accuracy (%)",
      yAxis_2: "",
      yAxisLabel: "",
      borderColor_1: "#79BA50",
      backgroundColor_1: "#79BA50",
      borderColor_2: "#52C1EE",
      backgroundColor_2: "#52C1EE",
      type: "horizontalBar",
      multipleAxis: "false",
      noOfBar: "1",
      suffix: "%",
      chartInfo: "AVERAGE ACCURACY FOR REVIEWED INVOICES"
    },
    {
      index: 5,
      chartId: "vendorVsFieldsManuallyCorrected",
      yAxis_1: "Vendors",
      xAxisLabel: "Fields Manually Corrected",
      yAxis_2: "",
      yAxisLabel: "",
      borderColor_1: "#79BA50",
      backgroundColor_1: "#79BA50",
      borderColor_2: "#52C1EE",
      backgroundColor_2: "#52C1EE",
      type: "horizontalBar",
      multipleAxis: "false",
      noOfBar: "1",
      suffix: "",
      chartInfo: ""
    },
    {
      index: 6,
      chartId: "invoiceCountsPerVendor",
      yAxis_1: "Successfully Processed",
      xAxisLabel: "Total Invoices",
      yAxisLabel: "Vendors (Invoices Submitted)",
      yAxis_2: "Processing in progress",
      yAxis_3: "Processing Failed",
      borderColor_1: "#79BA50 ",
      backgroundColor_1: "#79BA50 ",
      borderColor_2: "#52C1EE",
      backgroundColor_2: "#52C1EE",
      borderColor_3: "#596869",
      backgroundColor_3: "#596869",
      type: "horizontalBar",
      multipleAxis: "true",
      noOfBar: "3",
      suffix: "",
      chartInfo: "Vendor Invoice Performance"
    }
  ]
};
