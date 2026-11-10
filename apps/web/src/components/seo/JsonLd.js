import React from 'react';
import { SITE_URL, organizationSchema, shopSchema, productOffer } from '../../lib/seo.js';

/*
 * These builders used to fill missing data with invented values: a placeholder
 * phone number (+91-9876543210) on every business, opening hours nobody gave,
 * default coordinates and a generic merchant name. JSON-LD is published to
 * search engines as fact, so they now delegate to lib/seo.js, which emits only
 * what the record holds.
 */
export function getOrganizationSchema() {
  return organizationSchema();
}

export function getLocalBusinessSchema(shop) {
  return shopSchema(shop);
}

export function getProductSchema(product, shop) {
  if (!product) return null;
  const offer = productOffer(product, shop);
  return { '@context': 'https://schema.org', ...offer.itemOffered, offers: { ...offer, itemOffered: undefined } };
}

/**
 * Returns raw BreadcrumbList Schema object
 */
export function getBreadcrumbSchema(items = []) {
  if (!items || items.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`
    }))
  };
}

/**
 * Renders an Organization schema.org JSON-LD tag using React.createElement
 */
export function OrganizationJsonLd() {
  const schema = getOrganizationSchema();
  return React.createElement('script', {
    type: 'application/ld+json',
    dangerouslySetInnerHTML: { __html: JSON.stringify(schema) }
  });
}

/**
 * Renders a LocalBusiness schema.org JSON-LD tag
 */
export function LocalBusinessJsonLd({ shop }) {
  const schema = getLocalBusinessSchema(shop);
  if (!schema) return null;
  return React.createElement('script', {
    type: 'application/ld+json',
    dangerouslySetInnerHTML: { __html: JSON.stringify(schema) }
  });
}

/**
 * Renders a Product schema.org JSON-LD tag
 */
export function ProductJsonLd({ product, shop }) {
  const schema = getProductSchema(product, shop);
  if (!schema) return null;
  return React.createElement('script', {
    type: 'application/ld+json',
    dangerouslySetInnerHTML: { __html: JSON.stringify(schema) }
  });
}

/**
 * Renders BreadcrumbList schema.org JSON-LD tag
 */
export function BreadcrumbJsonLd({ items = [] }) {
  const schema = getBreadcrumbSchema(items);
  if (!schema) return null;
  return React.createElement('script', {
    type: 'application/ld+json',
    dangerouslySetInnerHTML: { __html: JSON.stringify(schema) }
  });
}
