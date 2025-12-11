// Superbetin Dashboard - Data Loader
// Loads influencer metrics from JSON data files

const DataLoader = {
    // Cache for loaded data
    cache: null,

    /**
     * Load Superbetin data from JSON file
     * @returns {Promise<Object>} The loaded data
     */
    async loadData() {
        if (this.cache) {
            return this.cache;
        }

        try {
            const response = await fetch('../data/superbetin.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.cache = await response.json();
            console.log('Data loaded successfully:', this.cache.generated);
            return this.cache;
        } catch (error) {
            console.error('Error loading data:', error);
            // Return mock data structure if file not found
            return this.getMockData();
        }
    },

    /**
     * Load platform-specific data
     * @param {string} platform - 'facebook' or 'instagram'
     * @returns {Promise<Object>} Platform data
     */
    async loadPlatformData(platform) {
        try {
            const response = await fetch(`../data/superbetin_${platform}.json`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error loading ${platform} data:`, error);
            return null;
        }
    },

    /**
     * Get mock data for development/fallback
     * @returns {Object} Mock data structure
     */
    getMockData() {
        return {
            generated: new Date().toISOString(),
            platforms: {
                facebook: {
                    worksheet: 'Facebook',
                    count: 0,
                    data: []
                },
                instagram: {
                    worksheet: 'Instagram',
                    count: 0,
                    data: []
                }
            }
        };
    },

    /**
     * Clear the cache to force reload
     */
    clearCache() {
        this.cache = null;
    },

    /**
     * Get last update timestamp
     * @returns {string|null} Last update timestamp or null
     */
    getLastUpdate() {
        return this.cache?.generated || null;
    }
};

// Export for use in other modules
window.DataLoader = DataLoader;
