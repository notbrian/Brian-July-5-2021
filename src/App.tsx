import React, { useEffect, useState } from "react";
import "./App.css";
import { w3cwebsocket as W3CWebSocket } from "websocket";
import ToggleIcon from "./assets/toggleicon.svg";
import KillIcon from "./assets/killicon.svg";
import { group } from "console";

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
  let clone = [...data];
  clone.reduce((acc: number, order: Order) => {
    const total = acc + order.size;
    order.total = total;
    return total;
  }, 0);

  return clone;
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
      }
    }
  });

  return newState;
}

const testDataXBT = [
  { price: 1, size: 50, total: 15 },
  // { price: 2, size: 100, total: 1215 },
  { price: 2.5, size: 100, total: 1215 },
  { price: 3, size: 150, total: 8895 },
  { price: 3.5, size: 150, total: 8895 },
  { price: 4, size: 200, total: 16515 },
  { price: 4.5, size: 250, total: 22457 },
  { price: 5, size: 300, total: 23487 },
  { price: 5.5, size: 350, total: 30674 },
  { price: 6.0, size: 400, total: 30674 },
  { price: 6.5, size: 450, total: 30674 },
  { price: 7.0, size: 500, total: 30674 },
];

const testDataETH = [
  { price: 0.05, size: 50, total: 15 },
  // { price: 2, size: 100, total: 1215 },
  { price: 0.1, size: 100, total: 1215 },
  { price: 0.15, size: 150, total: 8895 },
  { price: 0.2, size: 150, total: 8895 },
  { price: 0.25, size: 200, total: 16515 },
  { price: 0.3, size: 250, total: 22457 },
  { price: 0.35, size: 300, total: 23487 },
  { price: 0.4, size: 350, total: 30674 },
  { price: 0.45, size: 400, total: 30674 },
  { price: 0.5, size: 450, total: 30674 },
  { price: 0.55, size: 500, total: 30674 },
];

function groupData(data: Order[], groupingSize: number) {
  let result = data.reduce((acc: Order[], current: Order) => {
    if (
      acc.length > 0 &&
      Number(Math.abs(current.price - acc[acc.length - 1].price).toFixed(2)) <
        groupingSize
    ) {
      acc[acc.length - 1].size += current.size;
      return acc;
    }
    let clone = { ...current };

    if (groupingSize % 1 === 0) {
      clone.price = Math.floor(clone.price);
    }
    if (groupingSize % 0.1 === 0) {
      clone.price = Math.floor(clone.price * 10) / 10;
    }
    acc.push(clone);
    return acc;
  }, []);

  return result;
}
function App() {
  const [buyData, setBuyData] = useState<Order[]>([]);
  const [sellData, setSellData] = useState<Order[]>([]);

  const [groupedBuyData, setGroupedBuyData] = useState<Order[]>([]);
  const [groupedSellData, setGroupedSellData] = useState<Order[]>([]);

  const [market, setMarket] = useState("PI_XBTUSD");
  const [grouping, setGrouping] = useState(0.5);

  useEffect(() => {
    client.onopen = () => {
      console.log("WebSocket Client Connected");
      client.send(
        JSON.stringify({
          event: "subscribe",
          feed: "book_ui_1",
          product_ids: [market],
        })
      );
    };
  }, []);

  useEffect(() => {
    client.onmessage = (message) => {
      const data = JSON.parse(message.data as string);

      if (!data.event) {
        let buy = data.bids;
        let sell = data.asks;
        buy = formatData(buy);
        sell = formatData(sell);

        if (data.feed === "book_ui_1_snapshot") {
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

  useEffect(() => {
    setGrouping(market === "PI_XBTUSD" ? 0.5 : 0.05);
  }, [market]);

  useEffect(() => {
    setGroupedBuyData(calculateTotals(groupData(buyData, grouping)));
  }, [buyData, grouping]);

  useEffect(() => {
    setGroupedSellData(calculateTotals(groupData(sellData, grouping)));
  }, [sellData, grouping]);

  const toggleFeed = () => {
    client.send(
      JSON.stringify({
        event: "unsubscribe",
        feed: "book_ui_1",
        product_ids: [market],
      })
    );

    client.send(
      JSON.stringify({
        event: "subscribe",
        feed: "book_ui_1",
        product_ids: [market === "PI_XBTUSD" ? "PI_ETHUSD" : "PI_XBTUSD"],
      })
    );

    setMarket(market === "PI_XBTUSD" ? "PI_ETHUSD" : "PI_XBTUSD");
  };

  const handleGrouping = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setGrouping(parseFloat(event.target.value));
  };

  return (
    <div className="App">
      <div id="orderbook">
        <div id="orderbook-header">
          <p style={{ display: "block" }}>Order Book</p>
          <select
            id="grouping-dropdown"
            name="grouping"
            value={grouping}
            onChange={handleGrouping}
          >
            {market === "PI_XBTUSD" ? (
              <>
                <option value="0.5">Group 0.50</option>
                <option value="1">Group 1</option>
                <option value="2.5">Group 2.5</option>
              </>
            ) : (
              <>
                <option value="0.05">Group 0.05</option>
                <option value="0.1">Group 1</option>
                <option value="0.25">Group 0.25</option>
              </>
            )}
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
                {groupedBuyData
                  .slice(0, 15)
                  .map(({ price, size, total }, i) => {
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
                {groupedSellData
                  .slice(0, 15)
                  .map(({ price, size, total }, i) => {
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
          <button className="feed-btn" id="toggle-btn" onClick={toggleFeed}>
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
