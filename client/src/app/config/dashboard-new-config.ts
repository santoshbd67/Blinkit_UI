export const DashboardNewConfig = {
    defaultMetrics: [],
    summaries: true,
    ranges: true,
    vendorMetrics: true,
    timeLineData: true,
    timeLineOverallScoreConfidence: true,
    totalProcessed: true,
    numberOfGrids: 2,
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
            "index": 2,
            "chartId": "document_count_by_exception",
            "type": "doughnut",
            "name": "Document Count by Exception",
            "colSpan": 1,
            "enabled": true,
            "defaultData": {
                "labels": ["MANDATORY FIELD MISSING", "ERROR IN INVOICE", "OTHERS"],
                "datasets": [
                    {
                        "label": "Document Count by Exception",
                        "data": [300, 50, 100],
                        "backgroundColor": ["rgb(255, 99, 132,0.6)", "rgb(54, 162, 235,0.6)", "rgb(255, 205, 86,0.6)"]
                    }
                ]
            },
            "chartTab": "POSTING",
        },
        {
            "index": 1,
            "chartId": "document_count_by_date_posting_status",
            "xAxisLabel": "Date",
            "yAxisLabel": "Document Count",
            "type": "bar",
            "name": "Document Count by Date",
            "colSpan": 2,
            "enabled": true,
            "defaultData": {
                "labels": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
                "datasets": [
                    {
                        "label": "Total Document Count",
                        "data": [220, 160, 120, 200, 300, 125, 323, 345, 190, 155],
                        "borderWidth": 1,
                        "backgroundColor": "rgba(232, 218, 239, 0.8)",
                        "borderColor": "#7D3C98"
                    },
                    {
                        "label": "Review Completed Documents",
                        "data": [120, 120, 80, 190, 110, 100, 200, 231, 150, 120],
                        "borderWidth": 1,
                        "backgroundColor": "rgba(236, 112, 99,0.8)",
                        "borderColor": "#D4AC0D"
                    }
                ]
            },
            "chartTab": "POSTING"
        },
        {
            "index": 6,
            "chartId": "scatterChart",
            "type": "scatter",
            "xAxisLabel": "Month",
            "yAxisLabel": "Accuracy",
            "name": "Accuracy By Month",
            "colSpan": 1,
            "enabled": false,
            "defaultData": {
                "datasets": [
                    {
                        "label": "Accuracy",
                        "data": [
                            { "x": 1, "y": 85 },
                            { "x": 2, "y": 92.5 },
                            { "x": 3, "y": 87 },
                            { "x": 4, "y": 78.9 }
                        ],
                        "borderWidth": 1,
                        "backgroundColor": "rgba(218, 247, 166, 0.8)",
                        "borderColor": "#7D3C98"
                    }
                ]
            },
            "chartTab": "POSTING"
        },
        {
            "index": 5,
            "chartId": "PolarChart",
            "type": "polarArea",
            "name": "Status wise Distribution",
            "colSpan": 1,
            "enabled": false,
            "defaultData": {
                "labels": ["Review", "Deleted", "Review Completed"],
                "datasets": [
                    {
                        "label": "My First Dataset",
                        "data": [300, 50, 100],
                        "backgroundColor": ["rgb(255, 99, 132,0.6)", "rgb(54, 162, 235,0.6)", "rgb(255, 205, 86,0.6)"]
                    }
                ]
            },
            "chartTab": "POSTING"
        },
        {
            "index": 4,
            "chartId": "document_count_by_billing_unit",
            "type": "doughnut",
            "name": "Document Count by Billing unit",
            "colSpan": 1,
            "enabled": true,
            "defaultData": {
                "labels": ["Review", "Deleted", "Review Completed"],
                "datasets": [
                    {
                        "label": "My First Dataset",
                        "data": [300, 50, 100],
                        "backgroundColor": ["rgb(255, 99, 132,0.6)", "rgb(54, 162, 235,0.6)", "rgb(255, 205, 86,0.6)"]
                    }
                ]
            },
            "chartTab": "EXTRACTION"
        },
        {
            "index": 3,
            "chartId": "document_ace_count_by_date",
            "xAxisLabel": "Date",
            "yAxisLabel": "Document Uploaded/ACE Count",
            "type": "line",
            "name": "Document Uploaded/ACE Count by Date",
            "colSpan": 2,
            "enabled": true,
            "defaultData": {
                "labels": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
                "datasets": [
                    {
                        "label": "Total Document Count",
                        "data": [220, 160, 120, 200, 300, 125, 323, 345, 190, 155],
                        "borderWidth": 1,
                        "backgroundColor": "rgba(232, 218, 239, 0.8)",
                        "borderColor": "#7D3C98"
                    },
                    {
                        "label": "Review Completed Documents",
                        "data": [120, 120, 80, 190, 110, 100, 200, 231, 150, 120],
                        "borderWidth": 1,
                        "backgroundColor": "rgba(236, 112, 99,0.8)",
                        "borderColor": "#D4AC0D"
                    }
                ]
            },
            "chartTab": "EXTRACTION"
        },
        {
            "index": 2,
            "chartId": "cum_ace_percentage_by_date",
            "xAxisLabel": "Date",
            "yAxisLabel": "Cum ACE %",
            "type": "line",
            "name": "Cummulative ACE Percentage by Date",
            "colSpan": 2,
            "enabled": true,
            "defaultData": {
                "labels": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
                "datasets": [
                    {
                        "label": "Total Document Count",
                        "data": [220, 160, 120, 200, 300, 125, 323, 345, 190, 155],
                        "borderWidth": 1,
                        "backgroundColor": "rgba(232, 218, 239, 0.8)",
                        "borderColor": "#7D3C98"
                    },
                    {
                        "label": "Review Completed Documents",
                        "data": [120, 120, 80, 190, 110, 100, 200, 231, 150, 120],
                        "borderWidth": 1,
                        "backgroundColor": "rgba(236, 112, 99,0.8)",
                        "borderColor": "#D4AC0D"
                    }
                ]
            },
            "chartTab": "EXTRACTION"
        },
        {
            "index": 1,
            "chartId": "document_count_by_hour",
            "xAxisLabel": "Hour of Day",
            "yAxisLabel": "Average Document Count",
            "type": "bar",
            "name": "Average Documents Uploaded",
            "colSpan": 1,
            "enabled": true,
            "defaultData": {
                "labels": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
                "datasets": [
                    {
                        "label": "Document Count by Hour",
                        "data": [22, 16, 12, 2, 0, 8, 3, 3, 2, 6, 25, 29, 47, 44, 32, 23, 14, 22, 21, 25, 14, 8, 6, 6],
                        "borderWidth": 1,
                        "backgroundColor": "rgba(232, 218, 239, 0.8)",
                        "borderColor": "#7D3C98"
                    },
                    {
                        "label": "Months Set 2",
                        "data": [2, 1, 10, 12, 10, 18, 13, 13, 12, 16, 5, 9, 7, 4, 2, 3, 4, 12, 1, 5, 4, 18, 16, 16],
                        "borderWidth": 1,
                        "backgroundColor": "rgba(232, 218, 239,0.8)",
                        "borderColor": "#D4AC0D"
                    }
                ]
            },
            "chartTab": "EXTRACTION"
        },
        {
            "index": 0,
            "chartId": "status_wise_document_count",
            "type": "pie",
            "name": "Status wise Document Count",
            "colSpan": 1,
            "enabled": true,
            "defaultData": {
                "labels": ["Review", "Deleted", "Review Completed"],
                "datasets": [
                    {
                        "label": "My First Dataset",
                        "data": [300, 50, 100],
                        "backgroundColor": ["rgb(255, 99, 132,0.6)", "rgb(54, 162, 235,0.6)", "rgb(255, 205, 86,0.6)"]
                    }
                ]
            },
            "chartTab": "EXTRACTION"
        }
    ]
};