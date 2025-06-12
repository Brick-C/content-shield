// Content Guardian Popup JavaScript
class PopupManager {
  constructor() {
    this.isEnabled = true;
    this.keywords = [];
    this.filteredCount = 0;
    this.init();
  }

  async init() {
    await this.loadData();
    this.bindEvents();
    this.updateUI();
  }

  async loadData() {
    try {
      const result = await chrome.storage.local.get(['keywords', 'settings', 'stats']);
      this.keywords = result.keywords || [];
      this.settings = result.settings || {};
      this.stats = result.stats || { filteredToday: 0 };
      this.isEnabled = this.settings.enabled !== false;
    } catch (error) {
      console.error('Error loading popup data:', error);
    }
  }

  bindEvents() {
    // Master toggle
    document.getElementById('masterToggle').addEventListener('click', () => {
      this.toggleMaster();
    });

    // Quick filter
    document.getElementById('addQuickFilter').addEventListener('click', () => {
      this.openQuickFilterModal();
    });

    // Settings
    document.getElementById('openOptions').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
      window.close();
    });

    // Quick filter modal
    document.getElementById('closeQuickModal').addEventListener('click', () => {
      this.closeQuickFilterModal();
    });

    document.getElementById('cancelQuick').addEventListener('click', () => {
      this.closeQuickFilterModal();
    });

    document.getElementById('saveQuick').addEventListener('click', () => {
      this.saveQuickFilter();
    });

    // Modal overlay
    document.getElementById('quickFilterModal').addEventListener('click', (e) => {
      if (e.target.id === 'quickFilterModal') {
        this.closeQuickFilterModal();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeQuickFilterModal();
      }
    });
  }

  updateUI() {
    // Master toggle
    const toggleBtn = document.getElementById('masterToggle');
    if (this.isEnabled) {
      toggleBtn.classList.add('active');
    } else {
      toggleBtn.classList.remove('active');
    }

    // Stats
    document.getElementById('filteredCount').textContent = this.stats.filteredToday || 0;
    document.getElementById('keywordCount').textContent = this.keywords.filter(k => k.enabled).length;

    // Recent activity
    this.updateRecentActivity();
  }

  updateRecentActivity() {
    const activityList = document.getElementById('activityList');
    
    // This would be populated with real activity data
    if (this.stats.recentActivity && this.stats.recentActivity.length > 0) {
      activityList.innerHTML = this.stats.recentActivity
        .slice(0, 5)
        .map(activity => `
          <div class="activity-item">
            <div class="activity-text">
              Filtered "${activity.keyword}" on 
              <span class="activity-site">${activity.site}</span>
            </div>
            <div class="activity-time">${this.formatTime(activity.timestamp)}</div>
          </div>
        `).join('');
    } else {
      activityList.innerHTML = `
        <div class="activity-item">
          <span class="activity-text">No recent activity</span>
        </div>
      `;
    }
  }

  async toggleMaster() {
    this.isEnabled = !this.isEnabled;
    
    // Save the setting
    const settings = { ...this.settings, enabled: this.isEnabled };
    await chrome.storage.local.set({ settings });
    
    this.updateUI();
    
    // Reload active tabs to apply changes
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        chrome.tabs.reload(tabs[0].id);
      }
    } catch (error) {
      console.error('Error reloading tab:', error);
    }
  }

  openQuickFilterModal() {
    document.getElementById('quickFilterModal').classList.add('active');
    document.getElementById('quickKeyword').focus();
  }

  closeQuickFilterModal() {
    document.getElementById('quickFilterModal').classList.remove('active');
    document.getElementById('quickKeyword').value = '';
    document.getElementById('quickAction').value = 'blur';
  }

  async saveQuickFilter() {
    const keyword = document.getElementById('quickKeyword').value.trim();
    const action = document.getElementById('quickAction').value;

    if (!keyword) {
      alert('Please enter a keyword');
      return;
    }

    // Check for duplicates
    const exists = this.keywords.find(k => 
      k.keyword.toLowerCase() === keyword.toLowerCase()
    );

    if (exists) {
      alert('This keyword already exists');
      return;
    }

    // Add the keyword
    const newKeyword = {
      id: Date.now(),
      keyword,
      category: 'Quick Filters',
      action,
      enabled: true,
      createdAt: Date.now()
    };

    this.keywords.push(newKeyword);
    
    // Save to storage
    await chrome.storage.local.set({ keywords: this.keywords });
    
    this.closeQuickFilterModal();
    this.updateUI();
    
    // Show success message
    this.showToast('Quick filter added successfully!');
  }

  showToast(message) {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #10b981;
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      z-index: 2000;
      animation: slideUp 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 2000);
  }

  formatTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }
}

// Add slide up animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideUp {
    from { transform: translate(-50%, 100%); opacity: 0; }
    to { transform: translate(-50%, 0); opacity: 1; }
  }
`;
document.head.appendChild(style);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});