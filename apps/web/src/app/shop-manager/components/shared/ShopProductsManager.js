'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { API_BASE } from '@/lib/api';

/**
 * S2: the shop's products, whether each is listed, and each product's options
 * (sizes, colours, pack sizes — "variants") with their own price change and
 * stock.
 *
 * No web screen listed or edited a seller's products: the Catalogue tab works
 * on the separate universal catalogue, and shop_products — what customers
 * buy from — could only be filled by CSV upload. The list comes from
 * GET /shops/my-shop (every product the owner has, listed or not; the
 * storefront endpoint hides unlisted ones). Options use
 * /shops/:shopId/products/:productId/variants. The server's refusals (a price
 * below ₹0, negative stock) are shown as it words them.
 */
const inr = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const EMPTY = { variant_name: '', variant_value: '', price_modifier: '', inventory_count: '' };
const NEW_PRODUCT = { name: '', price: '', stock_quantity: '' };

export default function ShopProductsManager({ token }) {
  const [shopId, setShopId] = useState(null);
  const [products, setProducts] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [variants, setVariants] = useState({}); // productId -> []
  const [form, setForm] = useState(EMPTY);
  const [newProduct, setNewProduct] = useState(NEW_PRODUCT);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const call = useCallback(async (path, init = {}) => {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
    return body;
  }, [token]);

  const load = useCallback(async () => {
    try {
      const mine = await call('/shops/my-shop');
      setShopId(mine.shop && mine.shop.id);
      setProducts(Array.isArray(mine.products) ? mine.products : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => { if (token) load(); }, [token, load]);

  const loadVariants = useCallback(async (productId) => {
    const body = await call(`/shops/${shopId}/products/${productId}/variants`);
    setVariants((v) => ({ ...v, [productId]: body.variants || [] }));
  }, [call, shopId]);

  const open = async (productId) => {
    setError(''); setNotice(''); setForm(EMPTY);
    if (openId === productId) { setOpenId(null); return; }
    setOpenId(productId);
    try { await loadVariants(productId); } catch (e) { setError(e.message); }
  };

  const toggleListed = async (p) => {
    setError(''); setNotice('');
    const next = !isListed(p);
    try {
      await call(`/shops/my-shop/products/${p.id}`, { method: 'PUT', body: JSON.stringify({ is_available: next }) });
      setNotice(`${p.name} is ${next ? 'listed' : 'unlisted'}.`);
      await load();
    } catch (e) { setError(e.message); }
  };

  const addProduct = async (e) => {
    e.preventDefault();
    setError(''); setNotice('');
    try {
      const created = await call('/shops/my-shop/products', {
        method: 'POST',
        body: JSON.stringify({ name: newProduct.name, price: newProduct.price, stock_quantity: newProduct.stock_quantity }),
      });
      setNotice(`${created.product.name} added.`);
      setNewProduct(NEW_PRODUCT);
      await load();
    } catch (err) { setError(err.message); }
  };

  const addVariant = async (e, product) => {
    e.preventDefault();
    setError(''); setNotice('');
    try {
      await call(`/shops/${shopId}/products/${product.id}/variants`, {
        method: 'POST',
        body: JSON.stringify({
          variant_name: form.variant_name,
          variant_value: form.variant_value,
          price_modifier: form.price_modifier === '' ? 0 : form.price_modifier,
          inventory_count: form.inventory_count === '' ? 0 : form.inventory_count,
        }),
      });
      setNotice(`Option added to ${product.name}.`);
      setForm(EMPTY);
      await loadVariants(product.id);
    } catch (err) { setError(err.message); }
  };

  const removeVariant = async (product, v) => {
    setError(''); setNotice('');
    try {
      await call(`/shops/${shopId}/products/${product.id}/variants/${v.id}`, { method: 'DELETE' });
      setNotice(`Removed ${v.variant_name}: ${v.variant_value}.`);
      await loadVariants(product.id);
    } catch (err) { setError(err.message); }
  };

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setP = (k) => (e) => setNewProduct((f) => ({ ...f, [k]: e.target.value }));

  if (loading) return <p role="status">Loading your products…</p>;

  return (
    <section aria-labelledby="products-heading" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 id="products-heading" style={{ fontSize: '1.2rem', fontWeight: 700 }}>Products &amp; options</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>What customers buy from your shop. Unlisted products stay here but customers cannot see them.</p>
      </div>

      {error && <p role="alert" style={{ color: '#dc2626' }}>{error}</p>}
      {notice && <p role="status">{notice}</p>}

      <form onSubmit={addProduct} aria-label="New product" style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        <label>Product name<input className="form-input" required value={newProduct.name} onChange={setP('name')} /></label>
        <label>Price (₹)<input className="form-input" inputMode="decimal" value={newProduct.price} onChange={setP('price')} /></label>
        <label>Stock<input className="form-input" inputMode="numeric" value={newProduct.stock_quantity} onChange={setP('stock_quantity')} /></label>
        <button type="submit" className="btn btn-primary">Add product</button>
      </form>

      {products.length === 0 ? (
        <p role="status" style={{ color: 'var(--text-muted)' }}>No products yet.</p>
      ) : (
        <ul aria-label="Your products" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {products.map((p) => (
            <li key={p.id} data-testid={`product-${p.id}`} style={{ border: '1px solid rgba(148,163,184,0.3)', borderRadius: 10, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span><strong>{p.name}</strong> — {inr(p.price)} · {Number(p.stock_quantity ?? p.inventory_count) || 0} in stock · {isListed(p) ? 'Listed' : 'Unlisted'}</span>
                <span style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => toggleListed(p)}>{isListed(p) ? `Unlist ${p.name}` : `List ${p.name}`}</button>
                  <button type="button" className="btn btn-secondary" aria-expanded={openId === p.id} onClick={() => open(p.id)}>Options for {p.name}</button>
                </span>
              </div>

              {openId === p.id && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(variants[p.id] || []).length === 0 ? (
                    <p role="status" style={{ color: 'var(--text-muted)' }}>No options yet.</p>
                  ) : (
                    <ul aria-label={`Options of ${p.name}`}>
                      {variants[p.id].map((v) => (
                        <li key={v.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '4px 0' }}>
                          <span>{v.variant_name}: {v.variant_value} · {modifierLabel(v.price_modifier)} · {Number(v.inventory_count) || 0} in stock</span>
                          <button type="button" className="btn btn-secondary" onClick={() => removeVariant(p, v)}>Remove {v.variant_value}</button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <form onSubmit={(e) => addVariant(e, p)} aria-label={`New option for ${p.name}`} style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                    <label>Option (e.g. Size)<input className="form-input" required value={form.variant_name} onChange={setF('variant_name')} /></label>
                    <label>Value (e.g. Large)<input className="form-input" required value={form.variant_value} onChange={setF('variant_value')} /></label>
                    <label>Price change (₹)<input className="form-input" inputMode="decimal" value={form.price_modifier} onChange={setF('price_modifier')} /></label>
                    <label>Option stock<input className="form-input" inputMode="numeric" value={form.inventory_count} onChange={setF('inventory_count')} /></label>
                    <button type="submit" className="btn btn-primary">Add option</button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function isListed(p) {
  return [true, 1, '1', 't', 'true'].includes(p.is_available ?? p.is_active ?? 1);
}

function modifierLabel(mod) {
  const n = Number(mod) || 0;
  return n === 0 ? 'same price' : `${n > 0 ? '+' : '-'}₹${Math.abs(n)}`;
}
