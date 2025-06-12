// Background service worker for Content Guardian
class ContentGuardian {
  constructor() {
    this.init();
  }

  init() {
    // Initialize default settings on install
    chrome.runtime.onInstalled.addListener(() => {
      this.setDefaultSettings();
    });

    // Handle messages from content scripts
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'getFilters') {
        this.getFilters().then(sendResponse);
        return true;
      }
    });
  }

  async setDefaultSettings() {
    const defaultSettings = {
      keywords: [
        {
          id: Date.now(),
          keyword: 'politics',
          category: 'News',
          action: 'blur',
          enabled: true
        }
      ],
      settings: {
        enabledSites: ['all'],
        defaultAction: 'blur',
        sensitivity: 'medium',
        showStats: true
      }
    };

    try {
      const existing = await chrome.storage.local.get(['keywords', 'settings']);
      if (!existing.keywords) {
        await chrome.storage.local.set({ keywords: defaultSettings.keywords });
      }
      if (!existing.settings) {
        await chrome.storage.local.set({ settings: defaultSettings.settings });
      }
    } catch (error) {
      console.error('Error setting default settings:', error);
    }
  }

  async getFilters() {
    try {
      const result = await chrome.storage.local.get(['keywords', 'settings']);
      return {
        keywords: result.keywords || [],
        settings: result.settings || {}
      };
    } catch (error) {
      console.error('Error getting filters:', error);
      return { keywords: [], settings: {} };
    }
  }
}

// Initialize the extension
new ContentGuardian();