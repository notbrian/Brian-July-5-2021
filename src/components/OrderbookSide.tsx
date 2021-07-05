import React from "react";

type Props = {
  reversed?: boolean;
};

// Component for the orderbook sides
const OrderbookSide: React.FC<Props> = ({ children, reversed = false }) => (
  <div className={`orderbook-side ${reversed ? "orderbook-reverse" : ""}`}>
    <table>
      <tbody>
        <tr>
          <th className="orderbook-title">TOTAL</th>
          <th className="orderbook-title">SIZE</th>
          <th className="orderbook-title price">PRICE</th>
        </tr>
        {children}
      </tbody>
    </table>
  </div>
);

export default OrderbookSide;
