import { Component, OnInit } from "@angular/core";

@Component({
  selector: "app-ready-post-cards",
  templateUrl: "./ready-post-cards.component.html",
  styleUrls: ["./ready-post-cards.component.scss"]
})
export class ReadyPostCardsComponent implements OnInit {
  readypost = [
    {
      size: "5",
      extraction: "55%",
      name: "Venders Name or Entity Name comes here...",
      price: "1,20,000/-",
      date: "01/08/2019",
      status: "ready for processing"
    },
    {
      size: "5",
      extraction: "55%",
      name: "Venders Name or Entity Name comes here...",
      price: "1,20,000/-",
      date: "01/08/2019",
      status: "ready for processing"
    },
    {
      size: "5",
      extraction: "55%",
      name: "Venders Name or Entity Name comes here...",
      price: "1,20,000/-",
      date: "01/08/2019",
      status: "ready for processing"
    },
    {
      size: "5",
      extraction: "55%",
      name: "Venders Name or Entity Name comes here...",
      price: "1,20,000/-",
      date: "01/08/2019",
      status: "ready for processing"
    }
  ];
  constructor() {}

  ngOnInit() {}
}
