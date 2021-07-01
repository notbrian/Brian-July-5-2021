import React, { useEffect, useState } from "react";
import logo from "./logo.svg";
import "./App.css";
import { w3cwebsocket as W3CWebSocket } from "websocket";

const client = new W3CWebSocket("wss://www.cryptofacilities.com/ws/v1");

type Order = [price: number, size: number];

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
      }
    };
  }, []);
  return (
    <div className="App">
      <div className="center-container">
        <div id="orderbook">
          <div id="orderbook-header">
            <p style={{ display: "block" }}>Order Book</p>
            <select id="grouping-dropdown" name="grouping">
              <option value="0.5">Group 0.5</option>
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
                        <td>{(data[0] * data[1]).toLocaleString()}</td>
                        <td>{data[1].toLocaleString()}</td>
                        <td className="price-buy">
                          {data[0].toLocaleString()}
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
                          {data[0].toLocaleString()}
                        </td>
                        <td>{data[1].toLocaleString()}</td>
                        <td>{(data[0] * data[1]).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div id="feed-buttons">
            <button className="feed-btn" id="toggle-btn">
              Toggle Feed
            </button>
            <button className="feed-btn" id="kill-btn">
              Kill Feed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
