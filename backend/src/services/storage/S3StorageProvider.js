const crypto = require('crypto');
const StorageProvider = require('./StorageProvider');

/**
 * S3-compatible Object Storage Provider.
 * Supports Cloudflare R2 (10 GB free, 0 egress fees), Supabase Storage, and AWS S3.
 */
class S3StorageProvider extends StorageProvider {
  constructor(config = {}) {
    super();
    this.endpoint = config.endpoint || process.env.STORAGE_ENDPOINT || process.env.S3_ENDPOINT || '';
    this.region = config.region || process.env.STORAGE_REGION || process.env.S3_REGION || 'auto';
    this.bucket = config.bucket || process.env.STORAGE_BUCKET || process.env.S3_BUCKET || 'localsampark';
    this.accessKey = config.accessKey || process.env.STORAGE_ACCESS_KEY || process.env.S3_ACCESS_KEY || '';
    this.secretKey = config.secretKey || process.env.STORAGE_SECRET_KEY || process.env.S3_SECRET_KEY || '';
    this.publicBaseUrl = config.publicBaseUrl || process.env.STORAGE_PUBLIC_URL || '';
  }

  isConfigured() {
    return Boolean(this.endpoint && this.bucket && this.accessKey && this.secretKey);
  }

  _getHmac(key, string) {
    return crypto.createHmac('sha256', key).update(string).digest();
  }

  _getSignatureKey(key, dateStamp, regionName, serviceName) {
    const kDate = this._getHmac('AWS4' + key, dateStamp);
    const kRegion = this._getHmac(kDate, regionName);
    const kService = this._getHmac(kRegion, serviceName);
    const kSigning = this._getHmac(kService, 'aws4_request');
    return kSigning;
  }

  async putObject({ key, buffer, mimeType = 'application/octet-stream', isPublic = true }) {
    if (!this.isConfigured()) {
      throw new Error('S3StorageProvider is not configured with STORAGE_ENDPOINT, STORAGE_BUCKET, and credentials');
    }

    const cleanKey = key.replace(/^\/+/, '');
    const cleanEndpoint = this.endpoint.replace(/\/+$/, '');
    const url = `${cleanEndpoint}/${this.bucket}/${cleanKey}`;
    const date = new Date();
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = crypto.createHash('sha256').update(buffer).digest('hex');

    const headers = {
      'host': new URL(cleanEndpoint).host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'content-type': mimeType,
      'content-length': String(buffer.length),
    };

    if (isPublic) {
      headers['x-amz-acl'] = 'public-read';
    }

    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map(k => `${k}:${headers[k]}\n`)
      .join('');
    const signedHeaders = Object.keys(headers).sort().join(';');

    const canonicalRequest = [
      'PUT',
      `/${this.bucket}/${cleanKey}`,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    const signingKey = this._getSignatureKey(this.secretKey, dateStamp, this.region, 's3');
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    headers['Authorization'] = `${algorithm} Credential=${this.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const res = await fetch(url, {
      method: 'PUT',
      headers,
      body: buffer,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`S3 upload failed (${res.status}): ${errText}`);
    }

    const publicUrl = this.publicBaseUrl
      ? `${this.publicBaseUrl.replace(/\/+$/, '')}/${cleanKey}`
      : `${cleanEndpoint}/${this.bucket}/${cleanKey}`;

    return {
      key: cleanKey,
      url: isPublic ? publicUrl : `/api/v1/upload/files/${cleanKey}`,
    };
  }

  async getSignedUrl(key, expiresInSeconds = 600) {
    if (!this.isConfigured()) {
      throw new Error('S3StorageProvider credentials not set');
    }

    const cleanKey = key.replace(/^\/+/, '');
    const cleanEndpoint = this.endpoint.replace(/\/+$/, '');
    const date = new Date();
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;

    const host = new URL(cleanEndpoint).host;
    const queryParams = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${this.accessKey}/${credentialScope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(expiresInSeconds),
      'X-Amz-SignedHeaders': 'host',
    };

    const canonicalQueryString = Object.keys(queryParams)
      .sort()
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
      .join('&');

    const canonicalRequest = [
      'GET',
      `/${this.bucket}/${cleanKey}`,
      canonicalQueryString,
      `host:${host}\n`,
      'host',
      'UNSIGNED-PAYLOAD',
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    const signingKey = this._getSignatureKey(this.secretKey, dateStamp, this.region, 's3');
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    return `${cleanEndpoint}/${this.bucket}/${cleanKey}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
  }

  async deleteObject(key) {
    if (!this.isConfigured()) return false;
    const cleanKey = key.replace(/^\/+/, '');
    const cleanEndpoint = this.endpoint.replace(/\/+$/, '');
    const url = `${cleanEndpoint}/${this.bucket}/${cleanKey}`;

    const date = new Date();
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const host = new URL(cleanEndpoint).host;

    const headers = {
      'host': host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': crypto.createHash('sha256').update('').digest('hex'),
    };

    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${headers['x-amz-content-sha256']}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

    const canonicalRequest = [
      'DELETE',
      `/${this.bucket}/${cleanKey}`,
      '',
      canonicalHeaders,
      signedHeaders,
      headers['x-amz-content-sha256'],
    ].join('\n');

    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    const signingKey = this._getSignatureKey(this.secretKey, dateStamp, this.region, 's3');
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    headers['Authorization'] = `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const res = await fetch(url, { method: 'DELETE', headers }).catch(() => null);
    return Boolean(res && res.ok);
  }
}

module.exports = S3StorageProvider;
