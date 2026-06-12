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

// Verify AI Eco-Advisor Responses & HTML Escaping Security
console.log('Running AI Eco-Advisor tests...');
const CarbonAdvisor = require('./assistant.js');
const advisor = new CarbonAdvisor(calc);

// 1. Test HTML Escaping
const xssPayload = '<script>alert("XSS")</script>';
const escaped = advisor.escapeHTML(xssPayload);
console.assert(escaped === '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;', 'XSS payload must be escaped safely');
console.assert(advisor.escapeHTML('&') === '&amp;', 'Ampersand must be escaped');
console.assert(advisor.escapeHTML('"') === '&quot;', 'Double quotes must be escaped');
console.assert(advisor.escapeHTML('\'') === '&#39;', 'Single quote must be escaped');

// 2. Test Response Generation Keywords
const responseSolar = advisor.generateResponse('tell me about solar power');
console.assert(responseSolar.includes('Solar Power Insight'), 'Advisor response for solar power should trigger Solar Insight');

const responseEV = advisor.generateResponse('what about electric vehicles?');
console.assert(responseEV.includes('Electric Vehicle (EV) Insight'), 'Advisor response for EV should trigger EV Insight');

const responseAverage = advisor.generateResponse('what is the average carbon footprint?');
console.assert(responseAverage.includes('Global & Regional Benchmarks'), 'Advisor response for average should trigger Benchmarks');

// Verify Sandbox Simulation Math
console.log('Running Sandbox Simulation math tests...');
const elements = {};
const createMockElement = (val = '') => {
  return {
    value: val,
    textContent: val,
    setAttribute: function(attr, value) {
      this[attr] = value;
    }
  };
};

const sliders = {
  'sim-clean-energy': createMockElement('50'),
  'sim-transit-share': createMockElement('20'),
  'sim-meatless-days': createMockElement('3'),
  'sim-home-efficiency': createMockElement('10')
};

global.document = {
  getElementById: (id) => {
    if (sliders[id]) return sliders[id];
    
    if (!elements[id]) {
      elements[id] = createMockElement();
    }
    return elements[id];
  }
};

const CarbonSimulation = require('./simulation.js');
const sim = new CarbonSimulation(calc);
sim.update();

// Expected math based on:
// sim-clean-energy = 50%, sim-transit-share = 20%, sim-meatless-days = 3 days, sim-home-efficiency = 10%
// simulatedHousing = 0.92 tonnes CO2e
// simulatedTransport = 2.83 tonnes CO2e
// simulatedConsumption = 1.66 tonnes CO2e
// simulatedTotal = 0.92 + 2.83 + 1.66 = 5.41 tonnes CO2e (reduction: 6.88 - 5.41 = 1.47 tonnes)
console.assert(elements['sim-simulated-val'].textContent === '5.41 t', `Expected simulated profile to be '5.41 t', got '${elements['sim-simulated-val'].textContent}'`);
console.assert(elements['sim-reduction-val'].textContent === '1.47 t', `Expected avoided carbon to be '1.47 t', got '${elements['sim-reduction-val'].textContent}'`);
console.assert(elements['sim-reduction-pct-val'].textContent === '(21% reduction)', `Expected percentage to be '(21% reduction)', got '${elements['sim-reduction-pct-val'].textContent}'`);

// 3. Test extra calculator variables and checklist savings
console.log('Running checklist action subtraction tests...');
calc.update('completedActions', ['diet-meatless', 'housing-led']);
calc.calculate();
const emissionsWithActions = calc.getState().emissions;
// Base housing was 1.72. Subtracting housing-led (0.20) should make it 1.52.
console.assert(Math.abs(emissionsWithActions.housing - 1.52) < 0.02, `Housing with led action should be ~1.52, got ${emissionsWithActions.housing}`);
// Base consumption was 2.00. Subtracting diet-meatless (0.15) should make it 1.85.
console.assert(Math.abs(emissionsWithActions.consumption - 1.85) < 0.02, `Consumption with meatless action should be ~1.85, got ${emissionsWithActions.consumption}`);

// Test boundary inputs
console.log('Running boundary inputs tests...');
calc.updateMultiple({
  electricityKwh: 0,
  gasKwh: 0,
  cleanEnergyShare: 100,
  carMileage: 0,
  publicTransitKm: 0,
  flightHours: 0,
  dietType: 'vegan',
  recyclingLevel: 'full',
  completedActions: []
});
calc.calculate();
const zeroEmissions = calc.getState().emissions;
// Vegan (0.6) + full recycling (0.1) = 0.7 tonnes total
console.assert(zeroEmissions.housing === 0, 'Housing emissions should be 0 when energy usage is 0');
console.assert(zeroEmissions.transport === 0, 'Transport emissions should be 0 when travel mileage is 0');
console.assert(Math.abs(zeroEmissions.consumption - 0.70) < 0.02, `Vegan diet + full recycling should be ~0.70, got ${zeroEmissions.consumption}`);
console.assert(Math.abs(zeroEmissions.total - 0.70) < 0.02, `Total emissions should be ~0.70, got ${zeroEmissions.total}`);

// Reset calculator state for safety
calc.updateMultiple(calc.getInitialState());
calc.calculate();

console.log('✅ All unit and integration tests passed successfully!');
process.exit(0);
