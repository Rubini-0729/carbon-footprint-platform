// Calculator Verification Script
// Run via: node js/test_calc.js

const CarbonCalculator = require('./calculator.js');
const calc = new CarbonCalculator();

// Initial state checks
const initial = calc.getState();
console.assert(initial.electricityKwh === 300, 'Initial electricity should be 300');
console.assert(initial.carMileage === 12000, 'Initial mileage should be 12000');

// Calculate initial footprint
calc.calculate();
const baseEmissions = calc.getState().emissions;
console.log('Calculated initial emissions:', baseEmissions);

// Verify specific calculations:
// 1. Housing:
// Electricity: 300 kWh/mo * 12 mo/yr = 3600 kWh/yr * 0.000385 t/kWh = 1.386 t CO2e
// Gas: 150 kWh/mo * 12 mo/yr = 1800 kWh/yr * 0.000185 t/kWh = 0.333 t CO2e
// Total housing = 1.386 + 0.333 = 1.719 => Rounded to 1.72 t CO2e
console.assert(Math.abs(baseEmissions.housing - 1.72) < 0.02, `Housing emissions should be ~1.72, got ${baseEmissions.housing}`);

// 2. Transport:
// Car: 12000 km * 0.00018 t/km = 2.16 t
// Public transit: 50 km/wk * 52 wk/yr = 2600 km * 0.00004 t/km = 0.104 t
// Flights: 10 hrs * 0.090 t/hr = 0.90 t
// Total transport = 2.16 + 0.104 + 0.90 = 3.164 => Rounded to 3.16 t
console.assert(Math.abs(baseEmissions.transport - 3.16) < 0.02, `Transport emissions should be ~3.16, got ${baseEmissions.transport}`);

// 3. Consumption:
// Diet: medium-meat = 1.70 t
// Waste: partial recycling = 0.30 t
// Total consumption = 1.70 + 0.30 = 2.00 t
console.assert(Math.abs(baseEmissions.consumption - 2.00) < 0.02, `Consumption emissions should be ~2.00, got ${baseEmissions.consumption}`);

// 4. Grand Total:
// Total = 1.72 + 3.16 + 2.00 = 6.88 t
console.assert(Math.abs(baseEmissions.total - 6.88) < 0.02, `Total emissions should be ~6.88, got ${baseEmissions.total}`);

console.log('✅ All calculator tests passed successfully!');
process.exit(0);
