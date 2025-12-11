/**
 * Superbetin Client Configuration
 * This file must be loaded BEFORE report-core.js
 */

const CLIENT_CONFIG = {
    // Client identification
    name: 'Superbetin',
    reportType: 'AI Micro-influencer Report',
    reportTitle: 'AI Micro-influencer Report',
    reportSubtitle: 'Performance Analytics',

    // Assets
    logo: 'assets/logo2.png',
    footerLogo: 'assets/Q-Star-Labs-Logo_Nightshade.png',

    // Email service (Google Apps Script)
    emailServiceUrl: 'https://script.google.com/macros/s/AKfycbxSBXq-GHv96B0A5EwRZ82xtd9HyttJ1ve4KWc3guyW6knV-JDudEQYgb9azOjTlKQi/exec',

    // Theme colors (optional - can also use CSS variables in theme.css)
    theme: {
        primaryColor: '#2563eb',
        primaryHover: '#1d4ed8',
        backgroundDark: '#1a1a2e'
    }
};
