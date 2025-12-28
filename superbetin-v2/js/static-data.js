/**
 * Data Loader for Superbetin V2 Report
 * Loads static data from local data folder
 */

const DataLoader = {
    cache: null,

    async loadData() {
        if (this.cache) {
            return this.cache;
        }

        try {
            const response = await fetch('data/static-data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.cache = await response.json();
            console.log('Static data loaded:', this.cache.generated);
            return this.cache;
        } catch (error) {
            console.error('Error loading static data:', error);
            return this.getEmptyData();
        }
    },

    getEmptyData() {
        return {
            generated: new Date().toISOString(),
            platforms: {
                instagram: { worksheet: 'Instagram', count: 0, data: [] },
                facebook: { worksheet: 'Facebook', count: 0, data: [] }
            }
        };
    },

    clearCache() {
        this.cache = null;
    },

    getLastUpdate() {
        return this.cache?.generated || null;
    }
};

window.DataLoader = DataLoader;
