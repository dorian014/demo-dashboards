/**
 * Client Configuration
 * This file must be loaded BEFORE report-core.js
 */

const CLIENT_CONFIG = {
    // Client identification
    name: 'Dashboard',
    reportType: 'Media Clipping Report',
    reportTitle: 'Media Clipping Report',
    reportSubtitle: 'Performance Analytics',

    // Assets
    logo: 'assets/logo-placeholder.svg',
    footerLogo: 'assets/jetq-labs-logo.svg',

    // Email service (Google Apps Script)
    emailServiceUrl: '',

    // Theme colors (optional - can also use CSS variables in theme.css)
    theme: {
        primaryColor: '#f7931a',
        primaryHover: '#e6b800',
        backgroundDark: '#0a0a12'
    }
};
