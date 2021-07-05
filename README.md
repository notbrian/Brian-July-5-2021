# Orderbook

A frontend project built by [Brian Nguyen](https://notbriann.com).

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

### Overview

This is a frontend application consisting of React + Typescript that shows a live orderbook of XBT-USD and ETH-USD. The data is sourced in real-time from the Crypto Facilities public WebSocket: `wss://www.cryptofacilities.com/ws/v1`

### Features

Live buy and sell orders on the market are shown in real-time on the orderbook. It shows the price, how many orders are at this price point (size), and how much this price level and the ones above it make up of the total orders.

Each market has options for different grouping levels selectable in the top-right dropdown.

XBT-USD: 0.5, 1.0, 2.5 

ETH-USD: 0.05, 0.1, 0.25

The default market is XBT-USD but can be switched to ETH-USD by pressing the `Toggle Feed` button.

The feed can be killed by pressing the `Kill Feed` button to simulate a error on the WebSocket. A test error is sent to the `onerror` function and an error is sent to the `onmessage` function that should fail. It also unsubscribes socket the current feed.

On pressing the button again, the feed will be resubscribed.

## Consuming for local development

You will need `Node` installed.

1. Clone the repo and navigate into it

```
$ git clone https://github.com/notbrian/orderbook.git
$ cd orderbook
```

2. Install dependencies

```
npm install
```
3. Launch development server

```
npm  start
```
The page will reload if you make edits.\
You will also see any lint errors in the console.

4. It should open automatically, but if not access the site at: http://localhost:3000/


## Consuming for local production

Perform the same steps as above but run `npm run build` instead. This will build the frontend (`npm run build`) to the `build` folder which then can be served lwith `serve -s build` or through your favorite server.

The app will be served at http://localhost:3000/

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### `npm test`

Launches the test runner in the interactive watch mode.\

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.
