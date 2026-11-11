'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useCartStore } from '@/store/cartStore';
import { recordView } from '@/lib/recentlyViewed';

/**
 * The product page (C4). The web had none: products were only rows inside a
 * shop page. Everything here comes from GET /shops/:id/products/:productId;
 * a declaration the seller has not given says so, it is never filled in.
 */
const LEGAL_ROWS = [
  ['genericName', 'Generic name'],
  ['netQuantity', 'Net quantity'],
  ['manufacturer', 'Manufacturer / packer / importer'],
  ['countryOfOrigin', 'Country of origin'],
  ['bestBefore', 'Best before'],
  ['consumerCare', 'Consumer care'],
];

const rupees = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function ProductPage() {
  const { id: shopId, productId } = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const addItem = useCartStore((s) => s.addItem);

  const [product, setProduct] = useState(null);
  const [error, setError] = useState(null);
  const [image, setImage] = useState(0);
  const [variantId, setVariantId] = useState(null);
  const [qty, setQty] = useState(1);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    apiGet(`/shops/${encodeURIComponent(shopId)}/products/${encodeURIComponent(productId)}`)
      .then((r) => {
        const p = r.product;
        setProduct(p);
        const firstInStock = (p.variants || []).find((v) => v.inStock);
        setVariantId(firstInStock ? firstInStock.id : null);
        // C12: recently viewed, on this device.
        try {
          recordView(window.localStorage, { productId: p.id, shopId: p.shopId, name: p.name, price: p.price, image: p.images[0] || null, shopName: p.seller.name });
        } catch { /* storage blocked */ }
      })
      .catch((e) => setError(e.status === 404 ? 'This product is not available.' : (e.message || 'The product could not be loaded.')));
  }, [shopId, productId]);

  // C12: whether it is on the customer's wishlist.
  useEffect(() => {
    if (!token) return;
    apiGet('/wishlist')
      .then((r) => setSaved(((r && r.items) || []).some((i) => String(i.productId) === String(productId))))
      .catch(() => {});
  }, [token, productId]);

  const variant = useMemo(() => (product && variantId ? product.variants.find((v) => v.id === variantId) : null), [product, variantId]);
  const price = variant ? variant.price : product && product.price;
  const discount = variant ? variant.discountPercent : product && product.discountPercent;
  const max = variant ? variant.maxQuantity : product && product.maxQuantity;
  const inStock = variant ? variant.inStock : product && product.inStock;
  const mustChoose = product && product.variants.length > 0 && !variant;

  useEffect(() => { if (max !== null && max !== undefined && qty > Math.max(1, max)) setQty(Math.max(1, max)); }, [max, qty]);

  const addToCart = () => {
    addItem({
      id: product.id,
      name: variant ? `${product.name} (${variant.value})` : product.name,
      price,
      image_url: product.images[0] || null,
      shop_id: product.shopId,
      shop_name: product.seller.name,
      shop_category: product.seller.category,
    }, qty, variant ? { variantId: variant.id, [variant.name]: variant.value } : {});
    setNotice(`Added ${qty} to your cart.`);
  };

  const toggleSave = async () => {
    if (!token) { router.push('/login'); return; }
    const next = !saved;
    setSaved(next);
    try {
      if (next) await apiPost(`/wishlist/${encodeURIComponent(product.id)}`, {});
      else await apiDelete(`/wishlist/${encodeURIComponent(product.id)}`);
    } catch {
      setSaved(!next);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-4">
          {error && <p role="alert" className="text-red-500 font-bold">{error}</p>}
          {!product && !error && <p className="text-text-muted">Loading…</p>}
          {product && (
            <div className="grid md:grid-cols-2 gap-8">
              <section aria-label="Photos">
                <div className="aspect-square rounded-3xl overflow-hidden bg-background-alt border border-border flex items-center justify-center">
                  {product.images.length
                    ? <img src={product.images[image]} alt={product.name} className="w-full h-full object-cover" />
                    : <span className="text-text-muted text-sm">No photo yet</span>}
                </div>
                {product.images.length > 1 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto">
                    {product.images.map((src, i) => (
                      <button key={src} type="button" onClick={() => setImage(i)} aria-label={`Photo ${i + 1}`}
                        className={`w-16 h-16 shrink-0 rounded-xl overflow-hidden border-2 ${i === image ? 'border-primary' : 'border-border'}`}>
                        <img src={src} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-5">
                <div>
                  <Link href={`/shops/${product.shopId}`} className="text-sm font-bold text-primary">{product.seller.name}</Link>
                  <h1 className="text-3xl font-heading font-black text-text mt-1">{product.name}</h1>
                  {product.unit && <p className="text-text-muted text-sm">{product.unit}</p>}
                </div>

                <div className="flex items-baseline gap-3 flex-wrap" data-testid="product-price">
                  <span className="text-3xl font-black text-text">{rupees(price)}</span>
                  {product.mrp && product.mrp > price && <span className="text-text-muted line-through">MRP {rupees(product.mrp)}</span>}
                  {discount > 0 && <span className="px-2 py-0.5 rounded-full bg-green-600/15 text-green-700 text-sm font-bold">{discount}% off</span>}
                  {product.mrp && <span className="text-xs text-text-muted w-full">Inclusive of all taxes</span>}
                </div>

                {product.variants.length > 0 && (
                  <div>
                    <p className="font-bold text-text mb-2">{product.variants[0].name}</p>
                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={product.variants[0].name}>
                      {product.variants.map((v) => (
                        <button key={v.id} type="button" role="radio" aria-checked={variantId === v.id} disabled={!v.inStock}
                          onClick={() => setVariantId(v.id)}
                          className={`px-4 min-h-[44px] rounded-xl border font-bold disabled:opacity-40 disabled:line-through ${variantId === v.id ? 'border-primary bg-primary-glass text-primary' : 'border-border text-text'}`}>
                          {v.value} · {rupees(v.price)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {inStock ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center border border-border rounded-xl">
                      <button type="button" aria-label="Fewer" className="w-11 h-11 font-black" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
                      <span className="w-10 text-center font-bold" data-testid="product-qty">{qty}</span>
                      <button type="button" aria-label="More" className="w-11 h-11 font-black disabled:opacity-40"
                        disabled={max !== null && max !== undefined && qty >= max} onClick={() => setQty((q) => q + 1)}>+</button>
                    </div>
                    <button type="button" onClick={addToCart} disabled={mustChoose}
                      className="px-6 min-h-[44px] rounded-xl bg-primary text-white font-bold disabled:opacity-50">Add to cart</button>
                    <button type="button" onClick={toggleSave} aria-pressed={saved}
                      className="px-4 min-h-[44px] rounded-xl border border-border font-bold text-text">{saved ? '♥ Saved' : '♡ Save'}</button>
                    {product.quantityLimit && <p className="text-xs text-text-muted w-full">At most {product.quantityLimit} per order.</p>}
                  </div>
                ) : (
                  <p className="font-bold text-red-500">Out of stock</p>
                )}
                {notice && <p role="status" className="text-green-700 font-semibold">{notice} <Link href="/checkout" className="underline">Go to cart</Link></p>}

                {product.description && <p className="text-text whitespace-pre-line">{product.description}</p>}

                <div className="glass-card rounded-2xl border border-border p-4 space-y-1 text-sm" data-testid="seller">
                  <p className="font-bold text-text">Sold by {product.seller.name}</p>
                  {product.seller.address && <p className="text-text-muted">{product.seller.address}</p>}
                  {product.seller.foodBusiness && (
                    <p className="text-text-muted">FSSAI Lic. No. {product.seller.fssaiLicence || <span className="italic">not provided by the seller</span>}</p>
                  )}
                  <p className="text-text-muted">{product.returns.summary}</p>
                </div>

                <div>
                  <h2 className="font-bold text-text mb-2">Product details</h2>
                  <table className="w-full text-sm" data-testid="legal-details">
                    <tbody>
                      {LEGAL_ROWS.map(([key, label]) => (
                        <tr key={key} className="border-b border-border/60">
                          <th scope="row" className="text-left py-2 pr-3 font-semibold text-text-muted align-top w-2/5">{label}</th>
                          <td className="py-2 text-text">{product.legal[key] || <span className="italic text-text-muted">Not provided by the seller</span>}</td>
                        </tr>
                      ))}
                      {product.mrp && (
                        <tr className="border-b border-border/60">
                          <th scope="row" className="text-left py-2 pr-3 font-semibold text-text-muted">MRP</th>
                          <td className="py-2 text-text">{rupees(product.mrp)} (incl. of all taxes)</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="md:col-span-2" aria-labelledby="reviews-heading">
                <h2 id="reviews-heading" className="text-xl font-bold text-text mb-2">
                  Reviews of {product.seller.name}
                  {product.reviews.averageRating !== null && (
                    <span className="text-base font-semibold text-text-muted"> · {product.reviews.averageRating}★ from {product.reviews.verifiedCount} verified {product.reviews.verifiedCount === 1 ? 'purchase' : 'purchases'}</span>
                  )}
                </h2>
                {product.reviews.items.length === 0 && <p className="text-text-muted">No reviews yet.</p>}
                <ul className="space-y-3">
                  {product.reviews.items.map((r) => (
                    <li key={r.id} className="glass-card rounded-2xl border border-border p-4" data-testid="review">
                      <p className="font-bold text-text">{'★'.repeat(r.rating)}{'☆'.repeat(Math.max(0, 5 - r.rating))} <span className="font-semibold">{r.author}</span>
                        {r.verifiedPurchase
                          ? <span className="ml-2 text-xs font-bold text-green-700">Verified purchase</span>
                          : <span className="ml-2 text-xs text-text-muted">Not a verified purchase</span>}
                      </p>
                      {r.text && <p className="text-text mt-1">{r.text}</p>}
                      {r.reply && <p className="text-sm text-text-muted mt-2 border-l-2 border-primary pl-3">Reply from the shop: {r.reply}</p>}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
