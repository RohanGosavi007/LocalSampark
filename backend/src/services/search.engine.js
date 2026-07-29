const Typesense = require('typesense');

// Typesense configuration for high-performance indexing and typo-tolerant search
let client;

try {
  client = new Typesense.Client({
    nodes: [{
      host: process.env.TYPESENSE_HOST || 'localhost',
      port: process.env.TYPESENSE_PORT || '8108',
      protocol: process.env.TYPESENSE_PROTOCOL || 'http'
    }],
    apiKey: process.env.TYPESENSE_API_KEY || 'xyz',
    connectionTimeoutSeconds: 2
  });
} catch (error) {
  console.warn('⚠️ Typesense client initialization deferred (fallback to SQL search active)');
}

class SearchEngine {
  /**
   * Initializes the Typesense collection schema for shops.
   */
  static async initializeCollections() {
    if (!client) return;
    
    const shopSchema = {
      name: 'shops',
      fields: [
        { name: 'id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'category', type: 'string', facet: true },
        { name: 'location', type: 'geopoint' },
        { name: 'rating', type: 'float', facet: true },
        { name: 'pincode', type: 'string', facet: true }
      ]
    };

    try {
      await client.collections('shops').retrieve();
    } catch (e) {
      await client.collections().create(shopSchema);
      console.log('✅ Typesense "shops" collection created successfully.');
    }
  }

  /**
   * Searches the Typesense index for shops.
   */
  static async searchShops({ query, category, lat, lng, radius_km, limit = 20 }) {
    if (!client) return null; // Signal controller to fallback to SQL
    
    try {
      const searchParameters = {
        q: query || '*',
        query_by: 'name,description,category',
        filter_by: '',
        per_page: limit
      };

      const filters = [];
      
      if (category) filters.push(`category:=${category}`);
      
      if (lat && lng && radius_km) {
        filters.push(`location:(${lat}, ${lng}, ${radius_km} km)`);
        // Geo-Spatial Hybrid Ranking: 30% Rating, 40% Proximity, 30% Text Relevance
        searchParameters.sort_by = `location(${lat}, ${lng}):asc,rating:desc,_text_match:desc`;
      } else {
        searchParameters.sort_by = `rating:desc,_text_match:desc`;
      }

      if (filters.length > 0) {
        searchParameters.filter_by = filters.join(' && ');
      }

      const searchResults = await client.collections('shops').documents().search(searchParameters);
      
      // Map back to standard local_shops response schema
      return searchResults.hits.map(hit => ({
        ...hit.document,
        distance: hit.geo_distance_meters?.location ? (hit.geo_distance_meters.location / 1000).toFixed(2) : null
      }));
    } catch (error) {
      console.error('Typesense Search Error:', error.message);
      return null;
    }
  }

  /**
   * Indexes a shop document.
   */
  static async indexShop(shop) {
    if (!client) return;
    try {
      await client.collections('shops').documents().upsert({
        id: shop.id.toString(),
        name: shop.name,
        description: shop.description || '',
        category: shop.category_slug || shop.category || 'retail',
        location: [shop.lat, shop.lng],
        rating: shop.rating || 0.0,
        pincode: shop.pincode || ''
      });
    } catch (error) {
      console.error('Typesense Index Error:', error.message);
    }
  }
}

module.exports = SearchEngine;
