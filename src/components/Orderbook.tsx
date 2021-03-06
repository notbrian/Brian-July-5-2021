import React, { useEffect, useRef, useState } from "react";

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
  calcDepth,
} from "./helpers";
import { useWindowSize } from "./useWindowSize";
import OrderbookSide from "./OrderbookSide";

// Starts a new WebSocket
const client = new W3CWebSocket("wss://www.cryptofacilities.com/ws/v1");

const Orderbook = () => {
  // Master data
  const [buyData, setBuyData] = useState<Order[]>([]);
  const [sellData, setSellData] = useState<Order[]>([]);

  // Seperate our grouped data from our master data to ensure accuracy when switching grouping modes
  // This is the data that is actually rendered
  const [groupedBuyData, setGroupedBuyData] = useState<Order[]>([]);
  const [groupedSellData, setGroupedSellData] = useState<Order[]>([]);

  const [market, setMarket] = useState("PI_XBTUSD");
  // Grouping range
  const [grouping, setGrouping] = useState(0.5);

  const [kill, setKill] = useState(false);

  const { width } = useWindowSize();

  const buffer = useRef(new Set<IMessageEvent>());

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
            setBuyData(calculateTotals(buy));
            setSellData(calculateTotals(sell));
          } else {
            // Else, assume its a delta update
            if (buy.length > 0) {
              // Merge the new data with our existing data and update the state
              // Pass in false as the third argument for descending sorting
              setBuyData((state) =>
                calculateTotals(handleNewData(buy, state, false))
              );
            }
            if (sell.length > 0) {
              setSellData((state) =>
                calculateTotals(handleNewData(sell, state, true))
              );
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
    // Process messages in intervals of 500ms to prevent overload
    const flush = () => {
      buffer.current.forEach((message) => processMessage(message));
      buffer.current.clear();
    };

    let timer = setInterval(flush, 500);

    client.onmessage = (message) => {
      buffer.current.add(message);
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

    buffer.current.clear();
    setBuyData([]);
    setSellData([]);
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

    // Unsubs and subs on subsequent presses
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

  // Render functions for each table row
  const renderBuyData = (data: Order[]) => {
    return data.slice(0, 15).map(({ price, size, total }, i, arr) => {
      const depth = calcDepth(total!, arr);
      return (
        <tr
          key={price}
          style={{
            backgroundImage: `linear-gradient(to left, #103839 ${depth}%, #111827 ${depth}%`,
          }}
        >
          <td>{total ? formatNumber(total) : ""}</td>
          <td>{formatNumber(size)}</td>
          <td className="price-buy">
            <p className="price">{formatNumberDecimals(price)}</p>
          </td>
        </tr>
      );
    });
  };

  const renderSellData = (data: Order[]) => {
    return data.slice(0, 15).map(({ price, size, total }, i, arr) => {
      const depth = calcDepth(total!, arr);
      return (
        <tr
          key={price}
          style={{
            backgroundImage: `linear-gradient(to ${
              width && width > 705 ? "right" : "left"
            }, #3E212C ${depth}%, #111827 ${depth}%`,
          }}
        >
          <td>{total ? formatNumber(total) : ""}</td>
          <td>{formatNumber(size)}</td>
          <td className="price-sell">
            <p className="price">{formatNumberDecimals(price)}</p>
          </td>
        </tr>
      );
    });
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
          data-testid="grouping-dropdown"
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
        {/* Buy side */}
        <OrderbookSide reversed={width && width > 705 ? false : true}>
          {width && width > 705
            ? renderBuyData(groupedBuyData)
            : renderBuyData(groupedBuyData).reverse()}
        </OrderbookSide>
        {/* Sell side */}
        <OrderbookSide reversed>
          {renderSellData(groupedSellData)}
        </OrderbookSide>
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
