function calculateCOP(basePriceUSD, lbs = 0, shippingUSA = 0) {
    const trm = 4200;
    const factor = 1.30;
    const weightRate = 2.50;

    const totalUSD = parseFloat(basePriceUSD) + (parseFloat(lbs) * weightRate) + parseFloat(shippingUSA);
    const totalCOP = totalUSD * trm * factor;

    return Math.ceil(totalCOP / 1000) * 1000;
}

const price = 99.99;
const weight = 4;
const ship = 0;
const result = calculateCOP(price, weight, ship);
console.log(`USD: ${price}, Lbs: ${weight}, Ship: ${ship}`);
console.log(`Final COP: ${result}`);

const expected = Math.ceil(((99.99 + (4 * 2.5) + 0) * 4200 * 1.30) / 1000) * 1000;
if (result === expected) {
    console.log("✅ Formula Calculation: SUCCESS");
} else {
    console.log("❌ Formula Calculation: FAILED");
}
