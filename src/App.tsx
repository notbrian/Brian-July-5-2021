import React, { useEffect, useState } from "react";
import "./App.css";
import { w3cwebsocket as W3CWebSocket } from "websocket";
import ToggleIcon from "./assets/toggleicon.svg";
import KillIcon from "./assets/killicon.svg";
import _ from "underscore";

const client = new W3CWebSocket("wss://www.cryptofacilities.com/ws/v1");

type RawOrder = [price: number, size: number];
interface Order {
  price: number;
  size: number;
  total?: number;
}

function formatNumber(num: number) {
  return num.toLocaleString();
}

function formatNumberDecimals(num: number) {
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatData(data: RawOrder[]) {
  // Map to order structure
  let formatted: Order[] = data.map((order: RawOrder) => ({
    price: order[0],
    size: order[1],
  }));

  return formatted;
}
function calculateTotals(data: Order[]) {
  // Calculate total
  data.reduce((acc: number, order: Order) => {
    const total = acc + order.size;
    order.total = total;
    return total;
  }, 0);
}

function handleNewData(
  newData: Order[],
  existingData: Order[],
  ascending: boolean = false
) {
  // Create a clone of the current state
  let newState = [...existingData];
  // Loop over every new delta
  newData.forEach((delta: Order) => {
    // Find if the price is already in the book

    const matchingPrice = newState.findIndex((order: Order) => {
      return order.price === delta.price;
    });

    // If found,
    if (matchingPrice !== -1) {
      // Remove it if 0 size
      if (delta.size === 0) {
        newState.splice(matchingPrice, 1);
      }
      // Else update size
      else {
        newState[matchingPrice].size = delta.size;
      }
    }

    // If its a new price level,
    else {
      if (delta.size > 0) {
        // Add it to our cloned data
        newState.push(delta);
        // Then sort it
        newState.sort((a: Order, b: Order) => {
          if (a.price < b.price) {
            return ascending ? -1 : 1;
          }
          if (a.price > b.price) {
            return ascending ? 1 : -1;
          }
          return 0;
        });
        // Then calculate the new totals
        calculateTotals(newState);
      }
    }
  });

  return newState;
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

      if (!data.event) {
        let buy = data.bids;
        let sell = data.asks;
        buy = formatData(buy);
        sell = formatData(sell);

        if (data.feed === "book_ui_1_snapshot") {
          // Map to object structure and calculate totals
          calculateTotals(buy);
          calculateTotals(sell);

          // TODO: grouping

          setBuyData(buy);
          setSellData(sell);
        } else {
          if (buy.length > 0) {
            setBuyData(handleNewData(buy, buyData, false));
          }

          if (sell.length > 0) {
            setSellData(handleNewData(sell, sellData, true));
          }
        }
      }
    };
  }, [buyData, sellData]);

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
                {buyData.slice(0, 15).map(({ price, size, total }, i) => {
                  return (
                    <tr key={i}>
                      <td>{total ? formatNumber(total) : ""}</td>
                      <td>{formatNumber(size)}</td>
                      <td className="price-buy">
                        {formatNumberDecimals(price)}
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
                {sellData.slice(0, 15).map(({ price, size, total }, i) => {
                  return (
                    <tr key={i}>
                      <td className="price-sell">
                        {formatNumberDecimals(price)}
                      </td>
                      <td>{formatNumber(size)}</td>
                      <td>{total ? formatNumber(total) : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div id="feed-buttons">
          <button className="feed-btn" id="toggle-btn">
            <img
              src={ToggleIcon}
              alt="Toggle feed button."
              className="btn-icon"
            />
            Toggle Feed
          </button>
          <button className="feed-btn" id="kill-btn">
            <img src={KillIcon} alt="Kill feed button." className="btn-icon" />
            Kill Feed
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
