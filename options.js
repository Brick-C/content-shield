// Content Guardian Options Page JavaScript
class OptionsManager {
  constructor() {
    this.keywords = [];
    this.settings = {};
    this.currentEditId = null;
    this.init();
  }

  async init() {
    await this.loadData();
    this.bindEvents();
    this.renderKeywords();
    this.updateStats();
    this.loadSettings();
  }

  async loadData() {
    try {
      const result = await chrome.storage.local.get(['keywords', 'settings']);
      this.keywords = result.keywords || [];
      this.settings = result.settings || {
        defaultAction: 'blur',
        sensitivity: 'medium',
        showStats: true,
        enableNotifications: false,
        enabledSites: ['all']
      };
    } catch (error) {
      console.error('Error loading data:', error);
      this.showToast('Error loading data', 'error');
    }
  }

  async saveData() {
    try {
      await chrome.storage.local.set({
        keywords: this.keywords,
        settings: this.settings
      });
    } catch (error) {
      console.error('Error saving data:', error);
      this.showToast('Error saving data', 'error');
    }
  }

  bindEvents() {
    // Tab navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => this.switchTab(item.dataset.tab));
    });

    // Add keyword button
    document.getElementById('addKeywordBtn').addEventListener('click', () => {
      this.openKeywordModal();
    });

    // Modal events
    document.getElementById('closeModal').addEventListener('click', () => {
      this.closeKeywordModal();
    });
    document.getElementById('cancelBtn').addEventListener('click', () => {
      this.closeKeywordModal();
    });
    document.getElementById('saveBtn').addEventListener('click', () => {
      this.saveKeyword();
    });

    // Modal overlay click
    document.getElementById('keywordModal').addEventListener('click', (e) => {
      if (e.target.id === 'keywordModal') {
        this.closeKeywordModal();
      }
    });

    // Settings
    document.getElementById('defaultAction').addEventListener('change', (e) => {
      this.settings.defaultAction = e.target.value;
      this.saveData();
    });

    document.getElementById('sensitivity').addEventListener('change', (e) => {
      this.settings.sensitivity = e.target.value;
      this.saveData();
    });

    document.getElementById('showStats').addEventListener('change', (e) => {
      this.settings.showStats = e.target.checked;
      this.saveData();
    });

    document.getElementById('enableNotifications').addEventListener('change', (e) => {
      this.settings.enableNotifications = e.target.checked;
      this.saveData();
    });

    // Website toggles
    ['enableAll', 'enableYoutube', 'enableTwitter', 'enableReddit', 'enableGoogle', 'enableNews'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => {
        this.updateEnabledSites();
      });
    });

    // Import/Export
    document.getElementById('exportBtn').addEventListener('click', () => {
      this.exportKeywords();
    });

    document.getElementById('importBtn').addEventListener('click', () => {
      document.getElementById('importFile').click();
    });

    document.getElementById('importFile').addEventListener('change', (e) => {
      this.importKeywords(e.target.files[0]);
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
      this.resetAllData();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeKeywordModal();
      }
    });
  }

  switchTab(tabName) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
  }

  renderKeywords() {
    const container = document.getElementById('keywordsList');
    
    if (this.keywords.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #64748b;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 1rem; opacity: 0.5;">
            <path d="M3 6h18M3 12h18M3 18h18"/>
          </svg>
          <p>No keywords added yet. Click "Add Keyword" to get started.</p>
        </div>
      `;
      return;
    }

    const keywordsByCategory = this.groupKeywordsByCategory();
    
    container.innerHTML = Object.entries(keywordsByCategory)
      .map(([category, keywords]) => `
        <div class="keyword-category-section">
          <h4 style="margin-bottom: 1rem; color: #374151; font-weight: 600;">${category}</h4>
          ${keywords.map(keyword => this.renderKeywordCard(keyword)).join('')}
        </div>
      `).join('');

    // Bind keyword events
    this.bindKeywordEvents();
  }

  groupKeywordsByCategory() {
    const grouped = {};
    this.keywords.forEach(keyword => {
      const category = keyword.category || 'Uncategorized';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(keyword);
    });
    return grouped;
  }

  renderKeywordCard(keyword) {
    return `
      <div class="keyword-card">
        <div class="keyword-header">
          <span class="keyword-text">${this.escapeHtml(keyword.keyword)}</span>
          <div class="keyword-actions">
            <button class="btn-icon edit-keyword" data-id="${keyword.id}" title="Edit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="btn-icon delete-keyword" data-id="${keyword.id}" title="Delete">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3,6 5,6 21,6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="keyword-meta">
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <span class="keyword-category">${this.escapeHtml(keyword.category || 'General')}</span>
            <span class="action-badge action-${keyword.action}">${keyword.action}</span>
          </div>
          <div class="keyword-toggle ${keyword.enabled ? 'active' : ''}" data-id="${keyword.id}"></div>
        </div>
      </div>
    `;
  }

  bindKeywordEvents() {
    // Edit buttons
    document.querySelectorAll('.edit-keyword').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        this.editKeyword(id);
      });
    });

    // Delete buttons
    document.querySelectorAll('.delete-keyword').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        this.deleteKeyword(id);
      });
    });

    // Toggle switches
    document.querySelectorAll('.keyword-toggle').forEach(toggle => {
      toggle.addEventListener('click', () => {
        const id = parseInt(toggle.dataset.id);
        this.toggleKeyword(id);
      });
    });
  }

  openKeywordModal(keyword = null) {
    this.currentEditId = keyword ? keyword.id : null;
    
    // Set modal title
    document.getElementById('modalTitle').textContent = keyword ? 'Edit Keyword' : 'Add Keyword';
    
    // Fill form
    document.getElementById('keywordInput').value = keyword ? keyword.keyword : '';
    document.getElementById('categoryInput').value = keyword ? keyword.category : '';
    document.getElementById('actionSelect').value = keyword ? keyword.action : this.settings.defaultAction;
    document.getElementById('enabledInput').checked = keyword ? keyword.enabled : true;
    
    // Show modal
    document.getElementById('keywordModal').classList.add('active');
    document.getElementById('keywordInput').focus();
  }

  closeKeywordModal() {
    document.getElementById('keywordModal').classList.remove('active');
    this.currentEditId = null;
  }

  saveKeyword() {
    const keyword = document.getElementById('keywordInput').value.trim();
    const category = document.getElementById('categoryInput').value.trim();
    const action = document.getElementById('actionSelect').value;
    const enabled = document.getElementById('enabledInput').checked;

    if (!keyword) {
      this.showToast('Please enter a keyword', 'error');
      return;
    }

    // Check for duplicates
    const exists = this.keywords.find(k => 
      k.keyword.toLowerCase() === keyword.toLowerCase() && 
      k.id !== this.currentEditId
    );

    if (exists) {
      this.showToast('This keyword already exists', 'error');
      return;
    }

    const keywordData = {
      keyword,
      category: category || 'General',
      action,
      enabled,
      createdAt: Date.now()
    };

    if (this.currentEditId) {
      // Edit existing
      const index = this.keywords.findIndex(k => k.id === this.currentEditId);
      this.keywords[index] = { ...this.keywords[index], ...keywordData };
      this.showToast('Keyword updated successfully', 'success');
    } else {
      // Add new
      keywordData.id = Date.now();
      this.keywords.push(keywordData);
      this.showToast('Keyword added successfully', 'success');
    }

    this.saveData();
    this.renderKeywords();
    this.updateStats();
    this.closeKeywordModal();
  }

  editKeyword(id) {
    const keyword = this.keywords.find(k => k.id === id);
    if (keyword) {
      this.openKeywordModal(keyword);
    }
  }

  deleteKeyword(id) {
    if (confirm('Are you sure you want to delete this keyword?')) {
      this.keywords = this.keywords.filter(k => k.id !== id);
      this.saveData();
      this.renderKeywords();
      this.updateStats();
      this.showToast('Keyword deleted successfully', 'success');
    }
  }

  toggleKeyword(id) {
    const keyword = this.keywords.find(k => k.id === id);
    if (keyword) {
      keyword.enabled = !keyword.enabled;
      this.saveData();
      this.renderKeywords();
      this.showToast(`Keyword ${keyword.enabled ? 'enabled' : 'disabled'}`, 'info');
    }
  }

  updateStats() {
    document.getElementById('totalKeywords').textContent = this.keywords.length;
    document.getElementById('filteredToday').textContent = '0'; // This would come from tracking
  }

  loadSettings() {
    document.getElementById('defaultAction').value = this.settings.defaultAction || 'blur';
    document.getElementById('sensitivity').value = this.settings.sensitivity || 'medium';
    document.getElementById('showStats').checked = this.settings.showStats !== false;
    document.getElementById('enableNotifications').checked = this.settings.enableNotifications || false;
    
    // Website toggles
    const enabledSites = this.settings.enabledSites || ['all'];
    document.getElementById('enableAll').checked = enabledSites.includes('all');
    document.getElementById('enableYoutube').checked = enabledSites.includes('youtube');
    document.getElementById('enableTwitter').checked = enabledSites.includes('twitter');
    document.getElementById('enableReddit').checked = enabledSites.includes('reddit');
    document.getElementById('enableGoogle').checked = enabledSites.includes('google');
    document.getElementById('enableNews').checked = enabledSites.includes('news');
  }

  updateEnabledSites() {
    const enabled = [];
    if (document.getElementById('enableAll').checked) enabled.push('all');
    if (document.getElementById('enableYoutube').checked) enabled.push('youtube');
    if (document.getElementById('enableTwitter').checked) enabled.push('twitter');
    if (document.getElementById('enableReddit').checked) enabled.push('reddit');
    if (document.getElementById('enableGoogle').checked) enabled.push('google');
    if (document.getElementById('enableNews').checked) enabled.push('news');
    
    this.settings.enabledSites = enabled;
    this.saveData();
  }

  exportKeywords() {
    const data = {
      keywords: this.keywords,
      settings: this.settings,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `content-guardian-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    this.showToast('Keywords exported successfully', 'success');
  }

  async importKeywords(file) {
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.keywords || !Array.isArray(data.keywords)) {
        throw new Error('Invalid file format');
      }

      // Merge with existing keywords
      const newKeywords = data.keywords.filter(newKeyword => 
        !this.keywords.find(existing => 
          existing.keyword.toLowerCase() === newKeyword.keyword.toLowerCase()
        )
      );

      this.keywords.push(...newKeywords);
      
      if (data.settings) {
        this.settings = { ...this.settings, ...data.settings };
      }

      await this.saveData();
      this.renderKeywords();
      this.updateStats();
      this.loadSettings();
      
      this.showToast(`Imported ${newKeywords.length} new keywords`, 'success');
    } catch (error) {
      console.error('Import error:', error);
      this.showToast('Error importing file. Please check the file format.', 'error');
    }
  }

  resetAllData() {
    if (confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
      if (confirm('This will delete all your keywords and settings. Are you absolutely sure?')) {
        this.keywords = [];
        this.settings = {
          defaultAction: 'blur',
          sensitivity: 'medium',
          showStats: true,
          enableNotifications: false,
          enabledSites: ['all']
        };
        
        this.saveData();
        this.renderKeywords();
        this.updateStats();
        this.loadSettings();
        
        this.showToast('All data has been reset', 'info');
      }
    }
  }

  showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.getElementById('toastContainer').appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, duration);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new OptionsManager();
});