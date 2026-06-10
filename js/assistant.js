// AI Eco-Advisor Controller

class CarbonAdvisor {
  constructor(calculator) {
    this.calculator = calculator;
    this.chatHistory = [];
    this.dietFactors = {
      'heavy-meat': 2.5,
      'medium-meat': 1.7,
      'low-meat': 1.2,
      'vegetarian': 0.9,
      'vegan': 0.6
    };
  }

  init() {
    this.bindEvents();
    this.addWelcomeMessage();
    this.renderSuggestions();
  }

  bindEvents() {
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-input');
    
    if (form && input) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (text) {
          this.handleUserMessage(text);
          input.value = '';
        }
      });
    }
  }

  // Generate suggested quick-questions based on user's current highest carbon categories
  renderSuggestions() {
    const suggestionsBox = document.getElementById('advisor-suggestions');
    if (!suggestionsBox) return;

    const state = this.calculator.getState();
    const emissions = state.emissions;
    
    let suggestions = [
      "How can I start reducing my carbon footprint?",
      "What is the average carbon footprint?"
    ];

    // Customize suggestions based on largest category
    const maxCategory = Object.keys(emissions)
      .filter(k => k !== 'total')
      .reduce((a, b) => emissions[a] > emissions[b] ? a : b);

    if (maxCategory === 'housing') {
      suggestions.unshift("How do I reduce my household electricity emissions?");
      suggestions.unshift("Is switching to solar power worth it?");
    } else if (maxCategory === 'transport') {
      suggestions.unshift("How can I lower my travel emissions?");
      suggestions.unshift("Are electric vehicles really better for carbon emissions?");
    } else if (maxCategory === 'consumption') {
      suggestions.unshift("How does diet affect my carbon footprint?");
      suggestions.unshift("Does recycling actually reduce emissions?");
    }

    suggestionsBox.innerHTML = '';
    suggestions.slice(0, 4).forEach(prompt => {
      const btn = document.createElement('button');
      btn.className = 'suggestion-btn';
      btn.textContent = prompt;
      btn.addEventListener('click', () => this.handleUserMessage(prompt));
      suggestionsBox.appendChild(btn);
    });
  }

  addWelcomeMessage() {
    const welcome = "Hello! I am your AI Eco-Advisor. 🌍 I've analyzed your inputs and can help you create a personalized plan to reduce your carbon footprint. Ask me anything about your home energy, daily commute, diet, or waste recycling!";
    this.appendMessage('assistant', welcome);
  }

  handleUserMessage(text) {
    this.appendMessage('user', text);
    
    // Simulate AI thinking and reply
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      // Add typing indicator
      const typingEl = document.createElement('div');
      typingEl.className = 'message-bubble assistant typing';
      typingEl.id = 'chat-typing-indicator';
      typingEl.innerHTML = `<em>Advisor is thinking...</em>`;
      chatMessages.appendChild(typingEl);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      setTimeout(() => {
        const indicator = document.getElementById('chat-typing-indicator');
        if (indicator) indicator.remove();
        
        const response = this.generateResponse(text);
        this.appendMessage('assistant', response);
        this.renderSuggestions(); // re-evaluate suggestions in case inputs changed
      }, 700);
    }
  }

  appendMessage(sender, text) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${sender}`;
    bubble.innerHTML = text.replace(/\n/g, '<br>');
    
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    this.chatHistory.push({ sender, text });
  }

  // Context-aware chatbot logic
  generateResponse(query) {
    const q = query.toLowerCase();
    const state = this.calculator.getState();
    const emissions = state.emissions;

    // A. Housing-related queries
    if (q.includes('housing') || q.includes('electricity') || q.includes('gas') || q.includes('home') || q.includes('solar') || q.includes('heating')) {
      const annualElecVal = state.electricityKwh * 12;
      const cleanShare = state.cleanEnergyShare;
      
      let reply = `### Household Carbon Analysis 🏡\n`;
      reply += `Your current home energy emissions are **${emissions.housing.toFixed(2)} tonnes CO₂e/year** (Electricity: ${state.electricityKwh} kWh/mo, Gas: ${state.gasKwh} kWh/mo).\n\n`;

      if (q.includes('solar') || q.includes('switching')) {
        const potentialSavings = (annualElecVal * 0.000385) * (1 - cleanShare / 100);
        reply += `**Solar Power Insight:** Shifting your home electricity from ${cleanShare}% to 100% renewable energy would reduce your emissions by **${potentialSavings.toFixed(2)} tonnes per year**!\n`;
        reply += `*Recommendation:* Look into home solar panels or query your electricity provider for a green power tariff. In many regions, this costs the same or has rebates.`;
      } else {
        reply += `**Top Reduction Steps:**\n`;
        reply += `1. **Thermostat adjustment:** Lowering your heating thermostat by just 1°C (or raising AC by 1°C) can save 5-10% of home heating/cooling energy, saving around **${(emissions.housing * 0.07).toFixed(2)} tonnes CO₂e**.\n`;
        reply += `2. **LED Lighting:** Replacing incandescent bulbs with LEDs reduces lighting electricity by 80%.\n`;
        reply += `3. **Smart Thermostats:** Installing a smart programmable thermostat can shave off another **${(emissions.housing * 0.1).toFixed(2)} tonnes** by optimizing climate control when you are away.`;
      }
      return reply;
    }

    // B. Transportation-related queries
    if (q.includes('travel') || q.includes('car') || q.includes('drive') || q.includes('transit') || q.includes('commute') || q.includes('flight') || q.includes('electric vehicle') || q.includes('ev')) {
      let reply = `### Transportation Carbon Analysis 🚗\n`;
      reply += `Your transportation footprint is **${emissions.transport.toFixed(2)} tonnes CO₂e/year** (Driving: ${state.carMileage} km/yr, Public Transit: ${state.publicTransitKm} km/wk, Flights: ${state.flightHours} hrs/yr).\n\n`;

      if (q.includes('ev') || q.includes('electric vehicle') || q.includes('electric cars')) {
        let currentCarEmissions = state.carMileage * 0.00018; // base petrol
        if (state.carFuelType === 'diesel') currentCarEmissions = state.carMileage * 0.00017;
        else if (state.carFuelType === 'hybrid') currentCarEmissions = state.carMileage * 0.00010;
        else if (state.carFuelType === 'electric') currentCarEmissions = state.carMileage * 0.00005 * (1 - state.cleanEnergyShare / 100);

        const evPotential = state.carMileage * 0.00005; // EV emissions
        const savings = Math.max(0, currentCarEmissions - evPotential);

        reply += `**Electric Vehicle (EV) Insight:** Shifting your current ${state.carFuelType} car to an EV would reduce your driving emissions from **${currentCarEmissions.toFixed(2)}** to **${evPotential.toFixed(2)} tonnes/year** (saving **${savings.toFixed(2)} tonnes**).\n`;
        reply += `*Note:* EVs have significantly lower tailpipe emissions. Their lifetime carbon footprint is 50-70% lower than petrol cars even when running on average grids, and approaches 95% savings if charged with green energy.`;
      } else if (q.includes('flight') || q.includes('fly')) {
        reply += `**Flight Emissions Insight:** Flying is one of the most carbon-intensive individual actions. One hour of flying emits **90 kg CO₂e**. Your ${state.flightHours} hours of flight release **${(state.flightHours * 0.09).toFixed(2)} tonnes**.\n`;
        reply += `*Recommendation:* Reduce non-essential long-distance travel, choose trains/buses for intermediate distances (which are up to 90% cleaner), or look into direct flights since take-offs use the most fuel.`;
      } else {
        const tenPercentTransit = state.carMileage * 0.10;
        const transitSavings = tenPercentTransit * (0.00018 - 0.00004); // petrol factor vs transit
        reply += `**Commuting Tips:**\n`;
        reply += `- Replacing just 10% of your driving (${tenPercentTransit.toFixed(0)} km) with public transit or active commuting (walking/biking) saves **${transitSavings.toFixed(2)} tonnes CO₂e**.\n`;
        reply += `- Carpooling with a coworker halves your commute emissions and fuel costs.\n`;
        reply += `- Maintain optimal tire inflation: under-inflated tires increase fuel consumption by 3%.`;
      }
      return reply;
    }

    // C. Diet and Food-related queries
    if (q.includes('diet') || q.includes('food') || q.includes('meat') || q.includes('vegan') || q.includes('vegetarian') || q.includes('eat')) {
      const dietEmissions = this.dietFactors[state.dietType] || 1.7;
      let reply = `### Diet & Food Carbon Analysis 🍽️\n`;
      reply += `Your current food diet contributes approximately **${dietEmissions.toFixed(1)} tonnes CO₂e/year** (Diet style: ${state.dietType.replace('-', ' ')}).\n\n`;

      if (state.dietType === 'heavy-meat' || state.dietType === 'medium-meat') {
        const vegSavings = dietEmissions - 0.9;
        const veganSavings = dietEmissions - 0.6;
        reply += `**Diet Shift Potential:**\n`;
        reply += `- Shifting to a **Vegetarian** diet would save **${vegSavings.toFixed(1)} tonnes CO₂e/year**.\n`;
        reply += `- Shifting to a **Vegan** diet would save **${veganSavings.toFixed(1)} tonnes CO₂e/year**.\n\n`;
        reply += `**Why is meat high-carbon?** Ruminant animals (cows, sheep) emit methane (a greenhouse gas 28x more potent than CO2) during digestion. Raising cattle also requires substantial land clearance, driving deforestation.`;
      } else {
        reply += `Great job eating low-carbon! As a ${state.dietType.replace('-', ' ')}, your food emissions are already far below average.\n\n`;
        reply += `**Additional Food Tips:**\n`;
        reply += `- **Reduce Food Waste:** Food waste in landfills produces methane. Reducing your waste saves money and carbon.\n`;
        reply += `- **Eat Seasonally:** Locally grown food out of season (grown in heated greenhouses) can have higher footprints than importing seasonal foods.`;
      }
      return reply;
    }

    // D. Recycling and Waste-related queries
    if (q.includes('recycling') || q.includes('recycle') || q.includes('waste') || q.includes('trash') || q.includes('compost')) {
      let reply = `### Waste & Circular Economy Analysis ♻️\n`;
      const wasteEmissions = state.recyclingLevel === 'none' ? 0.5 : (state.recyclingLevel === 'partial' ? 0.3 : 0.1);
      reply += `Your waste footprint is **${wasteEmissions.toFixed(1)} tonnes CO₂e/year** (Recycling level: ${state.recyclingLevel}).\n\n`;
      
      reply += `**Impact of Circular Habits:**\n`;
      if (state.recyclingLevel !== 'full') {
        reply += `- Shifting to **full recycling & composting** would reduce your waste footprint to **0.1 tonnes/year** (saving **${(wasteEmissions - 0.1).toFixed(1)} tonnes**).\n`;
      }
      reply += `1. **Composting:** Organics in airtight landfills decompose anaerobically to create methane. Composting allows aerobic decomposition, which is far cleaner.\n`;
      reply += `2. **Avoid Single-Use Plastics:** Shifting to reusable bags, bottles, and wraps prevents plastic production emissions and marine pollution.\n`;
      reply += `3. **Buy Secondhand:** Manufacturing new products (clothing, electronics) releases substantial Scope 3 emissions. Buying secondhand avoids these upstream emissions entirely.`;
      return reply;
    }

    // E. General/Average queries
    if (q.includes('average') || q.includes('standard') || q.includes('normal')) {
      let reply = `### Global & Regional Benchmarks 📊\n`;
      reply += `- **Global Average:** ~4.7 tonnes CO₂e per person annually.\n`;
      reply += `- **US Average:** ~16.0 tonnes per person (driven by larger homes, driving, and high consumption).\n`;
      reply += `- **EU Average:** ~6.4 tonnes per person.\n`;
      reply += `- **Net-Zero Target:** < 2.0 tonnes per person by 2050 to keep global warming below 1.5°C.\n\n`;
      reply += `Your current footprint is **${emissions.total.toFixed(2)} tonnes**, which is **${(emissions.total / 4.7).toFixed(1)}x** the global average. Let's work together to bring it down towards the 2.0-tonne limit using our *What-If Sandbox* and *Action Tracker*!`;
      return reply;
    }

    // F. General reduction/help
    if (q.includes('reduce') || q.includes('help') || q.includes('start') || q.includes('action') || q.includes('plan')) {
      let reply = `### How to start reducing your carbon footprint 🚀\n`;
      reply += `Here is a high-impact plan based on your largest emission source (**${
        emissions.housing > emissions.transport && emissions.housing > emissions.consumption ? 'Home Energy' : 
        (emissions.transport > emissions.housing && emissions.transport > emissions.consumption ? 'Transportation' : 'Consumption & Diet')
      }**):\n\n`;
      
      reply += `1. **Quick Win (Diet):** Try "Meatless Mondays" (saves ~0.15t/year).\n`;
      reply += `2. **Home Audit (Energy):** Unplug vampire appliances and dial back your thermostat by 1°C (saves ~0.25t/year).\n`;
      reply += `3. **Travel Choice (Commute):** Swap one drive-to-work per week for transit, walking, or carpooling (saves ~0.3t/year).\n`;
      reply += `4. **Invest for Future:** When purchasing your next car, make it hybrid/electric; switch your utility plan to 100% wind/solar.\n\n`;
      reply += `Check out our **Action Tracker** tab to accept these challenges and track your score progress!`;
      return reply;
    }

    // Default reply
    return `I received your question: "${query}".\n\nTo give you the best advice, you can ask about: \n- **Home Energy** (e.g., "Switching to solar", "Reduce electricity emissions")\n- **Transportation** (e.g., "Buying an EV", "Flight footprint")\n- **Food & Diet** (e.g., "Meat vs Veg", "Food waste carbon")\n- **Recycling & Waste** (e.g., "Composting", "Reducing plastic footprint")\n\nYou can also click any of the suggested prompts on the right panel!`;
  }
}

// Export class or attach to window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CarbonAdvisor;
} else {
  window.CarbonAdvisor = CarbonAdvisor;
}
