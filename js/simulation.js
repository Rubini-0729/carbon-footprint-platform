'use strict';

/**
 * @fileoverview Sandbox Simulation Controller
 * Simulates carbon offset options and calculates utility and transport savings.
 */

/**
 * Class representing the carbon sandbox simulation tool.
 */
class CarbonSimulation {
  /**
   * Creates an instance of CarbonSimulation.
   * @param {CarbonCalculator} calculator - The carbon footprint calculator engine.
   */
  constructor(calculator) {
    this.calculator = calculator;
    // Costs for utility savings estimates
    this.rates = {
      electricityKwh: 0.16, // $ per kWh
      gasKwh: 0.08,         // $ per kWh
      petrolLiter: 1.45,    // $ per liter petrol
      fuelUsage100km: 7.5   // 7.5 liters per 100km average
    };
  }

  /**
   * Initializes visual event listeners and triggers first simulation draw.
   */
  init() {
    this.bindEvents();
    this.update();
  }

  /**
   * Binds user slide drag event listeners to trigger UI updates.
   */
  bindEvents() {
    const sliders = [
      'sim-clean-energy',
      'sim-transit-share',
      'sim-meatless-days',
      'sim-home-efficiency'
    ];

    sliders.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          // Update the slider value display label next to it
          const valDisplay = document.getElementById(`${id}-val`);
          if (valDisplay) {
            let suffix = '%';
            if (id === 'sim-meatless-days') suffix = ' days';
            valDisplay.textContent = el.value + suffix;
          }
          this.update();
        });
      }
    });
  }

  /**
   * Calculates and updates simulation results.
   * Updates display labels, outputs savings, and adjusts ARIA accessibility states.
   */
  update() {
    const baseState = this.calculator.getState();
    
    // Read slider values
    const cleanSlider = document.getElementById('sim-clean-energy');
    const transitSlider = document.getElementById('sim-transit-share');
    const meatlessSlider = document.getElementById('sim-meatless-days');
    const efficiencySlider = document.getElementById('sim-home-efficiency');

    const simCleanEnergy = parseFloat(cleanSlider?.value || 0);
    const simTransitShare = parseFloat(transitSlider?.value || 0);
    const simMeatlessDays = parseFloat(meatlessSlider?.value || 0);
    const simHomeEfficiency = parseFloat(efficiencySlider?.value || 0);

    // Update ARIA values dynamically for screen readers
    if (cleanSlider) cleanSlider.setAttribute('aria-valuenow', simCleanEnergy);
    if (transitSlider) transitSlider.setAttribute('aria-valuenow', simTransitShare);
    if (meatlessSlider) meatlessSlider.setAttribute('aria-valuenow', simMeatlessDays);
    if (efficiencySlider) efficiencySlider.setAttribute('aria-valuenow', simHomeEfficiency);

    // 1. Calculate Simulated Housing
    // Home efficiency reduces energy consumption. Clean energy share reduces electricity footprint.
    const effFactor = (1 - simHomeEfficiency / 100);
    const simElectricity = baseState.electricityKwh * 12 * effFactor;
    const simGas = baseState.gasKwh * 12 * effFactor;
    
    // Scale electricity emissions by clean energy share
    const cleanEnergyFraction = Math.max(baseState.cleanEnergyShare / 100, simCleanEnergy / 100);
    const housingElectricityEmissions = simElectricity * 0.000385 * (1 - cleanEnergyFraction);
    const housingGasEmissions = simGas * 0.000185;
    const simulatedHousing = housingElectricityEmissions + housingGasEmissions;

    // 2. Calculate Simulated Transport
    // Transit share replaces car driving mileage.
    const mileageSaved = baseState.carMileage * (simTransitShare / 100);
    const simCarMileage = baseState.carMileage - mileageSaved;
    
    let carFactor = 0.00018; // carPetrol
    switch (baseState.carFuelType) {
      case 'diesel': carFactor = 0.00017; break;
      case 'hybrid': carFactor = 0.00010; break;
      case 'electric': carFactor = 0.00005 * (1 - cleanEnergyFraction); break;
    }
    
    const simCarEmissions = simCarMileage * carFactor;
    // The saved mileage is shifted to public transit
    const addedTransitKm = mileageSaved;
    const simTransitKm = (baseState.publicTransitKm * 52) + addedTransitKm;
    const simTransitEmissions = simTransitKm * 0.00004; // publicTransit factor
    const simFlightEmissions = baseState.flightHours * 0.090; // flightHour factor
    
    const simulatedTransport = simCarEmissions + simTransitEmissions + simFlightEmissions;

    // 3. Calculate Simulated Consumption
    // Diet: Meatless days reduce diet footprint towards vegetarian/vegan
    const dietFactors = {
      'heavy-meat': 2.5,
      'medium-meat': 1.7,
      'low-meat': 1.2,
      'vegetarian': 0.9,
      'vegan': 0.6
    };
    const baseDietVal = dietFactors[baseState.dietType] || 1.7;
    // Calculate targeted reduction: transition towards vegetarian (0.9 t) if meat-eater, or vegan (0.6 t) if vegetarian
    const targetDietVal = baseDietVal > 0.9 ? 0.9 : 0.6;
    const dietReduction = (baseDietVal - targetDietVal) * (simMeatlessDays / 7);
    const simDietEmissions = baseDietVal - dietReduction;
    const simWasteEmissions = baseState.recyclingLevel === 'none' ? 0.5 : (baseState.recyclingLevel === 'partial' ? 0.3 : 0.1);
    
    const simulatedConsumption = simDietEmissions + simWasteEmissions;

    // 4. Update UI Outputs
    const originalTotal = baseState.emissions.total;
    const simulatedTotal = parseFloat((simulatedHousing + simulatedTransport + simulatedConsumption).toFixed(2));
    const reduction = parseFloat(Math.max(0, originalTotal - simulatedTotal).toFixed(2));
    const reductionPercent = originalTotal > 0 ? ((reduction / originalTotal) * 100).toFixed(0) : 0;

    // Update numbers on screen
    const origEl = document.getElementById('sim-original-val');
    const simEl = document.getElementById('sim-simulated-val');
    const redEl = document.getElementById('sim-reduction-val');
    const redPctEl = document.getElementById('sim-reduction-pct-val');

    if (origEl) origEl.textContent = `${originalTotal.toFixed(2)} t`;
    if (simEl) simEl.textContent = `${simulatedTotal.toFixed(2)} t`;
    if (redEl) redEl.textContent = `${reduction.toFixed(2)} t`;
    if (redPctEl) redPctEl.textContent = `(${reductionPercent}% reduction)`;

    // 5. Calculate Financial Savings ($ / year)
    // Electricity saved
    const electricitySavedKwh = (baseState.electricityKwh * 12) - simElectricity;
    const elecCostSaved = electricitySavedKwh * this.rates.electricityKwh;
    
    // Natural Gas saved
    const gasSavedKwh = (baseState.gasKwh * 12) - simGas;
    const gasCostSaved = gasSavedKwh * this.rates.gasKwh;

    // Fuel saved (from reduced driving)
    // mileageSaved / 100 * fuelUsage * fuelCost
    const fuelSavedLiters = (mileageSaved / 100) * this.rates.fuelUsage100km;
    const transitCost = mileageSaved * 0.05; // Public transit cost estimate: $0.05/km
    const fuelCostSaved = (fuelSavedLiters * this.rates.petrolLiter) - transitCost;

    const totalSavings = Math.max(0, elecCostSaved + gasCostSaved + fuelCostSaved);
    const savingsEl = document.getElementById('sim-savings-val');
    if (savingsEl) {
      savingsEl.textContent = `$${totalSavings.toFixed(0)}`;
    }

    // 6. Calculate EPA Equivalents
    // Seedlings grown for 10 years: ~45 seedlings per tonne of CO2
    const treesGrown = Math.round(reduction * 45.4);
    // Cars removed from road for a year: ~4.6 tonnes CO2 per car
    const carsRemoved = (reduction / 4.6).toFixed(1);
    // Smartphones charged: ~120,000 charges per tonne of CO2
    const phonesCharged = Math.round(reduction * 121643);

    const treesEl = document.getElementById('eq-trees-val');
    const carsEl = document.getElementById('eq-cars-val');
    const phonesEl = document.getElementById('eq-phones-val');

    if (treesEl) treesEl.textContent = treesGrown.toLocaleString();
    if (carsEl) carsEl.textContent = carsRemoved;
    if (phonesEl) phonesEl.textContent = phonesCharged.toLocaleString();
  }
}

// Export class or attach to window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CarbonSimulation;
} else {
  window.CarbonSimulation = CarbonSimulation;
}
