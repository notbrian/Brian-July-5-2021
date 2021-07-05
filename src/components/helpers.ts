// Type definition for how the order data comes from the socket
export type RawOrder = [price: number, size: number];

// Interface for the formatted order
// Orders are converted to an object format with a optional total property
export interface Order {
  price: number;
  size: number;
  total?: number;
}

// Formats a number to a string with locale seperators
// E.g 100000 --> 100,000
export function formatNumber(num: number) {
  return num.toLocaleString();
}

// Formats a number like formatNumber() but to two decimal places
// E.g 100000 --> 100,000.00
export function formatNumberDecimals(num: number) {
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Takes raw order data and maps it to the object shaped Order interface
export function formatData(data: RawOrder[]) {
  // Map to order structure
  let formatted: Order[] = data.map((order: RawOrder) => ({
    price: order[0],
    size: order[1],
  }));

  return formatted;
}

// Takes an array of Orders and calculates the total property for each of them based on their size
// Returns a new array
export function calculateTotals(data: Order[]) {
  let clone = [...data];
  clone.reduce((acc: number, order: Order) => {
    const total = acc + order.size;
    order.total = total;
    return total;
  }, 0);

  return clone;
}

// Updates our data with delta data coming in
export function handleNewData(
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
export function groupData(data: Order[], groupingSize: number) {
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

// Calculates a depth percentage
export function calcDepth(total: number, arr: Order[]) {
  return (total! / arr[arr.length - 1].total!) * 100
}