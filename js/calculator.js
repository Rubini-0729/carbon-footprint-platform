// Carbon Footprint Calculator Engine
// All values are calculated in tonnes of CO2 equivalent (t CO2e) per year.

const EMISSION_FACTORS = {
  // Home Energy
  electricity: 0.000385, // t CO2e per kWh (Global average grid intensity)
  naturalGas: 0.000185,  // t CO2e per kWh of natural gas consumption
  
  // Transport (per km)
  carPetrol: 0.00018,    // t CO2e per km (average petrol car)
  carDiesel: 0.00017,    // t CO2e per km (average diesel car)
  carHybrid: 0.00010,    // t CO2e per km (hybrid car)
  carElectric: 0.00005,  // t CO2e per km (EV, accounts for grid charging emissions)
  
  publicTransit: 0.00004,// t CO2e per passenger-km (bus/train average)
  flightHour: 0.090,      // t CO2e per flight hour (includes radiative forcing)

  // Diet (Annual t CO2e per person)
  diet: {
    'heavy-meat': 2.5,
    'medium-meat': 1.7,
    'low-meat': 1.2,
    'vegetarian': 0.9,
    'vegan': 0.6
  },
  
  // Waste & Recycling (Annual t CO2e per person)
  waste: {
    'none': 0.5,
    'partial': 0.3,
    'full': 0.1
  }
};

class CarbonCalculator {
  constructor() {
    this.state = this.getInitialState();
  }

  getInitialState() {
    return {
      // Home Energy inputs
      electricityKwh: 300,        // monthly kWh
      gasKwh: 150,                // monthly kWh
      cleanEnergyShare: 0,        // % of home energy from renewables (0-100)
      
      // Transport inputs
      carMileage: 12000,          // annual km
      carFuelType: 'petrol',      // petrol, diesel, hybrid, electric
      publicTransitKm: 50,        // weekly km
      flightHours: 10,            // annual hours
      
      // Consumption inputs
      dietType: 'medium-meat',    // heavy-meat, medium-meat, low-meat, vegetarian, vegan
      recyclingLevel: 'partial',  // none, partial, full
      
      // Calculated outputs (tonnes CO2e per year)
      emissions: {
        housing: 0,
        transport: 0,
        consumption: 0,
        total: 0
      }
    };
  }

  // Update a single state property and recalculate
  update(key, value) {
    if (this.state.hasOwnProperty(key)) {
      // Parse numeric values
      if (typeof this.getInitialState()[key] === 'number') {
        this.state[key] = parseFloat(value) || 0;
      } else {
        this.state[key] = value;
      }
      this.calculate();
    }
  }

  // Set multiple state values
  updateMultiple(data) {
    for (const [key, value] of Object.entries(data)) {
      if (this.state.hasOwnProperty(key)) {
        if (typeof this.getInitialState()[key] === 'number') {
          this.state[key] = parseFloat(value) || 0;
        } else {
          this.state[key] = value;
        }
      }
    }
    this.calculate();
  }

  // Calculate annual carbon emissions for each category
  calculate() {
    // 1. Housing Calculations (monthly inputs -> annual emissions)
    const annualElectricity = this.state.electricityKwh * 12;
    const cleanEnergyFraction = this.state.cleanEnergyShare / 100;
    
    // Scale electricity footprint based on clean energy share
    const electricityEmissions = annualElectricity * EMISSION_FACTORS.electricity * (1 - cleanEnergyFraction);
    const gasEmissions = (this.state.gasKwh * 12) * EMISSION_FACTORS.naturalGas;
    
    this.state.emissions.housing = parseFloat((electricityEmissions + gasEmissions).toFixed(2));

    // 2. Transportation Calculations (annual/weekly inputs -> annual emissions)
    let carFactor = EMISSION_FACTORS.carPetrol;
    switch (this.state.carFuelType) {
      case 'diesel': carFactor = EMISSION_FACTORS.carDiesel; break;
      case 'hybrid': carFactor = EMISSION_FACTORS.carHybrid; break;
      case 'electric': 
        // Electric car emissions are scaled by clean energy share since it charges from home grid
        carFactor = EMISSION_FACTORS.carElectric * (1 - cleanEnergyFraction); 
        break;
    }
    const carEmissions = this.state.carMileage * carFactor;
    const transitEmissions = (this.state.publicTransitKm * 52) * EMISSION_FACTORS.publicTransit;
    const flightEmissions = this.state.flightHours * EMISSION_FACTORS.flightHour;
    
    this.state.emissions.transport = parseFloat((carEmissions + transitEmissions + flightEmissions).toFixed(2));

    // 3. Consumption & Waste Calculations (pre-computed annual values)
    const dietEmissions = EMISSION_FACTORS.diet[this.state.dietType] || 1.7;
    const wasteEmissions = EMISSION_FACTORS.waste[this.state.recyclingLevel] || 0.3;
    
    this.state.emissions.consumption = parseFloat((dietEmissions + wasteEmissions).toFixed(2));

    // 4. Grand Total
    const totalEmissions = this.state.emissions.housing + this.state.emissions.transport + this.state.emissions.consumption;
    this.state.emissions.total = parseFloat(totalEmissions.toFixed(2));
    
    return this.state.emissions;
  }

  // Get current state
  getState() {
    return this.state;
  }
}

// Export the class for module use or attach to window for vanilla scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CarbonCalculator;
} else {
  window.CarbonCalculator = CarbonCalculator;
}
