# Content Guardian Chrome Extension

A sophisticated Chrome extension that automatically filters unwanted content across websites based on user-defined keywords. Perfect for avoiding specific topics or filtering adult content.

## Features

- **Smart Content Filtering**: Automatically hide, blur, or flag content based on keywords
- **Multi-Platform Support**: Works on YouTube, Twitter/X, Reddit, Google Search, and news sites
- **Multiple Filter Actions**: 
  - Hide content completely
  - Blur content with reveal option
  - Flag content with visible indicator
- **Intuitive Management**: Beautiful options page for managing keywords and settings
- **Quick Filters**: Add filters directly from the popup without opening settings
- **Category Organization**: Group keywords by category for better organization
- **Import/Export**: Backup and share your keyword lists
- **Real-time Filtering**: Filters content as it loads, including dynamic content

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The Content Guardian icon will appear in your toolbar

## Usage

### Adding Keywords
1. Click the Content Guardian icon in your toolbar
2. Click "Quick Filter" to add a filter instantly, or "Settings" for advanced options
3. In settings, click "Add Keyword" to create detailed filters
4. Choose the filter action (hide, blur, or flag)
5. Assign a category for organization

### Managing Filters
- Toggle keywords on/off without deleting them
- Edit existing keywords
- Organize by categories
- Export your keyword list for backup
- Import keywords from other devices

### Settings
- Choose default filter action
- Set filter sensitivity
- Enable/disable for specific websites
- Toggle notifications and statistics

## Supported Websites

- **YouTube**: Video titles, descriptions, thumbnails
- **Twitter/X**: Tweets, usernames, trending topics
- **Reddit**: Post titles, comments, subreddit names
- **Google Search**: Search results, news headlines
- **News Websites**: Headlines, article content
- **General Web**: Works on most websites with content filtering

## Technical Details

- **Manifest Version**: 3 (latest Chrome extension standard)
- **Storage**: Uses Chrome's local storage for keywords and settings
- **Performance**: Optimized DOM scanning with mutation observers
- **Privacy**: All filtering happens locally - no data is sent to external servers

## File Structure

```
content-guardian/
├── manifest.json          # Extension manifest
├── background.js          # Service worker
├── content.js            # Content filtering script
├── options.html          # Settings page
├── options.js            # Settings functionality
├── options.css           # Settings styling
├── popup.html            # Popup interface
├── popup.js              # Popup functionality
├── popup.css             # Popup styling
├── styles/
│   └── content.css       # Injected content styles
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Development

The extension is built with vanilla JavaScript for optimal performance and compatibility. The modular architecture makes it easy to extend and maintain.

### Key Components

- **Background Script**: Manages extension lifecycle and storage
- **Content Script**: Scans and filters webpage content
- **Options Page**: Full-featured settings interface
- **Popup**: Quick access to common functions

## Privacy & Security

- All filtering happens locally on your device
- No data is transmitted to external servers
- Keywords and settings are stored locally in Chrome
- Open source code for full transparency

## License

MIT License - Feel free to modify and distribute

## Support

For issues, suggestions, or contributions, please visit the project repository.