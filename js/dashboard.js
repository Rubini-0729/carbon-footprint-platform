'use strict';

/**
 * @fileoverview Dashboard View Controller
 * Renders gauges, dynamic bar charts, and carbon offset benchmarks.
 */

/**
 * Class representing the carbon dashboard rendering controller.
 */
class CarbonDashboard {
  /**
   * Creates an instance of CarbonDashboard.
   * @param {CarbonCalculator} calculator - The carbon footprint calculator engine.
   */
  constructor(calculator) {
    this.calculator = calculator;
    this.maxGaugeValue = 20; // 20 tonnes is our gauge maximum (corresponds to 100%)
    this.maxBarValue = 10;   // 10 tonnes is the maximum height for individual category bars
  }

  /**
   * Initializes the dashboard views and triggers first render.
   */
  init() {
    this.render();
  }

  /**
   * Updates numbers, progress gauges, and relative bar charts on the page.
   */
  render() {
    const state = this.calculator.getState();
    const emissions = state.emissions;

    // 1. Update Core Emission Values
    this.animateNumber('total-emissions-val', emissions.total, 2);
    this.animateNumber('housing-emissions-val', emissions.housing, 2);
    this.animateNumber('transport-emissions-val', emissions.transport, 2);
    this.animateNumber('consumption-emissions-val', emissions.consumption, 2);
    
    // Update global score badge in header
    const scoreBadge = document.getElementById('eco-score-header-val');
    if (scoreBadge) {
      scoreBadge.textContent = `${emissions.total} t`;
    }

    // 2. Update Progress Gauge Ring
    const gaugeProgress = document.getElementById('dashboard-gauge-progress');
    const gaugeValText = document.getElementById('dashboard-gauge-val');
    
    if (gaugeProgress && gaugeValText) {
      // Calculate stroke dashoffset
      // Circumference = 2 * Math.PI * r = 2 * 3.14159 * 80 = ~502
      const circumference = 502;
      const fillPercentage = Math.min((emissions.total / this.maxGaugeValue) * 100, 100);
      const strokeDashoffset = circumference - (fillPercentage * circumference) / 100;
      
      gaugeProgress.style.strokeDashoffset = strokeDashoffset;
      gaugeValText.textContent = emissions.total.toFixed(1);
    }

    // 3. Update Bar Chart Heights & Tooltips
    this.updateBar('housing', emissions.housing);
    this.updateBar('transport', emissions.transport);
    this.updateBar('consumption', emissions.consumption);
    this.updateBar('total', emissions.total, this.maxGaugeValue);

    // 4. Update Comparisons and Trends
    this.updateComparisons(emissions.total);
  }

  /**
   * Updates a single chart bar's height percentage and hover tooltip text.
   * @param {string} category - Category name (e.g. 'housing', 'transport').
   * @param {number} value - Emissions value in tonnes.
   * @param {number} [maxVal=this.maxBarValue] - Maximum value representing 100% height.
   */
  updateBar(category, value, maxVal = this.maxBarValue) {
    const bar = document.getElementById(`bar-${category}`);
    const tooltip = document.getElementById(`tooltip-${category}`);
    
    if (bar && tooltip) {
      const heightPercent = Math.min((value / maxVal) * 100, 100);
      bar.style.height = `${heightPercent}%`;
      tooltip.textContent = `${value.toFixed(2)} t`;
    }
  }

  /**
   * Updates comparative benchmarking text based on regional averages.
   * @param {number} userTotal - User's total annual emissions in tonnes.
   */
  updateComparisons(userTotal) {
    const usAvg = 16.0;
    const worldAvg = 4.7;
    const target = 2.0;

    const diffUs = ((usAvg - userTotal) / usAvg) * 100;
    const diffWorld = ((userTotal - worldAvg) / worldAvg) * 100;
    const factorTarget = userTotal / target;

    const comparisonTextEl = document.getElementById('dashboard-comparison-text');
    if (comparisonTextEl) {
      let html = '';
      if (userTotal < usAvg) {
        html += `Your carbon footprint is <strong class="text-success">${diffUs.toFixed(0)}% lower</strong> than the US average (${usAvg} t). `;
      } else {
        html += `Your carbon footprint is <strong class="text-danger">${Math.abs(diffUs).toFixed(0)}% higher</strong> than the US average (${usAvg} t). `;
      }

      if (userTotal < worldAvg) {
        html += `You are <strong class="text-success">${Math.abs(diffWorld).toFixed(0)}% below</strong> the global average (${worldAvg} t). `;
      } else {
        html += `You are <strong class="text-danger">${diffWorld.toFixed(0)}% above</strong> the global average (${worldAvg} t). `;
      }

      if (userTotal <= target) {
        html += `🎉 Awesome! You have reached the <strong class="text-success">Net-Zero 2050 target</strong> of ${target} t CO₂e per year!`;
      } else {
        html += `To meet the global warming limit, you need to reduce your footprint to ${target} t (currently <strong class="text-accent">${factorTarget.toFixed(1)}x</strong> above target).`;
      }

      comparisonTextEl.innerHTML = html;
    }

    // Update trend badges
    this.updateTrendBadge('housing-trend', this.calculator.getState().emissions.housing, 3.5);
    this.updateTrendBadge('transport-trend', this.calculator.getState().emissions.transport, 4.0);
    this.updateTrendBadge('consumption-trend', this.calculator.getState().emissions.consumption, 2.2);
  }

  /**
   * Updates visual trend tags indicating relative progress against national norms.
   * @param {string} elementId - Target DOM element ID.
   * @param {number} currentValue - User's current category emissions.
   * @param {number} benchmarkValue - Category benchmark emissions.
   */
  updateTrendBadge(elementId, currentValue, benchmarkValue) {
    const badge = document.getElementById(elementId);
    if (!badge) return;

    if (currentValue < benchmarkValue) {
      const pct = (((benchmarkValue - currentValue) / benchmarkValue) * 100).toFixed(0);
      badge.className = 'metric-trend good';
      badge.innerHTML = `<i class="fas fa-caret-down" aria-hidden="true"></i> ${pct}% below avg`;
    } else {
      const pct = (((currentValue - benchmarkValue) / benchmarkValue) * 100).toFixed(0);
      badge.className = 'metric-trend bad';
      badge.innerHTML = `<i class="fas fa-caret-up" aria-hidden="true"></i> ${pct}% above avg`;
    }
  }

  /**
   * Animates dashboard counts from their current values to new updated values.
   * @param {string} elementId - Target DOM element ID.
   * @param {number} targetVal - Target numeric endpoint.
   * @param {number} [decimals=2] - Number of decimal places.
   */
  animateNumber(elementId, targetVal, decimals = 2) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const startVal = parseFloat(el.textContent) || 0;
    if (startVal === targetVal) return;

    const duration = 800; // ms
    let startTime = null;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const currentVal = startVal + (targetVal - startVal) * progress;
      
      el.textContent = currentVal.toFixed(decimals);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    }

    window.requestAnimationFrame(step);
  }
}

// Export class or attach to window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CarbonDashboard;
} else {
  window.CarbonDashboard = CarbonDashboard;
}
