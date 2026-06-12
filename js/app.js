'use strict';

/**
 * @fileoverview Main Application Controller
 * Orchestrates event binds, form mapping, and storage persistence.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize core modules
  const calculator = new CarbonCalculator();
  const dashboard = new CarbonDashboard(calculator);
  const simulation = new CarbonSimulation(calculator);
  const advisor = new CarbonAdvisor(calculator);

  // Core App State for Action Tracking
  let appState = {
    completedActions: [],
    unlockedBadges: []
  };

  // 2. Load data from LocalStorage if available
  loadUserData();

  // Initialize components
  dashboard.init();
  simulation.init();
  advisor.init();
  
  // Populate form fields with initial values
  populateFormFields();

  // 3. Navigation Tab Switching
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.view-section');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = item.getAttribute('data-view');
      
      // Update active nav item and ARIA selected states
      navItems.forEach(nav => {
        nav.classList.remove('active');
        nav.setAttribute('aria-selected', 'false');
      });
      item.classList.add('active');
      item.setAttribute('aria-selected', 'true');

      // Update active section
      sections.forEach(section => {
        section.classList.remove('active');
        if (section.id === `${targetView}-section`) {
          section.classList.add('active');
        }
      });

      // Special re-renders when switching tabs
      if (targetView === 'dashboard') {
        dashboard.render();
      } else if (targetView === 'simulation') {
        simulation.update();
      } else if (targetView === 'advisor') {
        advisor.renderSuggestions();
      }
    });
  });

  // 4. Calculator Wizard Step Navigation
  let currentStep = 1;
  const totalSteps = 3;
  const stepIndicators = document.querySelectorAll('.step-indicator');
  const wizardPanels = document.querySelectorAll('.wizard-panel');
  const btnPrev = document.getElementById('wizard-prev');
  const btnNext = document.getElementById('wizard-next');

  function updateWizardUI() {
    // Update panels
    wizardPanels.forEach(panel => {
      panel.classList.remove('active');
      if (parseInt(panel.getAttribute('data-step')) === currentStep) {
        panel.classList.add('active');
      }
    });

    // Update indicators
    stepIndicators.forEach((indicator, index) => {
      const stepNum = index + 1;
      indicator.classList.remove('active', 'completed');
      
      const stepLbl = indicator.querySelector('.step-lbl') ? indicator.querySelector('.step-lbl').textContent : '';
      if (stepNum === currentStep) {
        indicator.classList.add('active');
        indicator.setAttribute('aria-label', `Step ${stepNum}: ${stepLbl}, current step`);
      } else if (stepNum < currentStep) {
        indicator.classList.add('completed');
        indicator.setAttribute('aria-label', `Step ${stepNum}: ${stepLbl}, completed`);
      } else {
        indicator.setAttribute('aria-label', `Step ${stepNum}: ${stepLbl}`);
      }
    });

    // Update button states
    if (currentStep === 1) {
      btnPrev.disabled = true;
      btnNext.innerHTML = 'Next Category <i class="fas fa-arrow-right"></i>';
    } else if (currentStep === totalSteps) {
      btnPrev.disabled = false;
      btnNext.innerHTML = 'View Carbon Dashboard <i class="fas fa-check"></i>';
    } else {
      btnPrev.disabled = false;
      btnNext.innerHTML = 'Next Category <i class="fas fa-arrow-right"></i>';
    }
  }

  // Next Button Click
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      if (currentStep < totalSteps) {
        currentStep++;
        updateWizardUI();
      } else {
        // Go to dashboard tab on final step
        document.querySelector('[data-view="dashboard"]').click();
        currentStep = 1; // Reset wizard step for next visit
        updateWizardUI();
      }
    });
  }

  // Prev Button Click
  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (currentStep > 1) {
        currentStep--;
        updateWizardUI();
      }
    });
  }

  // Direct step indicator click navigation
  stepIndicators.forEach((indicator, index) => {
    const selectStep = () => {
      currentStep = index + 1;
      updateWizardUI();
    };
    indicator.addEventListener('click', selectStep);
    indicator.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        selectStep();
      }
    });
  });

  // 5. Form Input Event Bindings (Sync UI fields -> Calculator Engine)
  const inputMappings = {
    // Housing
    'input-electricity': 'electricityKwh',
    'input-gas': 'gasKwh',
    'input-clean-share': 'cleanEnergyShare',
    // Transport
    'input-mileage': 'carMileage',
    'input-fuel-type': 'carFuelType',
    'input-transit': 'publicTransitKm',
    'input-flights': 'flightHours',
    // Consumption
    'input-diet': 'dietType',
    'input-recycling': 'recyclingLevel'
  };

  Object.entries(inputMappings).forEach(([id, stateKey]) => {
    const el = document.getElementById(id);
    if (el) {
      const eventType = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(eventType, () => {
        calculator.update(stateKey, el.value);
        saveUserData();
        dashboard.render();
      });
    }
  });

  // 6. Action Tracker Goal checklist & Gamification Badges
  const actionItems = document.querySelectorAll('.action-item');
  
  function toggleActionItem(item) {
    const actionId = item.getAttribute('data-action-id');
    const isCompleted = item.classList.contains('completed');
    
    if (isCompleted) {
      item.classList.remove('completed');
      item.setAttribute('aria-checked', 'false');
      appState.completedActions = appState.completedActions.filter(id => id !== actionId);
    } else {
      item.classList.add('completed');
      item.setAttribute('aria-checked', 'true');
      appState.completedActions.push(actionId);
    }
    
    // Sync checklist actions to the calculator engine
    calculator.update('completedActions', appState.completedActions);
    
    saveUserData();
    evaluateGoalsAndBadges();
    dashboard.render();
  }

  actionItems.forEach(item => {
    item.addEventListener('click', () => {
      toggleActionItem(item);
    });

    item.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggleActionItem(item);
      }
    });
  });

  // Evaluate badges earned
  function evaluateGoalsAndBadges() {
    const completedCount = appState.completedActions.length;
    const badgeStarter = document.getElementById('badge-starter');
    const badgeAdvocate = document.getElementById('badge-advocate');
    const badgeHero = document.getElementById('badge-hero');

    appState.unlockedBadges = [];

    // Badge 1: Eco Starter (1 goal)
    if (completedCount >= 1) {
      if (badgeStarter) badgeStarter.classList.add('unlocked');
      appState.unlockedBadges.push('starter');
    } else {
      if (badgeStarter) badgeStarter.classList.remove('unlocked');
    }

    // Badge 2: Green Advocate (3 goals)
    if (completedCount >= 3) {
      if (badgeAdvocate) badgeAdvocate.classList.add('unlocked');
      appState.unlockedBadges.push('advocate');
    } else {
      if (badgeAdvocate) badgeAdvocate.classList.remove('unlocked');
    }

    // Badge 3: Climate Hero (5 goals)
    if (completedCount >= 5) {
      if (badgeHero) badgeHero.classList.add('unlocked');
      appState.unlockedBadges.push('hero');
    } else {
      if (badgeHero) badgeHero.classList.remove('unlocked');
    }

    saveUserData();
  }

  // 7. LocalStorage Persistence helpers
  function saveUserData() {
    const userData = {
      calculatorState: calculator.getState(),
      completedActions: appState.completedActions,
      unlockedBadges: appState.unlockedBadges
    };
    localStorage.setItem('carbon_footprint_user_data', JSON.stringify(userData));
  }

  function loadUserData() {
    const stored = localStorage.getItem('carbon_footprint_user_data');
    if (stored) {
      try {
        const userData = JSON.parse(stored);
        
        // Restore calculator state
        if (userData.calculatorState) {
          calculator.updateMultiple(userData.calculatorState);
        }
        
        // Restore action state
        if (userData.completedActions) {
          appState.completedActions = userData.completedActions;
          
          // Sync checklist actions to the calculator engine
          calculator.update('completedActions', appState.completedActions);
          
          // Apply 'completed' class in UI
          actionItems.forEach(item => {
            const actionId = item.getAttribute('data-action-id');
            if (appState.completedActions.includes(actionId)) {
              item.classList.add('completed');
              item.setAttribute('aria-checked', 'true');
            } else {
              item.classList.remove('completed');
              item.setAttribute('aria-checked', 'false');
            }
          });
        }
        
        // Evaluate badges on load
        evaluateGoalsAndBadges();
      } catch (err) {
        console.error("Failed to parse stored user data", err);
      }
    }
  }

  // Populate HTML form controls on page load based on loaded calculator state
  function populateFormFields() {
    const state = calculator.getState();
    
    // Set values in inputs
    setFieldValue('input-electricity', state.electricityKwh);
    setFieldValue('input-gas', state.gasKwh);
    setFieldValue('input-clean-share', state.cleanEnergyShare);
    setFieldValue('input-mileage', state.carMileage);
    setFieldValue('input-fuel-type', state.carFuelType);
    setFieldValue('input-transit', state.publicTransitKm);
    setFieldValue('input-flights', state.flightHours);
    setFieldValue('input-diet', state.dietType);
    setFieldValue('input-recycling', state.recyclingLevel);
  }

  function setFieldValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }
});
