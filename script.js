/**
 * ============================================
 * Baby Care Tracker - JavaScript
 * ============================================
 * 
 * This file contains all the functionality for the Baby Care Tracker application,
 * including IndexedDB operations, timezone management, and user interface controls.
 */

// ============================================
// Global Variables and Constants
// ============================================

let db = null;
let currentSelectedChild = null;
let currentTheme = localStorage.getItem('theme') || 'light';
let currentTimezone = localStorage.getItem('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;

// Database configuration
const DB_NAME = 'BabyCareTracker';
const DB_VERSION = 1;

// Object stores
const STORES = {
  children: 'children',
  feeding: 'feeding',
  sleep: 'sleep',
  diaper: 'diaper',
  health: 'health',
  milestone: 'milestone',
  activity: 'activity',
  interaction: 'interaction'
};

// Record types configuration
const RECORD_TYPES = {
  feeding: {
    name: 'Feeding',
    icon: 'fas fa-bottle-baby',
    color: '#ff7eb3',
    fields: [
      { name: 'type', label: 'Type', type: 'select', options: ['breast', 'formula', 'solid'], required: true },
      { name: 'startTime', label: 'Start Time', type: 'datetime-local', required: true },
      { name: 'endTime', label: 'End Time', type: 'datetime-local' },
      { name: 'quantity', label: 'Quantity (ml/g)', type: 'number', min: 0 },
      { name: 'breast', label: 'Breast', type: 'select', options: ['left', 'right', 'both'], showIf: 'type=breast' }
    ]
  },
  sleep: {
    name: 'Sleep',
    icon: 'fas fa-bed',
    color: '#7eb3ff',
    fields: [
      { name: 'startTime', label: 'Start Time', type: 'datetime-local', required: true },
      { name: 'endTime', label: 'End Time', type: 'datetime-local', required: true }
    ]
  },
  diaper: {
    name: 'Diaper',
    icon: 'fas fa-baby',
    color: '#ffb347',
    fields: [
      { name: 'time', label: 'Time', type: 'datetime-local', required: true },
      { name: 'type', label: 'Type', type: 'select', options: ['wet', 'poop', 'mixed'], required: true }
    ]
  },
  health: {
    name: 'Health',
    icon: 'fas fa-stethoscope',
    color: '#7cb342',
    fields: [
      { name: 'type', label: 'Type', type: 'select', options: ['vaccination', 'medication', 'illness', 'checkup'], required: true },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'temperature', label: 'Temperature (°C)', type: 'number', step: 0.1 },
      { name: 'temperatureMethod', label: 'Measurement Method', type: 'select', options: ['oral', 'rectal', 'ear', 'forehead'] },
      { name: 'medication', label: 'Medication', type: 'text', showIf: 'type=medication' },
      { name: 'dosage', label: 'Dosage', type: 'text', showIf: 'type=medication' }
    ]
  },
  milestone: {
    name: 'Milestone',
    icon: 'fas fa-star',
    color: '#e57373',
    fields: [
      { name: 'category', label: 'Category', type: 'select', options: ['motor', 'language', 'social', 'cognitive', 'self-care', 'custom'], required: true },
      { name: 'title', label: 'Milestone', type: 'text', required: true },
      { name: 'date', label: 'Achievement Date', type: 'date', required: true },
      { name: 'description', label: 'Description', type: 'textarea' }
    ]
  },
  activity: {
    name: 'Activity',
    icon: 'fas fa-play',
    color: '#ffa726',
    fields: [
      { name: 'type', label: 'Activity Type', type: 'select', options: ['bath', 'massage', 'changing', 'tummy-time', 'sensory-play', 'reading', 'music', 'walk', 'sunbath', 'social', 'custom'], required: true },
      { name: 'startTime', label: 'Start Time', type: 'datetime-local', required: true },
      { name: 'duration', label: 'Duration (minutes)', type: 'number', min: 1 },
      { name: 'customActivity', label: 'Custom Activity', type: 'text', showIf: 'type=custom' }
    ]
  },
  interaction: {
    name: 'Interaction',
    icon: 'fas fa-heart',
    color: '#ab47bc',
    fields: [
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'emotionalState', label: 'Emotional State', type: 'select', options: ['happy', 'calm', 'fussy', 'crying', 'sleepy', 'alert'], required: true },
      { name: 'event', label: 'Interaction Event', type: 'textarea', required: true },
      { name: 'photo', label: 'Photo', type: 'file', accept: 'image/*' }
    ]
  }
};

// Pre-defined milestones by category
const PREDEFINED_MILESTONES = {
  motor: [
    'Lifts head when lying on stomach',
    'Rolls over from tummy to back',
    'Sits without support',
    'Crawls',
    'Pulls to stand',
    'Walks independently',
    'Runs',
    'Jumps with both feet',
    'Rides a tricycle'
  ],
  language: [
    'Responds to sounds',
    'Makes babbling sounds',
    'Says first word',
    'Says "mama" or "dada"',
    'Points to body parts when named',
    'Follows simple instructions',
    'Says 2-word phrases',
    'Asks simple questions',
    'Uses complete sentences'
  ],
  social: [
    'Makes eye contact',
    'Smiles responsively',
    'Shows stranger anxiety',
    'Plays peek-a-boo',
    'Waves goodbye',
    'Shows affection',
    'Plays alongside other children',
    'Shares toys',
    'Takes turns'
  ],
  cognitive: [
    'Tracks objects with eyes',
    'Recognizes familiar faces',
    'Shows curiosity about surroundings',
    'Imitates actions',
    'Finds hidden objects',
    'Sorts shapes and colors',
    'Understands cause and effect',
    'Solves simple problems',
    'Pretend play'
  ],
  'self-care': [
    'Drinks from a cup',
    'Feeds themselves finger foods',
    'Uses a spoon',
    'Indicates wet diaper',
    'Shows interest in potty',
    'Stays dry during day',
    'Washes hands with help',
    'Brushes teeth with help',
    'Dresses themselves'
  ]
};

// Available timezones (common ones)
const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (New York)' },
  { value: 'America/Chicago', label: 'Central Time (Chicago)' },
  { value: 'America/Denver', label: 'Mountain Time (Denver)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (London)' },
  { value: 'Europe/Paris', label: 'Central European Time (Paris)' },
  { value: 'Europe/Berlin', label: 'Central European Time (Berlin)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (Tokyo)' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (Shanghai)' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (Kolkata)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (Sydney)' },
  { value: 'America/Sao_Paulo', label: 'Brasília Time (São Paulo)' },
  { value: 'UTC', label: 'Coordinated Universal Time (UTC)' }
];

// ============================================
// Utility Functions
// ============================================

/**
 * Format timestamp according to user's timezone
 * @param {Date|string|number} timestamp - The timestamp to format
 * @param {string} format - Format type ('date', 'time', 'datetime', 'relative')
 * @returns {string} Formatted timestamp
 */
function formatTimestamp(timestamp, format = 'datetime') {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const options = { timeZone: currentTimezone };
  
  switch (format) {
    case 'date':
      return date.toLocaleDateString('en-US', { ...options, year: 'numeric', month: 'short', day: 'numeric' });
    case 'time':
      return date.toLocaleTimeString('en-US', { ...options, hour: '2-digit', minute: '2-digit' });
    case 'datetime':
      return date.toLocaleDateString('en-US', { 
        ...options, 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    case 'relative':
      return getRelativeTime(date);
    default:
      return date.toLocaleDateString('en-US', options);
  }
}

/**
 * Get relative time string (e.g., "2 hours ago")
 * @param {Date} date - The date to compare
 * @returns {string} Relative time string
 */
function getRelativeTime(date) {
  const now = new Date();
  const diffInMs = now - date;
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  
  return formatTimestamp(date, 'date');
}

/**
 * Calculate age from birth date
 * @param {Date|string} birthDate - The birth date
 * @returns {string} Formatted age string
 */
function calculateAge(birthDate) {
  const birth = new Date(birthDate);
  const now = new Date();
  const ageInMs = now - birth;
  const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
  const ageInWeeks = Math.floor(ageInDays / 7);
  const ageInMonths = Math.floor(ageInDays / 30.44); // Average days per month
  const ageInYears = Math.floor(ageInDays / 365.25); // Account for leap years
  
  if (ageInDays < 14) return `${ageInDays} day${ageInDays !== 1 ? 's' : ''}`;
  if (ageInWeeks < 8) return `${ageInWeeks} week${ageInWeeks !== 1 ? 's' : ''}`;
  if (ageInMonths < 24) return `${ageInMonths} month${ageInMonths !== 1 ? 's' : ''}`;
  
  const years = Math.floor(ageInYears);
  const months = Math.floor((ageInDays % 365.25) / 30.44);
  
  if (months === 0) return `${years} year${years !== 1 ? 's' : ''}`;
  return `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
}

/**
 * Convert file to base64 string
 * @param {File} file - The file to convert
 * @returns {Promise<string>} Base64 string
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Show loading spinner
 */
function showLoading() {
  document.getElementById('loading-spinner').classList.add('show');
}

/**
 * Hide loading spinner
 */
function hideLoading() {
  document.getElementById('loading-spinner').classList.remove('show');
}

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type ('success', 'warning', 'error')
 * @param {number} duration - Duration in milliseconds
 */
function showToast(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const iconMap = {
    success: 'fas fa-check-circle',
    warning: 'fas fa-exclamation-triangle',
    error: 'fas fa-times-circle'
  };
  
  toast.innerHTML = `
    <i class="toast-icon ${iconMap[type]}"></i>
    <div class="toast-content">
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close">&times;</button>
  `;
  
  // Add event listener for close button
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.remove();
  });
  
  container.appendChild(toast);
  
  // Auto-remove after duration
  setTimeout(() => {
    if (toast.parentNode) {
      toast.remove();
    }
  }, duration);
}

// ============================================
// IndexedDB Functions
// ============================================

/**
 * Initialize IndexedDB
 * @returns {Promise<IDBDatabase>} Database instance
 */
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores if they don't exist
      Object.values(STORES).forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: 'id' });
          
          // Create indexes based on store type
          switch (storeName) {
            case STORES.children:
              store.createIndex('name', 'name', { unique: false });
              store.createIndex('birthDate', 'birthDate', { unique: false });
              break;
            default:
              store.createIndex('childId', 'childId', { unique: false });
              store.createIndex('timestamp', 'timestamp', { unique: false });
              if (storeName !== STORES.milestone) {
                store.createIndex('date', 'date', { unique: false });
              }
              break;
          }
        }
      });
    };
  });
}

/**
 * Add or update a record in IndexedDB
 * @param {string} storeName - Object store name
 * @param {object} data - Data to store
 * @returns {Promise<string>} Record ID
 */
function saveRecord(storeName, data) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    // Add metadata
    const record = {
      ...data,
      id: data.id || generateId(),
      timestamp: data.timestamp || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const request = store.put(record);
    
    request.onsuccess = () => resolve(record.id);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get record by ID from IndexedDB
 * @param {string} storeName - Object store name
 * @param {string} id - Record ID
 * @returns {Promise<object|null>} Record data
 */
function getRecord(storeName, id) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);
    
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all records from IndexedDB with optional filtering
 * @param {string} storeName - Object store name
 * @param {object} filters - Filter conditions
 * @returns {Promise<Array>} Array of records
 */
function getRecords(storeName, filters = {}) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    request.onsuccess = () => {
      let records = request.result || [];
      
      // Apply filters
      if (filters.childId) {
        records = records.filter(record => record.childId === filters.childId);
      }
      
      if (filters.startDate && filters.endDate) {
        const start = new Date(filters.startDate);
        const end = new Date(filters.endDate);
        records = records.filter(record => {
          const recordDate = new Date(record.date || record.timestamp);
          return recordDate >= start && recordDate <= end;
        });
      }
      
      if (filters.type) {
        records = records.filter(record => record.type === filters.type);
      }
      
      // Sort by timestamp/date (newest first)
      records.sort((a, b) => {
        const dateA = new Date(a.date || a.timestamp);
        const dateB = new Date(b.date || b.timestamp);
        return dateB - dateA;
      });
      
      resolve(records);
    };
    
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete record from IndexedDB
 * @param {string} storeName - Object store name
 * @param {string} id - Record ID
 * @returns {Promise<void>}
 */
function deleteRecord(storeName, id) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get records for today
 * @param {string} storeName - Object store name
 * @param {string} childId - Child ID (optional)
 * @returns {Promise<Array>} Today's records
 */
function getTodayRecords(storeName, childId = null) {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  
  const filters = {
    startDate: startOfDay,
    endDate: endOfDay
  };
  
  if (childId) {
    filters.childId = childId;
  }
  
  return getRecords(storeName, filters);
}

/**
 * Export all data as JSON
 * @returns {Promise<object>} Exported data
 */
async function exportData() {
  const data = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    timezone: currentTimezone,
    children: await getRecords(STORES.children),
    feeding: await getRecords(STORES.feeding),
    sleep: await getRecords(STORES.sleep),
    diaper: await getRecords(STORES.diaper),
    health: await getRecords(STORES.health),
    milestone: await getRecords(STORES.milestone),
    activity: await getRecords(STORES.activity),
    interaction: await getRecords(STORES.interaction)
  };
  
  return data;
}

/**
 * Import data from JSON
 * @param {object} data - Data to import
 * @returns {Promise<void>}
 */
async function importData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data format');
  }
  
  try {
    // Import children first
    if (data.children && Array.isArray(data.children)) {
      for (const child of data.children) {
        await saveRecord(STORES.children, child);
      }
    }
    
    // Import all record types
    const recordTypes = [STORES.feeding, STORES.sleep, STORES.diaper, STORES.health, STORES.milestone, STORES.activity, STORES.interaction];
    
    for (const recordType of recordTypes) {
      if (data[recordType] && Array.isArray(data[recordType])) {
        for (const record of data[recordType]) {
          await saveRecord(recordType, record);
        }
      }
    }
    
    showToast('Data imported successfully', 'success');
    await refreshAll();
  } catch (error) {
    console.error('Import error:', error);
    showToast('Failed to import data: ' + error.message, 'error');
  }
}

// ============================================
// Theme and Settings Functions
// ============================================

/**
 * Apply theme to the application
 * @param {string} theme - Theme name ('light' or 'dark')
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  currentTheme = theme;
  localStorage.setItem('theme', theme);
  
  // Update theme toggle icon
  const themeToggle = document.querySelector('.theme-toggle i');
  if (themeToggle) {
    themeToggle.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  }
}

/**
 * Toggle between light and dark themes
 */
function toggleTheme() {
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(newTheme);
}

/**
 * Update timezone
 * @param {string} timezone - New timezone
 */
function updateTimezone(timezone) {
  currentTimezone = timezone;
  localStorage.setItem('timezone', timezone);
  
  // Refresh displays that show time
  refreshDashboard();
  refreshRecords();
}

/**
 * Populate timezone select options
 */
function populateTimezones() {
  const select = document.getElementById('timezone-select');
  if (!select) return;
  
  // Clear existing options
  select.innerHTML = '';
  
  // Add timezone options
  TIMEZONES.forEach(tz => {
    const option = document.createElement('option');
    option.value = tz.value;
    option.textContent = tz.label;
    option.selected = tz.value === currentTimezone;
    select.appendChild(option);
  });
}

// ============================================
// Navigation Functions
// ============================================

/**
 * Switch to a specific tab
 * @param {string} tabId - Tab ID to switch to
 */
function switchTab(tabId) {
  // Remove active class from all tabs and content
  document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  
  // Add active class to selected tab and content
  const activeTab = document.querySelector(`[data-tab="${tabId}"]`);
  const activeContent = document.getElementById(tabId);
  
  if (activeTab && activeContent) {
    activeTab.classList.add('active');
    activeContent.classList.add('active');
    
    // Refresh content based on tab
    switch (tabId) {
      case 'dashboard':
        refreshDashboard();
        break;
      case 'children':
        refreshChildren();
        break;
      case 'records':
        refreshRecords();
        break;
      case 'charts':
        refreshCharts();
        break;
    }
  }
}

// ============================================
// Modal Functions
// ============================================

/**
 * Show modal
 * @param {string} modalId - Modal ID
 */
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Focus first input if available
    const firstInput = modal.querySelector('input, select, textarea');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  }
}

/**
 * Hide modal
 * @param {string} modalId - Modal ID
 */
function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    
    // Reset form if exists
    const form = modal.querySelector('form');
    if (form) {
      form.reset();
      clearFormErrors(form);
    }
  }
}

/**
 * Clear form errors
 * @param {HTMLFormElement} form - Form element
 */
function clearFormErrors(form) {
  form.querySelectorAll('.form-error').forEach(error => error.remove());
  form.querySelectorAll('.error').forEach(field => field.classList.remove('error'));
}

/**
 * Show form error
 * @param {HTMLElement} field - Form field with error
 * @param {string} message - Error message
 */
function showFormError(field, message) {
  // Remove existing errors for this field
  const existingError = field.parentNode.querySelector('.form-error');
  if (existingError) {
    existingError.remove();
  }
  
  // Add error class
  field.classList.add('error');
  
  // Create error element
  const errorElement = document.createElement('div');
  errorElement.className = 'form-error';
  errorElement.textContent = message;
  errorElement.style.color = 'var(--error-color)';
  errorElement.style.fontSize = 'var(--font-size-sm)';
  errorElement.style.marginTop = 'var(--spacing-xs)';
  
  // Insert after the field
  field.parentNode.insertBefore(errorElement, field.nextSibling);
}

// ============================================
// Dashboard Functions
// ============================================

/**
 * Refresh dashboard content
 */
async function refreshDashboard() {
  try {
    showLoading();
    await updateChildSelector();
    await updateTodaySummary();
    await updateRecentRecords();
  } catch (error) {
    console.error('Error refreshing dashboard:', error);
    showToast('Failed to refresh dashboard', 'error');
  } finally {
    hideLoading();
  }
}

/**
 * Update child selector dropdown
 */
async function updateChildSelector() {
  const selector = document.getElementById('child-selector');
  if (!selector) return;
  
  try {
    const children = await getRecords(STORES.children);
    
    // Clear existing options except the first one
    while (selector.children.length > 1) {
      selector.removeChild(selector.lastChild);
    }
    
    // Add children options
    children.forEach(child => {
      const option = document.createElement('option');
      option.value = child.id;
      option.textContent = child.name;
      if (child.id === currentSelectedChild) {
        option.selected = true;
      }
      selector.appendChild(option);
    });
    
    // If no child is selected but children exist, select the first one
    if (!currentSelectedChild && children.length > 0) {
      currentSelectedChild = children[0].id;
      selector.value = currentSelectedChild;
    }
  } catch (error) {
    console.error('Error updating child selector:', error);
  }
}

/**
 * Update today's summary statistics
 */
async function updateTodaySummary() {
  if (!currentSelectedChild) {
    // Clear summary if no child selected
    document.getElementById('today-feedings').textContent = '0';
    document.getElementById('today-sleep').textContent = '0h';
    document.getElementById('today-diapers').textContent = '0';
    return;
  }
  
  try {
    // Get today's records for selected child
    const [feedings, sleeps, diapers] = await Promise.all([
      getTodayRecords(STORES.feeding, currentSelectedChild),
      getTodayRecords(STORES.sleep, currentSelectedChild),
      getTodayRecords(STORES.diaper, currentSelectedChild)
    ]);
    
    // Update feeding count
    document.getElementById('today-feedings').textContent = feedings.length;
    
    // Calculate total sleep time
    let totalSleepMinutes = 0;
    sleeps.forEach(sleep => {
      if (sleep.startTime && sleep.endTime) {
        const start = new Date(sleep.startTime);
        const end = new Date(sleep.endTime);
        totalSleepMinutes += (end - start) / (1000 * 60);
      }
    });
    const sleepHours = Math.floor(totalSleepMinutes / 60);
    const sleepMinutes = Math.floor(totalSleepMinutes % 60);
    document.getElementById('today-sleep').textContent = 
      sleepMinutes === 0 ? `${sleepHours}h` : `${sleepHours}h ${sleepMinutes}m`;
    
    // Update diaper count
    document.getElementById('today-diapers').textContent = diapers.length;
  } catch (error) {
    console.error('Error updating today summary:', error);
  }
}

/**
 * Update recent records list
 */
async function updateRecentRecords() {
  const container = document.getElementById('recent-records');
  if (!container) return;
  
  container.innerHTML = '';
  
  if (!currentSelectedChild) {
    container.innerHTML = '<p class="text-center text-secondary">Select a child to see recent records</p>';
    return;
  }
  
  try {
    // Get recent records from all types
    const allRecords = [];
    
    for (const [storeName, storeKey] of Object.entries(STORES)) {
      if (storeName === 'children') continue;
      
      const records = await getRecords(storeKey, { childId: currentSelectedChild });
      records.forEach(record => {
        record._type = storeName;
        allRecords.push(record);
      });
    }
    
    // Sort by timestamp (newest first)
    allRecords.sort((a, b) => {
      const dateA = new Date(a.date || a.timestamp);
      const dateB = new Date(b.date || b.timestamp);
      return dateB - dateA;
    });
    
    // Show only last 5 records
    const recentRecords = allRecords.slice(0, 5);
    
    if (recentRecords.length === 0) {
      container.innerHTML = '<p class="text-center text-secondary">No recent records</p>';
      return;
    }
    
    recentRecords.forEach(record => {
      const recordConfig = RECORD_TYPES[record._type];
      if (!recordConfig) return;
      
      const recordElement = document.createElement('div');
      recordElement.className = 'recent-record-item';
      recordElement.innerHTML = `
        <div class="recent-record-info">
          <div class="recent-record-icon ${record._type}" style="background-color: ${recordConfig.color}">
            <i class="${recordConfig.icon}"></i>
          </div>
          <div class="recent-record-details">
            <div class="recent-record-title">
              ${recordConfig.name}${record.type ? ` - ${record.type}` : ''}
            </div>
            <div class="recent-record-time">
              ${formatTimestamp(record.date || record.startTime || record.time || record.timestamp, 'relative')}
            </div>
          </div>
        </div>
      `;
      
      container.appendChild(recordElement);
    });
  } catch (error) {
    console.error('Error updating recent records:', error);
    container.innerHTML = '<p class="text-center text-error">Failed to load recent records</p>';
  }
}

// ============================================
// Children Management Functions
// ============================================

/**
 * Refresh children list
 */
async function refreshChildren() {
  const container = document.getElementById('children-list');
  if (!container) return;
  
  try {
    showLoading();
    const children = await getRecords(STORES.children);
    
    container.innerHTML = '';
    
    if (children.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-baby" style="font-size: 4rem; color: var(--text-light); margin-bottom: 1rem;"></i>
          <h3>No children added yet</h3>
          <p>Add your first child to start tracking their care.</p>
        </div>
      `;
      return;
    }
    
    // Get today's records for each child to show summary
    for (const child of children) {
      const [feedings, sleeps, diapers] = await Promise.all([
        getTodayRecords(STORES.feeding, child.id),
        getTodayRecords(STORES.sleep, child.id),
        getTodayRecords(STORES.diaper, child.id)
      ]);
      
      const childCard = document.createElement('div');
      childCard.className = 'child-card';
      childCard.innerHTML = `
        <div class="child-card-header">
          <div class="child-photo">
            ${child.photo 
              ? `<img src="${child.photo}" alt="${child.name}">` 
              : `<i class="fas fa-baby"></i>`
            }
          </div>
          <div class="child-name">${child.name}</div>
          <div class="child-age">${calculateAge(child.birthDate)}</div>
        </div>
        <div class="child-card-body">
          <div class="child-stats">
            <div class="child-stat">
              <span class="child-stat-value">${feedings.length}</span>
              <span class="child-stat-label">Feedings Today</span>
            </div>
            <div class="child-stat">
              <span class="child-stat-value">${sleeps.length}</span>
              <span class="child-stat-label">Sleep Sessions</span>
            </div>
            <div class="child-stat">
              <span class="child-stat-value">${diapers.length}</span>
              <span class="child-stat-label">Diaper Changes</span>
            </div>
            <div class="child-stat">
              <span class="child-stat-value">${child.gender || 'Not set'}</span>
              <span class="child-stat-label">Gender</span>
            </div>
          </div>
          <div class="child-actions">
            <button class="child-action-btn" onclick="selectChild('${child.id}')">
              <i class="fas fa-eye"></i>
              Select
            </button>
            <button class="child-action-btn" onclick="editChild('${child.id}')">
              <i class="fas fa-edit"></i>
              Edit
            </button>
            <button class="child-action-btn" onclick="deleteChild('${child.id}')">
              <i class="fas fa-trash"></i>
              Delete
            </button>
          </div>
        </div>
      `;
      
      container.appendChild(childCard);
    }
  } catch (error) {
    console.error('Error refreshing children:', error);
    showToast('Failed to load children', 'error');
  } finally {
    hideLoading();
  }
}

/**
 * Show add/edit child modal
 * @param {string|null} childId - Child ID for editing, null for adding
 */
async function showChildModal(childId = null) {
  const modal = document.getElementById('child-modal');
  const title = document.getElementById('child-modal-title');
  const form = document.getElementById('child-form');
  
  if (!modal || !title || !form) return;
  
  // Reset form
  form.reset();
  clearFormErrors(form);
  
  // Update modal title
  title.textContent = childId ? 'Edit Child' : 'Add Child';
  
  // If editing, populate form with existing data
  if (childId) {
    try {
      const child = await getRecord(STORES.children, childId);
      if (child) {
        document.getElementById('child-name').value = child.name || '';
        document.getElementById('child-birth-date').value = child.birthDate || '';
        document.getElementById('child-gender').value = child.gender || '';
        document.getElementById('child-notes').value = child.notes || '';
        
        if (child.photo) {
          const preview = document.getElementById('child-photo-preview');
          preview.innerHTML = `<img src="${child.photo}" alt="Child photo">`;
        }
        
        // Store child ID in form for later use
        form.dataset.childId = childId;
      }
    } catch (error) {
      console.error('Error loading child data:', error);
      showToast('Failed to load child data', 'error');
      return;
    }
  } else {
    delete form.dataset.childId;
  }
  
  showModal('child-modal');
}

/**
 * Save child data
 * @param {HTMLFormElement} form - Child form element
 */
async function saveChild(form) {
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  try {
    showLoading();
    
    const formData = new FormData(form);
    const isEditing = !!form.dataset.childId;
    
    // Prepare child data
    const childData = {
      name: formData.get('name'),
      birthDate: formData.get('birthDate'),
      gender: formData.get('gender') || null,
      notes: formData.get('notes') || null
    };
    
    // Handle photo upload
    const photoFile = document.getElementById('child-photo').files[0];
    if (photoFile) {
      try {
        childData.photo = await fileToBase64(photoFile);
      } catch (error) {
        console.error('Error processing photo:', error);
        showToast('Failed to process photo', 'warning');
      }
    } else if (!isEditing) {
      childData.photo = null;
    }
    
    // If editing, include the existing ID
    if (isEditing) {
      childData.id = form.dataset.childId;
    }
    
    // Save to database
    const childId = await saveRecord(STORES.children, childData);
    
    hideModal('child-modal');
    showToast(isEditing ? 'Child updated successfully' : 'Child added successfully', 'success');
    
    // Update UI
    await refreshChildren();
    await updateChildSelector();
    
    // If this was a new child and no child was selected, select this one
    if (!isEditing && !currentSelectedChild) {
      currentSelectedChild = childId;
      await refreshDashboard();
    }
  } catch (error) {
    console.error('Error saving child:', error);
    showToast('Failed to save child', 'error');
  } finally {
    hideLoading();
  }
}

/**
 * Select a child
 * @param {string} childId - Child ID to select
 */
async function selectChild(childId) {
  currentSelectedChild = childId;
  
  // Update child selector
  const selector = document.getElementById('child-selector');
  if (selector) {
    selector.value = childId;
  }
  
  // Refresh dashboard and switch to it
  switchTab('dashboard');
  showToast('Child selected', 'success');
}

/**
 * Edit a child
 * @param {string} childId - Child ID to edit
 */
function editChild(childId) {
  showChildModal(childId);
}

/**
 * Delete a child
 * @param {string} childId - Child ID to delete
 */
async function deleteChild(childId) {
  if (!confirm('Are you sure you want to delete this child? This action cannot be undone and will also delete all related records.')) {
    return;
  }
  
  try {
    showLoading();
    
    // Delete the child
    await deleteRecord(STORES.children, childId);
    
    // Delete all related records
    const recordTypes = [STORES.feeding, STORES.sleep, STORES.diaper, STORES.health, STORES.milestone, STORES.activity, STORES.interaction];
    
    for (const recordType of recordTypes) {
      const records = await getRecords(recordType, { childId });
      for (const record of records) {
        await deleteRecord(recordType, record.id);
      }
    }
    
    // Update current selection if this child was selected
    if (currentSelectedChild === childId) {
      currentSelectedChild = null;
    }
    
    showToast('Child deleted successfully', 'success');
    
    // Refresh UI
    await refreshChildren();
    await updateChildSelector();
    await refreshDashboard();
  } catch (error) {
    console.error('Error deleting child:', error);
    showToast('Failed to delete child', 'error');
  } finally {
    hideLoading();
  }
}

// ============================================
// Records Management Functions
// ============================================

/**
 * Show add/edit record modal
 * @param {string} recordType - Type of record
 * @param {string|null} recordId - Record ID for editing, null for adding
 */
async function showRecordModal(recordType, recordId = null) {
  const modal = document.getElementById('record-modal');
  const title = document.getElementById('record-modal-title');
  const form = document.getElementById('record-form');
  const fieldsContainer = document.getElementById('dynamic-form-fields');
  
  if (!modal || !title || !form || !fieldsContainer) return;
  
  const recordConfig = RECORD_TYPES[recordType];
  if (!recordConfig) {
    showToast('Invalid record type', 'error');
    return;
  }
  
  // Reset form
  form.reset();
  clearFormErrors(form);
  fieldsContainer.innerHTML = '';
  
  // Update modal title
  title.textContent = `${recordId ? 'Edit' : 'Add'} ${recordConfig.name}`;
  
  // Update child selector in record form
  await updateRecordChildSelector();
  
  // Generate dynamic form fields
  recordConfig.fields.forEach(field => {
    const fieldGroup = createFormField(field);
    fieldsContainer.appendChild(fieldGroup);
  });
  
  // Set up conditional field visibility
  setupConditionalFields(fieldsContainer, recordConfig.fields);
  
  // If editing, populate form with existing data
  if (recordId) {
    try {
      const recordStoreName = STORES[recordType];
      const record = await getRecord(recordStoreName, recordId);
      if (record) {
        populateForm(form, record);
        form.dataset.recordId = recordId;
        form.dataset.recordType = recordType;
      }
    } catch (error) {
      console.error('Error loading record data:', error);
      showToast('Failed to load record data', 'error');
      return;
    }
  } else {
    form.dataset.recordType = recordType;
    delete form.dataset.recordId;
    
    // Pre-select current child if available
    if (currentSelectedChild) {
      document.getElementById('record-child').value = currentSelectedChild;
    }
    
    // Set default values for time fields to current time
    const now = new Date();
    const timeFields = form.querySelectorAll('input[type="datetime-local"], input[type="date"]');
    timeFields.forEach(field => {
      if (field.name.includes('time') || field.name === 'date') {
        if (field.type === 'datetime-local') {
          // Format for datetime-local input
          const offset = now.getTimezoneOffset() * 60000;
          const localISOTime = new Date(now - offset).toISOString().slice(0, 16);
          field.value = localISOTime;
        } else if (field.type === 'date') {
          // Format for date input
          field.value = now.toISOString().slice(0, 10);
        }
      }
    });
  }
  
  showModal('record-modal');
}

/**
 * Create form field HTML
 * @param {object} fieldConfig - Field configuration
 * @returns {HTMLElement} Form field element
 */
function createFormField(fieldConfig) {
  const group = document.createElement('div');
  group.className = 'form-group';
  if (fieldConfig.showIf) {
    group.dataset.showIf = fieldConfig.showIf;
    group.style.display = 'none';
  }
  
  const label = document.createElement('label');
  label.textContent = fieldConfig.label + (fieldConfig.required ? ' *' : '');
  label.setAttribute('for', `record-${fieldConfig.name}`);
  
  let input;
  
  switch (fieldConfig.type) {
    case 'select':
      input = document.createElement('select');
      input.innerHTML = '<option value="">Select...</option>';
      fieldConfig.options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option.charAt(0).toUpperCase() + option.slice(1);
        input.appendChild(optionElement);
      });
      break;
    
    case 'textarea':
      input = document.createElement('textarea');
      input.rows = 3;
      break;
    
    case 'file':
      input = document.createElement('input');
      input.type = 'file';
      if (fieldConfig.accept) {
        input.accept = fieldConfig.accept;
      }
      break;
    
    default:
      input = document.createElement('input');
      input.type = fieldConfig.type;
      if (fieldConfig.min !== undefined) input.min = fieldConfig.min;
      if (fieldConfig.max !== undefined) input.max = fieldConfig.max;
      if (fieldConfig.step !== undefined) input.step = fieldConfig.step;
      break;
  }
  
  input.id = `record-${fieldConfig.name}`;
  input.name = fieldConfig.name;
  if (fieldConfig.required) {
    input.required = true;
  }
  
  group.appendChild(label);
  group.appendChild(input);
  
  return group;
}

/**
 * Setup conditional field visibility
 * @param {HTMLElement} container - Form fields container
 * @param {Array} fields - Field configurations
 */
function setupConditionalFields(container, fields) {
  const conditionalFields = fields.filter(field => field.showIf);
  
  if (conditionalFields.length === 0) return;
  
  // Add change listeners to fields that control visibility
  conditionalFields.forEach(condField => {
    const [controlFieldName, expectedValue] = condField.showIf.split('=');
    const controlField = container.querySelector(`[name="${controlFieldName}"]`);
    const targetField = container.querySelector(`[data-show-if="${condField.showIf}"]`);
    
    if (controlField && targetField) {
      const updateVisibility = () => {
        const shouldShow = controlField.value === expectedValue;
        targetField.style.display = shouldShow ? 'block' : 'none';
        
        // Clear value if hiding
        if (!shouldShow) {
          const input = targetField.querySelector('input, select, textarea');
          if (input) {
            input.value = '';
          }
        }
      };
      
      controlField.addEventListener('change', updateVisibility);
      updateVisibility(); // Initial check
    }
  });
}

/**
 * Populate form with record data
 * @param {HTMLFormElement} form - Form element
 * @param {object} record - Record data
 */
function populateForm(form, record) {
  Object.keys(record).forEach(key => {
    const field = form.querySelector(`[name="${key}"]`);
    if (field && key !== 'id') {
      if (field.type === 'file') {
        // Handle file fields separately
        return;
      } else if (field.type === 'datetime-local') {
        // Format datetime for datetime-local input
        if (record[key]) {
          const date = new Date(record[key]);
          const offset = date.getTimezoneOffset() * 60000;
          const localISOTime = new Date(date - offset).toISOString().slice(0, 16);
          field.value = localISOTime;
        }
      } else {
        field.value = record[key] || '';
      }
    }
  });
  
  // Trigger conditional field updates
  form.querySelectorAll('select, input[type="radio"]').forEach(field => {
    field.dispatchEvent(new Event('change'));
  });
}

/**
 * Update child selector in record form
 */
async function updateRecordChildSelector() {
  const selector = document.getElementById('record-child');
  if (!selector) return;
  
  try {
    const children = await getRecords(STORES.children);
    
    // Clear existing options except the first one
    while (selector.children.length > 1) {
      selector.removeChild(selector.lastChild);
    }
    
    // Add children options
    children.forEach(child => {
      const option = document.createElement('option');
      option.value = child.id;
      option.textContent = child.name;
      selector.appendChild(option);
    });
  } catch (error) {
    console.error('Error updating record child selector:', error);
  }
}

/**
 * Save record data
 * @param {HTMLFormElement} form - Record form element
 */
async function saveRecord(form) {
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  const recordType = form.dataset.recordType;
  const recordConfig = RECORD_TYPES[recordType];
  
  if (!recordConfig) {
    showToast('Invalid record type', 'error');
    return;
  }
  
  try {
    showLoading();
    
    const formData = new FormData(form);
    const isEditing = !!form.dataset.recordId;
    
    // Prepare record data
    const recordData = {
      childId: formData.get('childId')
    };
    
    // Process form fields
    for (const field of recordConfig.fields) {
      const value = formData.get(field.name);
      
      if (field.type === 'file' && value) {
        // Handle file upload
        const fileInput = form.querySelector(`[name="${field.name}"]`);
        const file = fileInput.files[0];
        if (file) {
          try {
            recordData[field.name] = await fileToBase64(file);
          } catch (error) {
            console.error('Error processing file:', error);
            showToast('Failed to process file', 'warning');
          }
        }
      } else if (field.type === 'number') {
        recordData[field.name] = value ? parseFloat(value) : null;
      } else {
        recordData[field.name] = value || null;
      }
    }
    
    // Add notes
    recordData.notes = formData.get('notes') || null;
    
    // If editing, include the existing ID
    if (isEditing) {
      recordData.id = form.dataset.recordId;
    }
    
    // Save to database
    const storeName = STORES[recordType];
    await saveRecord(storeName, recordData);
    
    hideModal('record-modal');
    showToast(
      `${recordConfig.name} ${isEditing ? 'updated' : 'recorded'} successfully`, 
      'success'
    );
    
    // Update UI
    await refreshRecords();
    await refreshDashboard();
  } catch (error) {
    console.error('Error saving record:', error);
    showToast('Failed to save record', 'error');
  } finally {
    hideLoading();
  }
}

/**
 * Refresh records list
 */
async function refreshRecords() {
  const container = document.getElementById('records-container');
  if (!container) return;
  
  try {
    showLoading();
    
    // Get filter values
    const typeFilter = document.getElementById('record-type-filter').value;
    const dateFilter = document.getElementById('record-date-filter').value;
    
    // Get all records
    let allRecords = [];
    
    for (const [recordType, storeName] of Object.entries(STORES)) {
      if (recordType === 'children') continue;
      
      const filters = {};
      if (dateFilter) {
        const date = new Date(dateFilter);
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
        filters.startDate = startOfDay;
        filters.endDate = endOfDay;
      }
      
      if (!typeFilter || typeFilter === recordType) {
        const records = await getRecords(storeName, filters);
        records.forEach(record => {
          record._type = recordType;
          allRecords.push(record);
        });
      }
    }
    
    // Get children data for names
    const children = await getRecords(STORES.children);
    const childrenMap = children.reduce((map, child) => {
      map[child.id] = child;
      return map;
    }, {});
    
    // Sort by timestamp (newest first)
    allRecords.sort((a, b) => {
      const dateA = new Date(a.date || a.timestamp);
      const dateB = new Date(b.date || b.timestamp);
      return dateB - dateA;
    });
    
    // Clear container
    container.innerHTML = '';
    
    if (allRecords.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-clipboard" style="font-size: 4rem; color: var(--text-light); margin-bottom: 1rem;"></i>
          <h3>No records found</h3>
          <p>Start recording your baby's activities to see them here.</p>
        </div>
      `;
      return;
    }
    
    // Render records
    allRecords.forEach(record => {
      const recordConfig = RECORD_TYPES[record._type];
      const child = childrenMap[record.childId];
      
      if (!recordConfig) return;
      
      const recordElement = createRecordElement(record, recordConfig, child);
      container.appendChild(recordElement);
    });
  } catch (error) {
    console.error('Error refreshing records:', error);
    showToast('Failed to load records', 'error');
  } finally {
    hideLoading();
  }
}

/**
 * Create record element for display
 * @param {object} record - Record data
 * @param {object} recordConfig - Record type configuration
 * @param {object} child - Child data
 * @returns {HTMLElement} Record element
 */
function createRecordElement(record, recordConfig, child) {
  const recordElement = document.createElement('div');
  recordElement.className = 'record-item';
  
  // Determine primary timestamp
  const primaryTime = record.date || record.startTime || record.time || record.timestamp;
  
  // Build details array
  const details = [];
  
  recordConfig.fields.forEach(field => {
    if (record[field.name] && field.name !== 'notes') {
      let value = record[field.name];
      
      // Format values based on field type
      if (field.type === 'datetime-local' && field.name !== 'startTime') {
        value = formatTimestamp(value, 'time');
      } else if (field.type === 'date') {
        value = formatTimestamp(value, 'date');
      } else if (field.type === 'select' && field.options) {
        value = value.charAt(0).toUpperCase() + value.slice(1);
      }
      
      details.push({
        label: field.label,
        value: value
      });
    }
  });
  
  recordElement.innerHTML = `
    <div class="record-item-header">
      <div class="record-item-title">
        <div class="record-item-icon ${record._type}" style="background-color: ${recordConfig.color}">
          <i class="${recordConfig.icon}"></i>
        </div>
        <div class="record-item-info">
          <h4>${recordConfig.name}${record.type ? ` - ${record.type}` : ''}</h4>
          <p>${child ? child.name : 'Unknown Child'}</p>
        </div>
      </div>
      <div class="record-item-time">
        ${formatTimestamp(primaryTime, 'datetime')}
      </div>
    </div>
    <div class="record-item-body">
      ${details.length > 0 ? `
        <div class="record-item-details">
          ${details.map(detail => `
            <div class="record-detail-item">
              <span class="record-detail-label">${detail.label}:</span>
              <span class="record-detail-value">${detail.value}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${record.notes ? `
        <div class="record-item-notes">
          <strong>Notes:</strong> ${record.notes}
        </div>
      ` : ''}
      <div class="record-item-actions" style="margin-top: 1rem; display: flex; gap: 0.5rem;">
        <button class="btn secondary" onclick="showRecordModal('${record._type}', '${record.id}')">
          <i class="fas fa-edit"></i> Edit
        </button>
        <button class="btn error" onclick="deleteRecord('${record._type}', '${record.id}')">
          <i class="fas fa-trash"></i> Delete
        </button>
      </div>
    </div>
  `;
  
  return recordElement;
}

/**
 * Delete a record
 * @param {string} recordType - Record type
 * @param {string} recordId - Record ID
 */
async function deleteRecord(recordType, recordId) {
  if (!confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
    return;
  }
  
  try {
    showLoading();
    
    const storeName = STORES[recordType];
    await deleteRecord(storeName, recordId);
    
    showToast('Record deleted successfully', 'success');
    
    // Refresh UI
    await refreshRecords();
    await refreshDashboard();
  } catch (error) {
    console.error('Error deleting record:', error);
    showToast('Failed to delete record', 'error');
  } finally {
    hideLoading();
  }
}

/**
 * Export records to JSON
 */
async function exportRecords() {
  try {
    showLoading();
    
    const data = await exportData();
    
    // Create download link
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `baby-care-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showToast('Data exported successfully', 'success');
  } catch (error) {
    console.error('Export error:', error);
    showToast('Failed to export data', 'error');
  } finally {
    hideLoading();
  }
}

// ============================================
// Charts Functions
// ============================================

/**
 * Refresh charts
 */
async function refreshCharts() {
  try {
    showLoading();
    await updateChartChildFilter();
    await renderAllCharts();
  } catch (error) {
    console.error('Error refreshing charts:', error);
    showToast('Failed to refresh charts', 'error');
  } finally {
    hideLoading();
  }
}

/**
 * Update chart child filter
 */
async function updateChartChildFilter() {
  const selector = document.getElementById('chart-child-filter');
  if (!selector) return;
  
  try {
    const children = await getRecords(STORES.children);
    
    // Clear existing options except the first one
    while (selector.children.length > 1) {
      selector.removeChild(selector.lastChild);
    }
    
    // Add children options
    children.forEach(child => {
      const option = document.createElement('option');
      option.value = child.id;
      option.textContent = child.name;
      selector.appendChild(option);
    });
  } catch (error) {
    console.error('Error updating chart child filter:', error);
  }
}

/**
 * Render all charts
 */
async function renderAllCharts() {
  await Promise.all([
    renderFeedingChart(),
    renderSleepChart(),
    renderWeightChart(),
    renderActivityChart()
  ]);
}

/**
 * Get chart data based on filters
 * @param {string} storeName - Store name
 * @returns {Promise<Array>} Chart data
 */
async function getChartData(storeName) {
  const childFilter = document.getElementById('chart-child-filter').value;
  const periodFilter = document.getElementById('chart-period').value;
  
  // Calculate date range
  const now = new Date();
  let startDate;
  
  switch (periodFilter) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '3months':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  
  const filters = {
    startDate,
    endDate: now
  };
  
  if (childFilter) {
    filters.childId = childFilter;
  }
  
  return await getRecords(storeName, filters);
}

/**
 * Render feeding chart
 */
async function renderFeedingChart() {
  const canvas = document.getElementById('feeding-chart');
  if (!canvas) return;
  
  try {
    const data = await getChartData(STORES.feeding);
    
    // Group by date and type
    const dailyData = {};
    data.forEach(record => {
      const date = new Date(record.startTime || record.timestamp).toDateString();
      if (!dailyData[date]) {
        dailyData[date] = { breast: 0, formula: 0, solid: 0 };
      }
      dailyData[date][record.type] = (dailyData[date][record.type] || 0) + 1;
    });
    
    // Sort dates and prepare chart data
    const sortedDates = Object.keys(dailyData).sort((a, b) => new Date(a) - new Date(b));
    const labels = sortedDates.map(date => formatTimestamp(new Date(date), 'date'));
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (canvas.chart) {
      canvas.chart.destroy();
    }
    
    canvas.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Breast',
            data: sortedDates.map(date => dailyData[date].breast),
            borderColor: '#ff7eb3',
            backgroundColor: 'rgba(255, 126, 179, 0.1)',
            tension: 0.4
          },
          {
            label: 'Formula',
            data: sortedDates.map(date => dailyData[date].formula),
            borderColor: '#7eb3ff',
            backgroundColor: 'rgba(126, 179, 255, 0.1)',
            tension: 0.4
          },
          {
            label: 'Solid',
            data: sortedDates.map(date => dailyData[date].solid),
            borderColor: '#ffb347',
            backgroundColor: 'rgba(255, 179, 71, 0.1)',
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error rendering feeding chart:', error);
  }
}

/**
 * Render sleep chart
 */
async function renderSleepChart() {
  const canvas = document.getElementById('sleep-chart');
  if (!canvas) return;
  
  try {
    const data = await getChartData(STORES.sleep);
    
    // Group by date and calculate total sleep time
    const dailyData = {};
    data.forEach(record => {
      if (record.startTime && record.endTime) {
        const date = new Date(record.startTime).toDateString();
        const duration = (new Date(record.endTime) - new Date(record.startTime)) / (1000 * 60 * 60); // hours
        if (!dailyData[date]) {
          dailyData[date] = 0;
        }
        dailyData[date] += duration;
      }
    });
    
    // Sort dates and prepare chart data
    const sortedDates = Object.keys(dailyData).sort((a, b) => new Date(a) - new Date(b));
    const labels = sortedDates.map(date => formatTimestamp(new Date(date), 'date'));
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (canvas.chart) {
      canvas.chart.destroy();
    }
    
    canvas.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Sleep Hours',
          data: sortedDates.map(date => dailyData[date]),
          backgroundColor: 'rgba(126, 179, 255, 0.5)',
          borderColor: '#7eb3ff',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return value + 'h';
              }
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error rendering sleep chart:', error);
  }
}

/**
 * Render weight chart (placeholder - no weight data collection yet)
 */
async function renderWeightChart() {
  const canvas = document.getElementById('weight-chart');
  if (!canvas) return;
  
  try {
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (canvas.chart) {
      canvas.chart.destroy();
    }
    
    // Placeholder chart with sample data
    canvas.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [{
          label: 'Weight (kg)',
          data: [],
          borderColor: '#7cb342',
          backgroundColor: 'rgba(124, 179, 66, 0.1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
    
    // Show message about no data
    const chartContainer = canvas.parentElement;
    if (!chartContainer.querySelector('.no-data-message')) {
      const message = document.createElement('div');
      message.className = 'no-data-message';
      message.style.position = 'absolute';
      message.style.top = '50%';
      message.style.left = '50%';
      message.style.transform = 'translate(-50%, -50%)';
      message.style.textAlign = 'center';
      message.style.color = 'var(--text-secondary)';
      message.innerHTML = '<p>Weight tracking coming soon</p>';
      chartContainer.style.position = 'relative';
      chartContainer.appendChild(message);
    }
  } catch (error) {
    console.error('Error rendering weight chart:', error);
  }
}

/**
 * Render activity chart
 */
async function renderActivityChart() {
  const canvas = document.getElementById('activity-chart');
  if (!canvas) return;
  
  try {
    const data = await getChartData(STORES.activity);
    
    // Count activities by type
    const activityCounts = {};
    data.forEach(record => {
      const type = record.type || 'unknown';
      activityCounts[type] = (activityCounts[type] || 0) + 1;
    });
    
    const labels = Object.keys(activityCounts).map(key => 
      key.charAt(0).toUpperCase() + key.slice(1).replace('-', ' ')
    );
    const values = Object.values(activityCounts);
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (canvas.chart) {
      canvas.chart.destroy();
    }
    
    canvas.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: [
            '#ff7eb3',
            '#7eb3ff',
            '#ffb347',
            '#7cb342',
            '#ffa726',
            '#e57373',
            '#ab47bc',
            '#26a69a',
            '#ff8a65',
            '#9575cd'
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right'
          }
        }
      }
    });
  } catch (error) {
    console.error('Error rendering activity chart:', error);
  }
}

// ============================================
// Settings Functions
// ============================================

/**
 * Show settings modal
 */
function showSettingsModal() {
  populateTimezones();
  showModal('settings-modal');
}

/**
 * Handle backup data
 */
async function handleBackup() {
  await exportRecords(); // Reuse the export function
}

/**
 * Handle restore data
 */
function handleRestore() {
  const fileInput = document.getElementById('restore-file');
  fileInput.click();
}

/**
 * Process restore file
 * @param {Event} event - File input change event
 */
async function processRestoreFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    showLoading();
    
    const text = await file.text();
    const data = JSON.parse(text);
    
    await importData(data);
  } catch (error) {
    console.error('Restore error:', error);
    showToast('Failed to restore data: Invalid file format', 'error');
  } finally {
    hideLoading();
    // Reset file input
    event.target.value = '';
  }
}

// ============================================
// Refresh All Function
// ============================================

/**
 * Refresh all components
 */
async function refreshAll() {
  await refreshDashboard();
  await refreshChildren();
  await refreshRecords();
  await refreshCharts();
}

// ============================================
// Event Listeners Setup
// ============================================

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Theme toggle
  document.querySelector('.theme-toggle').addEventListener('click', toggleTheme);
  
  // Settings button
  document.querySelector('.settings-btn').addEventListener('click', showSettingsModal);
  
  // Navigation tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      switchTab(tabId);
    });
  });
  
  // Child selector change
  document.getElementById('child-selector').addEventListener('change', async (e) => {
    currentSelectedChild = e.target.value || null;
    await refreshDashboard();
  });
  
  // Quick record buttons
  document.querySelectorAll('.record-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const recordType = btn.dataset.type;
      showRecordModal(recordType);
    });
  });
  
  // Quick action buttons
  document.querySelectorAll('.quick-action').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      showRecordModal(action);
    });
  });
  
  // Add child button
  document.querySelector('.add-child-btn').addEventListener('click', () => {
    showChildModal();
  });
  
  // Export button
  document.querySelector('.export-btn').addEventListener('click', exportRecords);
  
  // Record filters
  document.getElementById('record-type-filter').addEventListener('change', 
    debounce(refreshRecords, 300)
  );
  document.getElementById('record-date-filter').addEventListener('change', 
    debounce(refreshRecords, 300)
  );
  
  // Chart filters
  document.getElementById('chart-child-filter').addEventListener('change', 
    debounce(renderAllCharts, 300)
  );
  document.getElementById('chart-period').addEventListener('change', 
    debounce(renderAllCharts, 300)
  );
  
  // Modal close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      if (modal) {
        hideModal(modal.id);
      }
    });
  });
  
  // Modal background clicks
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideModal(modal.id);
      }
    });
  });
  
  // Form submissions
  document.getElementById('child-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveChild(e.target);
  });
  
  document.getElementById('record-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveRecord(e.target);
  });
  
  // Child photo preview
  document.getElementById('child-photo').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('child-photo-preview');
    
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        preview.innerHTML = `<img src="${e.target.result}" alt="Child photo">`;
      };
      reader.readAsDataURL(file);
    } else {
      preview.innerHTML = '';
    }
  });
  
  // Settings
  document.getElementById('timezone-select').addEventListener('change', (e) => {
    updateTimezone(e.target.value);
  });
  
  document.getElementById('backup-btn').addEventListener('click', handleBackup);
  document.getElementById('restore-btn').addEventListener('click', handleRestore);
  document.getElementById('restore-file').addEventListener('change', processRestoreFile);
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Escape key closes modals
    if (e.key === 'Escape') {
      const activeModal = document.querySelector('.modal.active');
      if (activeModal) {
        hideModal(activeModal.id);
      }
    }
  });
}

// ============================================
// Initialization
// ============================================

/**
 * Initialize the application
 */
async function initApp() {
  try {
    showLoading();
    
    // Initialize database
    db = await initDB();
    
    // Apply saved theme
    applyTheme(currentTheme);
    
    // Setup event listeners
    setupEventListeners();
    
    // Load initial data
    await refreshAll();
    
    showToast('Baby Care Tracker loaded successfully', 'success');
  } catch (error) {
    console.error('Initialization error:', error);
    showToast('Failed to initialize application', 'error');
  } finally {
    hideLoading();
  }
}

// Make functions available globally
window.selectChild = selectChild;
window.editChild = editChild;
window.deleteChild = deleteChild;
window.showChildModal = showChildModal;
window.showRecordModal = showRecordModal;
window.deleteRecord = deleteRecord;
window.showSettingsModal = showSettingsModal;

// Start the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);