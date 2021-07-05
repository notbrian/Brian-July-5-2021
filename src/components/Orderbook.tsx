import React, { useEffect, useState } from "react";

import { IMessageEvent, w3cwebsocket as W3CWebSocket } from "websocket";
import ToggleIcon from "../assets/toggleicon.svg";
import KillIcon from "../assets/killicon.svg";
import {
  formatNumber,
  formatNumberDecimals,
  formatData,
  calculateTotals,
  handleNewData,
  groupData,
  Order,
} from "./helpers";

// Starts a new WebSocket
const client = new W3CWebSocket("wss://www.cryptofacilities.com/ws/v1");

const buffer = new Set<IMessageEvent>();

const Orderbook = () => {
  const [buyData, setBuyData] = useState<Order[]>([]);
  const [sellData, setSellData] = useState<Order[]>([]);

  // Seperate our grouped data from our master data to ensure accuracy when switching grouping modes
  // This is the data that is actually rendered
  const [groupedBuyData, setGroupedBuyData] = useState<Order[]>([]);
  const [groupedSellData, setGroupedSellData] = useState<Order[]>([]);

  const [market, setMarket] = useState("PI_XBTUSD");
  const [grouping, setGrouping] = useState(0.5);

  const [kill, setKill] = useState(false);

  useEffect(() => {
    // Subscribe to the default market (XBTUSD) when the socket connects
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

    // Catch any errors directly related to the socket
    client.onerror = (error) => {
      console.log(error);
    };
  }, [market]);

  useEffect(() => {
    // Process messages in intervals of 50ms to prevent overload
    const flush = () => {
      buffer.forEach((message) => processMessage(message));
      buffer.clear();
    };

    let timer = setInterval(flush, 50);

    client.onmessage = (message) => {
      buffer.add(message);
    };

    const processMessage = (message: IMessageEvent) => {
      try {
        const data = JSON.parse(message.data as string);
        // If the message received isnt an event update, it must be a snapshot or a delta
        if (!data.event) {
          let buy = data.bids;
          let sell = data.asks;
          // Format data to the Order interface structure
          buy = formatData(buy);
          sell = formatData(sell);

          // If its the first snapshot, update the master data
          if (data.feed === "book_ui_1_snapshot") {
            setBuyData(buy);
            setSellData(sell);
          } else {
            // Else, assume its a delta update
            if (buy.length > 0) {
              // Merge the new data with our existing data and update the state
              // Pass in false as the third argument for descending sorting
              setBuyData(handleNewData(buy, buyData, false));
            }
            if (sell.length > 0) {
              setSellData(handleNewData(sell, sellData, true));
            }
          }
        }
        // Catch if its not a snapshot or delta and log it to the console
        else {
          console.log(data);
        }
      } catch (e) {
        // Catch any errors in this process and log it to the console
        console.log(e);
      }
    };

    return () => {
      clearInterval(timer);
    };
  }, [buyData, sellData]);

  // When the market changes from BTC to ETH, change the grouping correspondingly
  useEffect(() => {
    setGrouping(market === "PI_XBTUSD" ? 0.5 : 0.05);
  }, [market]);

  // When the master data is updated, update the grouped data and calculate the totals
  useEffect(() => {
    setGroupedBuyData(calculateTotals(groupData(buyData, grouping)));
  }, [buyData, grouping]);

  useEffect(() => {
    setGroupedSellData(calculateTotals(groupData(sellData, grouping)));
  }, [sellData, grouping]);

  // Function to handle toggling between the two markets
  const toggleFeed = () => {
    // Unsub from the current market
    client.send(
      JSON.stringify({
        event: "unsubscribe",
        feed: "book_ui_1",
        product_ids: [market],
      })
    );

    // Sub to the other one
    client.send(
      JSON.stringify({
        event: "subscribe",
        feed: "book_ui_1",
        product_ids: [market === "PI_XBTUSD" ? "PI_ETHUSD" : "PI_XBTUSD"],
      })
    );

    buffer.clear();
    setMarket(market === "PI_XBTUSD" ? "PI_ETHUSD" : "PI_XBTUSD");
  };

  const handleGroupingSelect = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setGrouping(parseFloat(event.target.value));
  };

  const killFeed = () => {
    // Simulates a error on the socket
    client.onerror(new Error("Test error"));
    // Sends a data object that will fail and get caught
    client.onmessage({ data: "error" });

    // Unsubs and subs the market on subsequent presses
    if (!kill) {
      client.send(
        JSON.stringify({
          event: "unsubscribe",
          feed: "book_ui_1",
          product_ids: [market],
        })
      );
    } else {
      client.send(
        JSON.stringify({
          event: "subscribe",
          feed: "book_ui_1",
          product_ids: [market],
        })
      );
    }

    setKill(!kill);
  };

  return (
    <div id="container">
      <div id="header">
        <p style={{ display: "block" }}>Order Book</p>
        <select
          id="grouping-dropdown"
          name="grouping"
          value={grouping}
          onChange={handleGroupingSelect}
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
      <div id="orderbook">
        <div className="orderbook-side">
          <table>
            <tbody>
              <tr>
                <th className="orderbook-title">TOTAL</th>
                <th className="orderbook-title">SIZE</th>
                <th className="orderbook-title">PRICE</th>
              </tr>
              {groupedBuyData.slice(0, 15).map(({ price, size, total }, i) => {
                return (
                  <tr key={i}>
                    <td>{total ? formatNumber(total) : ""}</td>
                    <td>{formatNumber(size)}</td>
                    <td className="price-buy">{formatNumberDecimals(price)}</td>
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
                <th className="orderbook-title">PRICE</th>
                <th className="orderbook-title">SIZE</th>
                <th className="orderbook-title">TOTAL</th>
              </tr>
              {groupedSellData.slice(0, 15).map(({ price, size, total }, i) => {
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
        <button className="feed-btn" id="kill-btn" onClick={killFeed}>
          <img src={KillIcon} alt="Kill feed button." className="btn-icon" />
          Kill Feed
        </button>
      </div>
    </div>
  );
};

export default Orderbook;
