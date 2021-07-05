import React, { useEffect, useState } from "react";
import "./App.css";
import { w3cwebsocket as W3CWebSocket } from "websocket";
import ToggleIcon from "./assets/toggleicon.svg";
import KillIcon from "./assets/killicon.svg";

const client = new W3CWebSocket("wss://www.cryptofacilities.com/ws/v1");

// Type definition for how the order data comes from the socket
type RawOrder = [price: number, size: number];

// Interface for the formatted order
// Orders are converted to an object format with a optional total property
interface Order {
  price: number;
  size: number;
  total?: number;
}

// Formats a number to a string with locale seperators
// E.g 100000 --> 100,000
function formatNumber(num: number) {
  return num.toLocaleString();
}

// Formats a number like formatNumber() but to two decimal places
// E.g 100000 --> 100,000.00
function formatNumberDecimals(num: number) {
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Takes raw order data and maps it to the object shaped Order interface
function formatData(data: RawOrder[]) {
  // Map to order structure
  let formatted: Order[] = data.map((order: RawOrder) => ({
    price: order[0],
    size: order[1],
  }));

  return formatted;
}

// Takes an array of Orders and calculates the total property for each of them based on their size
// Returns a new array
function calculateTotals(data: Order[]) {
  let clone = [...data];
  clone.reduce((acc: number, order: Order) => {
    const total = acc + order.size;
    order.total = total;
    return total;
  }, 0);

  return clone;
}

// Updates our data with delta data coming in
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
      // Remove it if the size is 0
      if (delta.size === 0) {
        newState.splice(matchingPrice, 1);
      }
      // Else update size
      else {
        newState[matchingPrice].size = delta.size;
      }
    }

    // If its a new price level, and the size isn't 0
    else {
      if (delta.size > 0) {
        // Add it to our cloned data
        newState.push(delta);
        // Then sort the new data
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

// Groups data together based on the groupingSize parameter
function groupData(data: Order[], groupingSize: number) {
  // Loop over every order and create a new result array
  let result = data.reduce((acc: Order[], current: Order) => {
    // If this isn't the first item, compare the current order with the last one
    // If the price difference is within the grouping size then

    // toFixed(2) rounds the difference to 2 decimal places,
    // otherwise theres a bug with repeating numbers for differences like 0.05 and 0.1
    // And since toFixed() returns a string, convert it back to a number with Number()
    if (
      acc.length > 0 &&
      Number(Math.abs(current.price - acc[acc.length - 1].price).toFixed(2)) <
        groupingSize
    ) {
      // Add the current size to the last item
      acc[acc.length - 1].size += current.size;
      return acc;
    }
    let clone = { ...current };

    // If the grouping size is a whole number like 1, then round the price down
    if (groupingSize % 1 === 0) {
      clone.price = Math.floor(clone.price);
    }
    // Serves the same purpose as above but for decimal fractions like 0.1
    if (groupingSize % 0.1 === 0) {
      clone.price = Math.floor(clone.price * 10) / 10;
    }

    // Add the current order to the results array
    acc.push(clone);
    return acc;
  }, []);

  return result;
}

function App() {
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
    client.onmessage = (message) => {
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
    <div className="App">
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
                  <th className="orderbook-title">PRICE</th>
                  <th className="orderbook-title">SIZE</th>
                  <th className="orderbook-title">TOTAL</th>
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
          <button className="feed-btn" id="kill-btn" onClick={killFeed}>
            <img src={KillIcon} alt="Kill feed button." className="btn-icon" />
            Kill Feed
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
