import {
  calcDepth,
  calculateTotals,
  formatData,
  formatNumber,
  formatNumberDecimals,
  groupData,
  handleNewData,
} from "./helpers";

it("should format the number", () => {
  expect(formatNumber(123456.2)).toBe("123,456.2");
});

it("should format the number to two decimal places", () => {
  expect(formatNumberDecimals(123456.2)).toBe("123,456.20");
});

it("should map a list RawOrder to a list of Orders", () => {
  expect(
    formatData([
      [100, 100],
      [200, 200],
    ])
  ).toStrictEqual([
    { price: 100, size: 100 },
    { price: 200, size: 200 },
  ]);
});

it("should calculate the totals for an order list", () => {
  expect(
    calculateTotals([
      { price: 100, size: 100 },
      { price: 200, size: 200 },
    ])
  ).toStrictEqual([
    { price: 100, size: 100, total: 100 },
    { price: 200, size: 200, total: 300 },
  ]);
});

it("should calculate the percentage of the total", () => {
  expect(
    calcDepth(150, [
      { price: 100, size: 100, total: 100 },
      { price: 200, size: 200, total: 300 },
    ])
  ).toBe(50);
});

it("should remove a price level", () => {
  expect(
    handleNewData(
      [{ price: 100, size: 0 }],
      [
        { price: 100, size: 100 },
        { price: 200, size: 200 },
      ]
    )
  ).toStrictEqual([{ price: 200, size: 200 }]);
});

it("should add a new price level", () => {
  expect(
    handleNewData(
      [{ price: 300, size: 300 }],
      [
        { price: 100, size: 100 },
        { price: 200, size: 200 },
      ],
      true
    )
  ).toStrictEqual([
    { price: 100, size: 100 },
    { price: 200, size: 200 },
    { price: 300, size: 300 },
  ]);
});

it("should update an existing price", () => {
  expect(
    handleNewData(
      [{ price: 100, size: 400 }],
      [
        { price: 100, size: 100 },
        { price: 200, size: 200 },
      ],
      true
    )
  ).toStrictEqual([
    { price: 100, size: 400 },
    { price: 200, size: 200 },
  ]);
});

const testDataXBT = [
  { price: 1, size: 50 },
  { price: 2, size: 100 },
  { price: 2.5, size: 100 },
  { price: 3, size: 150 },
  { price: 3.5, size: 150 },
  { price: 4, size: 200 },
  { price: 4.5, size: 250 },
  { price: 5, size: 300 },
  { price: 5.5, size: 350 },
  { price: 6.0, size: 400 },
  { price: 6.5, size: 450 },
  { price: 7.0, size: 500 },
];

const testDataETH = [
  { price: 0.05, size: 50 },
  { price: 2, size: 100 },
  { price: 0.1, size: 100 },
  { price: 0.15, size: 150 },
  { price: 0.2, size: 150 },
  { price: 0.25, size: 200 },
  { price: 0.3, size: 250 },
  { price: 0.35, size: 300 },
  { price: 0.4, size: 350 },
  { price: 0.45, size: 400 },
  { price: 0.5, size: 450 },
  { price: 0.55, size: 500 },
];

it("should do nothing to the XBT data", () => {
  expect(groupData(testDataXBT, 0.5)).toStrictEqual(testDataXBT);
});

it("should group XBT data in a range of 1", () => {
  expect(groupData(testDataXBT, 1)).toStrictEqual([
    { price: 1, size: 50 },
    { price: 2, size: 200 },
    { price: 3, size: 300 },
    { price: 4, size: 450 },
    { price: 5, size: 650 },
    { price: 6, size: 850 },
    { price: 7, size: 500 },
  ]);
});

it("should group XBT data in a range of 2.5", () => {
  expect(groupData(testDataXBT, 2.5)).toStrictEqual([
    { price: 1, size: 400 },
    { price: 3.5, size: 1250 },
    { price: 6, size: 1350 },
  ]);
});

it("should do nothing to the ETH data", () => {
  expect(groupData(testDataETH, 0.05)).toStrictEqual(testDataETH);
});

it("should group ETH data in a range of 0.1", () => {
  expect(groupData(testDataETH, 0.1)).toStrictEqual([
    { price: 0, size: 50 },
    { price: 2, size: 100 },
    { price: 0.1, size: 250 },
    { price: 0.2, size: 350 },
    { price: 0.3, size: 550 },
    { price: 0.4, size: 750 },
    { price: 0.5, size: 950 },
  ]);
});

it("should group ETH data in a range of 0.25", () => {
  expect(groupData(testDataETH, 0.25)).toStrictEqual([
    { price: 0.05, size: 50 },
    { price: 2, size: 100 },
    { price: 0.1, size: 850 },
    { price: 0.35, size: 2000 },
  ]);
});
