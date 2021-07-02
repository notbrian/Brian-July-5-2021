import React, { useEffect, useState } from "react";
import logo from "./logo.svg";
import "./App.css";
import { w3cwebsocket as W3CWebSocket } from "websocket";
import ToggleIcon from "./assets/toggleicon.svg";
import KillIcon from "./assets/killicon.svg";

const client = new W3CWebSocket("wss://www.cryptofacilities.com/ws/v1");

type Order = [price: number, size: number];

function formatNumber(num: number) {
  return num.toLocaleString();
}

function formatNumberDecimals(num: number) {
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function App() {
  const [buyData, setBuyData] = useState<Order[]>([]);
  const [sellData, setSellData] = useState<Order[]>([]);
  useEffect(() => {
    client.onopen = () => {
      console.log("WebSocket Client Connected");
      client.send(
        JSON.stringify({
          event: "subscribe",
          feed: "book_ui_1",
          product_ids: ["PI_XBTUSD"],
        })
      );
    };

    client.onmessage = (message) => {
      const data = JSON.parse(message.data as string);
      if (data.feed === "book_ui_1_snapshot") {
        console.log(data);
        setBuyData(data.asks.splice(0, 16).reverse());
        setSellData(data.bids.splice(0, 16).reverse());
        //TODO: processing of totals here
      }
    };
  }, []);
  return (
    <div className="App">
      <div id="orderbook">
        <div id="orderbook-header">
          <p style={{ display: "block" }}>Order Book</p>
          <select id="grouping-dropdown" name="grouping">
            <option value="0.5">Group 0.50</option>
            <option value="1">Group 1</option>
            <option value="2.5">Group 2.5</option>
          </select>
        </div>
        <div id="orderbook-data">
          <div className="orderbook-side">
            <table>
              <tbody>
                <tr>
                  <th className="orderbook-table-header">TOTAL</th>
                  <th className="orderbook-table-header">SIZE</th>
                  <th className="orderbook-table-header">PRICE</th>
                </tr>
                {buyData.map((data, i) => {
                  return (
                    <tr key={i}>
                      <td>{formatNumber(data[0] * data[1])}</td>
                      <td>{formatNumber(data[1])}</td>
                      <td className="price-buy">
                        {formatNumberDecimals(data[0])}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="orderbook-side">
            <table>
              <tbody>
                <tr>
                  <th className="orderbook-table-header">PRICE</th>
                  <th className="orderbook-table-header">SIZE</th>
                  <th className="orderbook-table-header">TOTAL</th>
                </tr>
                {sellData.map((data, i) => {
                  return (
                    <tr key={i}>
                      <td className="price-sell">
                        {formatNumberDecimals(data[0])}
                      </td>
                      <td>{formatNumber(data[1])}</td>
                      <td>{formatNumber(data[0] * data[1])}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div id="feed-buttons">
          <button className="feed-btn" id="toggle-btn">
            <img src={ToggleIcon} className="btn-icon" />
            Toggle Feed
          </button>
          <button className="feed-btn" id="kill-btn">
            <img src={KillIcon} className="btn-icon" />
            Kill Feed
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
