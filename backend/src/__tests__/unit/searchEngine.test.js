const searchService = require('../../modules/ml/services/search.service');
const { query } = require('../../config/database');
const { pointSql } = require('../../utils/sqlPoint');

describe('C5 Full-Text Search Engine', () => {
  const TEST_SHOP_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

  beforeAll(async () => {
    await query('DELETE FROM local_shops WHERE id = $1', [TEST_SHOP_ID]);
    await query(
      `INSERT INTO local_shops (id, name, description, category, address, is_active, latitude, longitude, coordinate)
       VALUES ($1, $2, $3, $4, $5, true, 18.5793, 73.8796, ${pointSql(18.5793, 73.8796)})`,
      [TEST_SHOP_ID, 'Dhanori Fresh Organic Mart', 'Daily fresh vegetables, groceries and dairy', 'groceries', 'Dhanori Road, Pune']
    );
  });

  afterAll(async () => {
    await query('DELETE FROM local_shops WHERE id = $1', [TEST_SHOP_ID]);
  });

  test('[C5.1] returns query_too_short for single character query', async () => {
    const res = await searchService.search('a');
    expect(res.strategy).toBe('none');
    expect(res.reason).toBe('query_too_short');
    expect(res.items).toEqual([]);
  });

  test('[C5.2] finds shop by exact or partial name in Dhanori', async () => {
    const res = await searchService.search('Dhanori Fresh');
    expect(res.items.length).toBeGreaterThan(0);
    const found = res.items.find((item) => item.id === TEST_SHOP_ID || item.name.includes('Dhanori Fresh'));
    expect(found).toBeDefined();
    expect(found.name).toContain('Dhanori Fresh');
  });

  test('[C5.3] finds shop by category or description keywords', async () => {
    const res = await searchService.search('vegetables');
    expect(res.items.length).toBeGreaterThan(0);
    const found = res.items.find((item) => item.id === TEST_SHOP_ID);
    expect(found).toBeDefined();
  });

  test('[C5.4] filters results by categorySlug when specified', async () => {
    const res = await searchService.search('Fresh', { categorySlug: 'groceries' });
    expect(res.items.length).toBeGreaterThan(0);
    for (const item of res.items) {
      if (item.category) {
        expect(item.category.toLowerCase()).toContain('grocer');
      }
    }
  });
});
