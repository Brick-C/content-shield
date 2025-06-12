// Content script for DOM scanning and filtering
class ContentFilter {
  constructor() {
    this.keywords = [];
    this.settings = {};
    this.filteredCount = 0;
    this.observer = null;
    this.scanTimeout = null;
    this.init();
  }

  async init() {
    try {
      // FIXED: Await for the body node and store its reference
      const bodyNode = await this.waitForBody();
      if (!bodyNode) {
        // Should not happen with polling, but good for safety
        console.error(
          "Content Guardian initialization error: document.body not found after waiting."
        );
        return; // Cannot proceed without a body node
      }

      // Get filters from background
      const response = await chrome.runtime.sendMessage({
        action: "getFilters",
      });
      this.keywords = response.keywords || [];
      this.settings = response.settings || {};

      this.startFiltering(bodyNode);

      // Listen for storage changes
      chrome.storage.onChanged.addListener((changes) => {
        if (changes.keywords || changes.settings) {
          this.updateFilters();
        }
      });
    } catch (error) {
      console.error("Content Guardian initialization error:", error);
    }
  }

  async waitForBody() {
    return new Promise((resolve) => {
      const checkBody = () => {
        if (document.body) {
          console.log("Content Guardian: document.body is now available.");
          resolve(document.body); // Resolve with the actual document.body node
        } else {
          setTimeout(checkBody, 50); // Poll every 50ms
        }
      };

      if (
        document.readyState === "complete" ||
        document.readyState === "interactive"
      ) {
        checkBody();
      } else {
        document.addEventListener("DOMContentLoaded", checkBody);
      }
    });
  }

  async updateFilters() {
    const response = await chrome.runtime.sendMessage({ action: "getFilters" });
    this.keywords = response.keywords || [];
    this.settings = response.settings || {};
    this.refilterPage();
  }

  // FIXED: Accept bodyElement as a parameter
  startFiltering(bodyElement) {
    // Initial scan
    this.scanAndFilter();

    // Set up mutation observer for dynamic content
    this.observer = new MutationObserver((mutations) => {
      let shouldScan = false;
      mutations.forEach((mutation) => {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          shouldScan = true;
        }
      });

      if (shouldScan) {
        clearTimeout(this.scanTimeout);
        this.scanTimeout = setTimeout(() => this.scanAndFilter(), 100);
      }
    });

    // FIXED: Observe the passed-in bodyElement, which is guaranteed to be a Node
    this.observer.observe(bodyElement, {
      childList: true,
      subtree: true,
    });
    console.log(
      "Content Guardian: MutationObserver successfully observing document.body."
    );
  }

  scanAndFilter() {
    const enabledKeywords = this.keywords.filter((k) => k.enabled);
    if (enabledKeywords.length === 0) return;

    // Define selectors for different platforms
    const selectors = this.getPlatformSelectors();

    selectors.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        if (element.dataset.contentGuardianProcessed) return;

        const textContent = this.getElementText(element);
        const matchedKeyword = this.findMatchingKeyword(
          textContent,
          enabledKeywords
        );

        if (matchedKeyword) {
          this.applyFilter(element, matchedKeyword);
          element.dataset.contentGuardianProcessed = "true";
          this.filteredCount++;
        }
      });
    });
  }

  getPlatformSelectors() {
    const hostname = window.location.hostname;
    const commonSelectors = [
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "p",
      "span",
      'div[role="article"]',
      "article",
      '[data-testid*="tweet"]',
    ];

    // Platform-specific selectors
    if (hostname.includes("youtube.com")) {
      return [
        ...commonSelectors,
        "#video-title",
        ".ytd-video-meta-block",
        ".ytd-rich-grid-media",
        ".ytd-compact-video-renderer",
        "#description", // Video description
        "#comments", // Comments section
        "ytd-comment-renderer", // Individual comments
      ];
    } else if (hostname.includes("reddit.com")) {
      return [
        ...commonSelectors,
        '[data-testid="post-container"]',
        ".Post",
        "h3._eYtD2XCVieq6emjKBH3m", // Old Reddit post titles
        'div[data-click-id="text"]', // Post body content (new Reddit)
        'div[data-testid="comment"]', // Individual comments (new Reddit)
        'div[data-test-id="comment"]', // Alternative comment selector
        'a[data-click-id="comments"]', // Comment links
        'a[data-click-id="body"]', // Post body links
      ];
    } else if (hostname.includes("twitter.com") || hostname.includes("x.com")) {
      return [
        ...commonSelectors,
        '[data-testid="tweet"]',
        '[data-testid="tweetText"]',
        ".tweet-text", // Older Twitter tweet text
        'div[data-testid="User-Names"]', // User names in tweet list
        'div[data-testid="conversation"]', // Conversation threads
      ];
    } else if (hostname.includes("google.com")) {
      return [
        ...commonSelectors,
        ".g h3", // Search result titles
        ".LC20lb", // Alternative search result titles
        ".VwiC3b", // Search result snippets
        ".g a", // Search result links
        "span.xQ8gFc", // Featured snippet content
      ];
    } else if (hostname.includes("facebook.com")) {
      return [
        ...commonSelectors,
        '[role="feed"] [role="article"]', // News feed posts
        '[data-testid="story-instance"]', // Individual story items
        'div[data-ad-preview="message"]', // Post content
      ];
    } else if (hostname.includes("instagram.com")) {
      return [
        ...commonSelectors,
        'article[role="presentation"]', // Individual posts
        "div._a9zm", // Caption text
        "div._a9zs", // Comment text
      ];
    }

    return commonSelectors;
  }

  getElementText(element) {
    // Get all text content including alt text and titles
    const textSources = [
      element.textContent,
      element.title,
      element.alt,
      element.getAttribute("aria-label"),
    ].filter(Boolean);

    return textSources.join(" ").toLowerCase();
  }

  findMatchingKeyword(text, keywords) {
    for (const keyword of keywords) {
      const searchTerm = keyword.keyword.toLowerCase();
      if (text.includes(searchTerm)) {
        return keyword;
      }
    }
    return null;
  }

  applyFilter(element, keyword) {
    const container = this.findFilterContainer(element);
    if (!container) return;

    // Create wrapper if needed
    let wrapper = container.querySelector(".content-guardian-wrapper");
    if (!wrapper) {
      wrapper = document.createElement("div");
      wrapper.className = "content-guardian-wrapper";
      container.parentNode.insertBefore(wrapper, container);
      wrapper.appendChild(container);
    }

    // Apply filter based on action
    switch (keyword.action) {
      case "hide":
        container.classList.add("content-guardian-hidden");
        break;
      case "blur":
        container.classList.add("content-guardian-blurred");
        this.addUnblurButton(wrapper, keyword);
        break;
      case "flag":
        container.classList.add("content-guardian-flagged");
        this.addFlagIndicator(wrapper, keyword);
        break;
    }
  }

  findFilterContainer(element) {
    // Find the appropriate container to filter
    const selectors = [
      '[data-testid="tweet"]',
      ".Post",
      "article",
      ".g",
      ".ytd-rich-grid-media",
      ".ytd-compact-video-renderer",
    ];

    for (const selector of selectors) {
      const container = element.closest(selector);
      if (container) return container;
    }

    // Fallback to a reasonable parent
    let parent = element.parentElement;
    let depth = 0;
    while (parent && depth < 5) {
      if (parent.offsetHeight > 50 || parent.offsetWidth > 100) {
        return parent;
      }
      parent = parent.parentElement;
      depth++;
    }

    return element;
  }

  addUnblurButton(wrapper, keyword) {
    if (wrapper.querySelector(".content-guardian-unblur")) return;

    const button = document.createElement("button");
    button.className = "content-guardian-unblur";
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
      Show content (filtered: ${keyword.keyword})
    `;

    button.onclick = () => {
      const blurredElement = wrapper.querySelector(".content-guardian-blurred");
      if (blurredElement) {
        // Only attempt to remove class if the element is found
        blurredElement.classList.remove("content-guardian-blurred");
      }
      button.remove(); // Always remove the unblur button
    };

    wrapper.insertBefore(button, wrapper.firstChild);
  }

  addFlagIndicator(wrapper, keyword) {
    if (wrapper.querySelector(".content-guardian-flag")) return;

    const flag = document.createElement("div");
    flag.className = "content-guardian-flag";
    flag.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
        <line x1="4" y1="22" x2="4" y2="15"/>
      </svg>
      Filtered: ${keyword.keyword}
    `;

    wrapper.insertBefore(flag, wrapper.firstChild);
  }

  refilterPage() {
    // Remove all existing filters
    document
      .querySelectorAll("[data-content-guardian-processed]")
      .forEach((el) => {
        el.removeAttribute("data-content-guardian-processed");
      });

    document
      .querySelectorAll(
        ".content-guardian-hidden, .content-guardian-blurred, .content-guardian-flagged"
      )
      .forEach((el) => {
        el.classList.remove(
          "content-guardian-hidden",
          "content-guardian-blurred",
          "content-guardian-flagged"
        );
      });

    document
      .querySelectorAll(".content-guardian-unblur, .content-guardian-flag")
      .forEach((el) => {
        el.remove();
      });

    // Re-scan the page
    this.filteredCount = 0;
    this.scanAndFilter();
  }
}

// Initialize content filter when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new ContentFilter());
} else {
  new ContentFilter();
}
