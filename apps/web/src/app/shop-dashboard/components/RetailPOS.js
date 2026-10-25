'use client';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ShoppingCart, Package, ScanLine, Plus, Minus, X, IndianRupee,
  Tag, Percent, CreditCard, Smartphone, Banknote, Receipt, Search,
  ChevronDown, Check, AlertCircle, Printer
} from 'lucide-react';

import { apiGet, apiPost } from '@/lib/api';

// Products come from the shop's own catalogue (GET /shops/my-shop). Sales are rung through
// POST /shops/my-shop/pos-sales, which prices them from the same table, takes the stock off and
// records the bill. This screen used to sell a built-in list of branded groceries at made-up prices
// and stock, and "Payment Successful!" recorded nothing.
const toProduct = (p) => ({
  id: String(p.id),
  name: p.name,
  price: Number(p.price) || 0,
  category: p.category || 'General',
  emoji: '📦',
  stock: Number(p.track_inventory) ? Number(p.inventory_count ?? p.stock_quantity ?? 0) : 9999,
  unit: p.unit || 'pc',
});

const GST_RATES = [0, 5, 12, 18];

export default function RetailPOS() {
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [discount, setDiscount] = useState({ type: 'flat', value: '' }); // type: flat|percent
  const [gstRate, setGstRate] = useState(5);
  const [paymentMethod, setPaymentMethod] = useState('cash'); // cash|upi|card
  const [checkoutDone, setCheckoutDone] = useState(false);
  const [lastBillNo, setLastBillNo] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [lastTotal, setLastTotal] = useState(null);

  const loadProducts = useCallback(() => {
    apiGet('/shops/my-shop')
      .then((r) => { setProducts((r.products || r.shop?.products || []).filter((p) => p.is_available !== 0 && p.is_available !== false).map(toProduct)); setLoadError(null); })
      .catch((e) => setLoadError(e.status === 404 ? 'Register your shop to use the point of sale.' : (e.message || 'Your products could not be loaded.')));
  }, []);
  useEffect(() => { loadProducts(); }, [loadProducts]);
  const CATEGORIES = useMemo(() => ['All', ...new Set(products.map((p) => p.category))], [products]);

  // ── Cart Logic ───────────────────────────────────────────────────────────
  const addToCart = useCallback((product) => {
    if (product.stock === 0) return;
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, qty: Math.min(i.qty + 1, product.stock) } : i);
      }
      return [...prev, { ...product, qty: 1, itemDiscount: 0 }];
    });
  }, []);

  const updateQty = useCallback((id, delta) => {
    setCart(prev => prev
      .map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i)
      .filter(i => i.qty > 0)
    );
  }, []);

  const setQty = useCallback((id, val) => {
    const n = parseInt(val, 10);
    if (isNaN(n) || n < 0) return;
    setCart(prev => n === 0
      ? prev.filter(i => i.id !== id)
      : prev.map(i => i.id === id ? { ...i, qty: n } : i)
    );
  }, []);

  const removeItem = useCallback((id) => {
    setCart(prev => prev.filter(i => i.id !== id));
  }, []);

  const setItemDiscount = useCallback((id, val) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, itemDiscount: Math.min(100, Math.max(0, Number(val))) } : i));
  }, []);

  // ── Totals ───────────────────────────────────────────────────────────────
  const subtotal = cart.reduce((sum, i) => {
    const lineTotal = i.price * i.qty;
    const afterItemDisc = lineTotal - (lineTotal * (i.itemDiscount / 100));
    return sum + afterItemDisc;
  }, 0);

  const billDiscount = discount.value
    ? discount.type === 'flat'
      ? Math.min(Number(discount.value), subtotal)
      : (subtotal * Number(discount.value)) / 100
    : 0;

  const taxable = subtotal - billDiscount;
  const gstAmount = (taxable * gstRate) / 100;
  const grandTotal = taxable + gstAmount;

  // ── Checkout ─────────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (cart.length === 0 || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const r = await apiPost('/shops/my-shop/pos-sales', {
        items: cart.map((i) => ({ productId: i.id, quantity: i.qty, ...(i.itemDiscount ? { discountPercent: i.itemDiscount } : {}) })),
        discount: discount.value ? { type: discount.type, value: Number(discount.value) } : undefined,
        gstRate,
        paymentMethod,
      });
      setLastBillNo(r.sale.billNo);
      setLastTotal(r.sale.total);
      setCheckoutDone(true);
      loadProducts();
    } catch (e) {
      setSaveError(e.message || 'The sale was not recorded. Nothing was charged.');
    } finally {
      setSaving(false);
    }
  };

  const resetPOS = () => {
    setCart([]);
    setDiscount({ type: 'flat', value: '' });
    setCheckoutDone(false);
    setLastBillNo(null);
    setGstRate(5);
    setPaymentMethod('cash');
  };

  // ── Filtered products ────────────────────────────────────────────────────
  const filtered = products.filter(p => {
    const matchCat = activeCategory === 'All' || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  // ── Success Screen ────────────────────────────────────────────────────────
  if (checkoutDone) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', gap: '1.5rem', textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Check size={40} color="white" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Sale recorded</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Bill No: <strong>{lastBillNo}</strong>{lastTotal !== null && <> · Total <strong>₹{Number(lastTotal).toFixed(2)}</strong></>}</p>
          <p style={{ color: 'var(--text-muted)' }}>Amount Charged: <strong style={{ color: 'var(--primary)', fontSize: '1.25rem' }}>₹{grandTotal.toFixed(2)}</strong></p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>via {paymentMethod.toUpperCase()}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => window.print()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
          >
            <Printer size={16} /> Print Receipt
          </button>
          <button
            onClick={resetPOS}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: 700 }}
          >
            <Plus size={16} /> New Sale
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '1.5rem', height: 'calc(100vh - 220px)', minHeight: 600 }}>

      {/* ── LEFT: Product Grid ──────────────────────────────────────────────── */}
      <div style={{ flex: '2', display: 'flex', flexDirection: 'column', background: 'var(--surface)', borderRadius: '1.25rem', border: '1px solid var(--border)', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={20} style={{ color: 'var(--primary)' }} />
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>Product Catalog</span>
          </div>
          {/* Search */}
          <div style={{ flex: 1, position: 'relative', minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search products or scan barcode..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.25rem', borderRadius: '0.625rem', border: '1px solid var(--border)', background: 'var(--background)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ScanLine size={16} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Barcode ready</span>
          </div>
        </div>

        {/* Category Filter */}
        <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{
              padding: '0.3rem 0.875rem', borderRadius: '2rem', border: '1px solid',
              borderColor: activeCategory === cat ? 'var(--primary)' : 'var(--border)',
              background: activeCategory === cat ? 'var(--primary)' : 'transparent',
              color: activeCategory === cat ? 'white' : 'var(--text-muted)',
              cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap'
            }}>
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.875rem', alignContent: 'start' }}>
          {loadError && <p role="alert" style={{ color: '#ef4444', fontWeight: 700, gridColumn: '1 / -1' }}>{loadError}</p>}
          {!loadError && products.length === 0 && <p style={{ color: 'var(--text-muted)', gridColumn: '1 / -1' }}>Add products to your catalogue to start selling here.</p>}
          {filtered.map(p => {
            const inCart = cart.find(i => i.id === p.id);
            return (
              <div
                key={p.id}
                onClick={() => addToCart(p)}
                style={{
                  border: `2px solid ${inCart ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: '0.875rem', padding: '0.875rem 0.75rem', cursor: p.stock === 0 ? 'not-allowed' : 'pointer',
                  background: inCart ? 'var(--primary-light, rgba(99,102,241,0.08))' : 'var(--background)',
                  opacity: p.stock === 0 ? 0.5 : 1,
                  transition: 'all 0.15s ease', textAlign: 'center', position: 'relative',
                  userSelect: 'none'
                }}
              >
                {inCart && (
                  <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', width: 20, height: 20, borderRadius: '50%', background: 'var(--primary)', color: 'white', fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {inCart.qty}
                  </div>
                )}
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{p.emoji}</div>
                <p style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.25rem', lineHeight: 1.3 }}>{p.name}</p>
                <p style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '0.9rem' }}>₹{p.price}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>/{p.unit} · {p.stock > 0 ? `${p.stock} left` : 'Out of Stock'}</p>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
              <AlertCircle size={32} style={{ margin: '0 auto 0.75rem' }} />
              <p>No products found</p>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Cart & Billing ────────────────────────────────────────────── */}
      <div style={{ width: 360, display: 'flex', flexDirection: 'column', background: 'var(--surface)', borderRadius: '1.25rem', border: '1px solid var(--border)', overflow: 'hidden', flexShrink: 0 }}>

        {/* Cart Header */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--primary-light, rgba(99,102,241,0.07))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingCart size={18} style={{ color: 'var(--primary)' }} />
            <span style={{ fontWeight: 700 }}>Current Bill</span>
            {cartCount > 0 && (
              <span style={{ background: 'var(--primary)', color: 'white', borderRadius: '2rem', padding: '0.1rem 0.6rem', fontSize: '0.75rem', fontWeight: 800 }}>{cartCount} items</span>
            )}
          </div>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} style={{ color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
              Clear All
            </button>
          )}
        </div>

        {/* Cart Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
          {cart.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', opacity: 0.5 }}>
              <ShoppingCart size={40} style={{ marginBottom: '0.75rem' }} />
              <p style={{ fontWeight: 600 }}>Cart is empty</p>
              <p style={{ fontSize: '0.8rem' }}>Click products to add them</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {cart.map(item => (
                <div key={item.id} style={{ padding: '0.75rem', background: 'var(--background)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div style={{ flex: 1, paddingRight: '0.5rem' }}>
                      <p style={{ fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.3 }}>{item.name}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>₹{item.price} × {item.qty} = <strong style={{ color: 'var(--text)' }}>₹{(item.price * item.qty * (1 - item.itemDiscount / 100)).toFixed(0)}</strong></p>
                    </div>
                    <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', padding: '0.1rem' }}>
                      <X size={16} />
                    </button>
                  </div>
                  
                  {/* Qty Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button onClick={() => updateQty(item.id, -1)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Minus size={12} />
                    </button>
                    <input
                      type="number"
                      value={item.qty}
                      onChange={e => setQty(item.id, e.target.value)}
                      min="1"
                      style={{ width: 44, textAlign: 'center', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.2rem', fontWeight: 700, background: 'var(--surface)', fontSize: '0.875rem' }}
                    />
                    <button onClick={() => updateQty(item.id, 1)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--primary)', background: 'var(--primary)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Plus size={12} />
                    </button>
                    
                    {/* Item Discount */}
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Tag size={12} style={{ color: 'var(--text-muted)' }} />
                      <input
                        type="number"
                        placeholder="0%"
                        value={item.itemDiscount || ''}
                        onChange={e => setItemDiscount(item.id, e.target.value)}
                        min="0" max="100"
                        style={{ width: 40, textAlign: 'center', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.2rem', fontSize: '0.75rem', background: 'var(--surface)' }}
                      />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>%off</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Billing Footer */}
        {cart.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border)', padding: '1rem 1.25rem', background: 'var(--background)' }}>

            {/* Bill-Level Discount */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
              <Percent size={14} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>Bill Discount:</span>
              <select
                value={discount.type}
                onChange={e => setDiscount(d => ({ ...d, type: e.target.value }))}
                style={{ border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: 'var(--surface)', cursor: 'pointer' }}
              >
                <option value="flat">₹ Flat</option>
                <option value="percent">% Off</option>
              </select>
              <input
                type="number"
                placeholder={discount.type === 'flat' ? '₹0' : '0%'}
                value={discount.value}
                onChange={e => setDiscount(d => ({ ...d, value: e.target.value }))}
                min="0"
                style={{ flex: 1, border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: 'var(--surface)' }}
              />
            </div>

            {/* GST Rate */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <IndianRupee size={14} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>GST Rate:</span>
              <div style={{ display: 'flex', gap: '0.25rem', marginLeft: '0.25rem' }}>
                {GST_RATES.map(r => (
                  <button key={r} onClick={() => setGstRate(r)} style={{
                    padding: '0.2rem 0.5rem', borderRadius: '0.375rem', border: '1px solid',
                    borderColor: gstRate === r ? 'var(--primary)' : 'var(--border)',
                    background: gstRate === r ? 'var(--primary)' : 'transparent',
                    color: gstRate === r ? 'white' : 'var(--text-muted)',
                    fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600
                  }}>{r}%</button>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginBottom: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {billDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--success)' }}>Discount</span>
                  <span style={{ color: 'var(--success)' }}>−₹{billDiscount.toFixed(2)}</span>
                </div>
              )}
              {gstRate > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>GST ({gstRate}%)</span>
                  <span>+₹{gstAmount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 800, fontSize: '1rem' }}>TOTAL</span>
                <span style={{ fontWeight: 900, fontSize: '1.25rem', color: 'var(--primary)' }}>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {[
                { id: 'cash', label: 'Cash', Icon: Banknote },
                { id: 'upi', label: 'UPI', Icon: Smartphone },
                { id: 'card', label: 'Card', Icon: CreditCard }
              ].map(({ id, label, Icon }) => (
                <button key={id} onClick={() => setPaymentMethod(id)} style={{
                  flex: 1, padding: '0.5rem', borderRadius: '0.625rem', border: '1.5px solid',
                  borderColor: paymentMethod === id ? 'var(--primary)' : 'var(--border)',
                  background: paymentMethod === id ? 'var(--primary-light, rgba(99,102,241,0.1))' : 'transparent',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem'
                }}>
                  <Icon size={16} style={{ color: paymentMethod === id ? 'var(--primary)' : 'var(--text-muted)' }} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: paymentMethod === id ? 'var(--primary)' : 'var(--text-muted)' }}>{label}</span>
                </button>
              ))}
            </div>

            {/* Charge Button */}
            <button
              onClick={handleCheckout}
              disabled={saving}
              style={{
                width: '100%', padding: '0.875rem', borderRadius: '0.875rem',
                background: 'linear-gradient(135deg, var(--primary), #7c3aed)',
                color: 'white', border: 'none', cursor: 'pointer',
                fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                boxShadow: '0 4px 16px rgba(99,102,241,0.35)'
              }}
            >
              <Receipt size={18} />
              {saving ? 'Recording sale…' : `Charge ₹${grandTotal.toFixed(2)} · ${paymentMethod.toUpperCase()}`}
            </button>
            {saveError && <p role="alert" style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.85rem', marginTop: '0.5rem' }}>{saveError}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
