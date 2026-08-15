// Advanced Resume Parser — Regex-based, offline, zero-dependency
// Extracts: name, email, phone, skills, education, experience, links

const SKILL_DATABASE = [
  // Programming
  'javascript','typescript','python','java','c++','c#','php','ruby','go','rust','swift','kotlin','dart','scala','perl','r',
  'html','css','sass','less','tailwind','bootstrap',
  'react','reactjs','angular','vue','vuejs','svelte','next.js','nextjs','nuxt','gatsby',
  'node','nodejs','express','fastify','nest','nestjs','django','flask','fastapi','spring','spring boot',
  'sql','mysql','postgresql','postgres','mongodb','redis','elasticsearch','firebase','supabase','dynamodb','sqlite','oracle',
  'docker','kubernetes','k8s','aws','azure','gcp','heroku','vercel','netlify',
  'git','github','gitlab','bitbucket','jenkins','ci/cd','terraform','ansible',
  'rest','graphql','grpc','websocket','socket.io',
  'machine learning','deep learning','tensorflow','pytorch','scikit-learn','pandas','numpy','opencv',
  'figma','photoshop','illustrator','sketch','xd','canva',
  // Business & Soft Skills
  'excel','ms office','powerpoint','word','google sheets','tableau','power bi',
  'project management','agile','scrum','kanban','jira','trello','asana',
  'communication','leadership','teamwork','problem solving','critical thinking',
  'sales','marketing','digital marketing','seo','sem','social media','content writing',
  'accounting','tally','gst','taxation','bookkeeping','sap',
  // Trade Skills
  'driving','cooking','plumbing','electrical','carpentry','welding','painting',
  'tailoring','beautician','photography','videography','graphic design',
  'customer service','data entry','typing','receptionist','teaching','tutoring',
];

const EDUCATION_PATTERNS = [
  /\b(b\.?tech|b\.?e\.?|bachelor of technology|bachelor of engineering)\b/gi,
  /\b(m\.?tech|m\.?e\.?|master of technology|master of engineering)\b/gi,
  /\b(b\.?sc|bachelor of science|b\.?com|bachelor of commerce|b\.?a\.?|bachelor of arts)\b/gi,
  /\b(m\.?sc|master of science|m\.?com|master of commerce|m\.?a\.?|master of arts)\b/gi,
  /\b(mba|master of business|pgdm)\b/gi,
  /\b(ph\.?d|doctorate|doctoral)\b/gi,
  /\b(diploma|polytechnic|iti|industrial training)\b/gi,
  /\b(10th|12th|ssc|hsc|intermediate|matriculation|higher secondary)\b/gi,
  /\b(bca|mca|b\.?des|m\.?des)\b/gi,
  /\b(mbbs|md|bds|bams|bhms|b\.?pharm)\b/gi,
  /\b(llb|ll\.?m|law)\b/gi,
  /\b(ca|chartered accountant|cs|company secretary|cma|icwa)\b/gi,
];

const EXPERIENCE_PATTERNS = [
  /(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp|work)/gi,
  /experience\s*:?\s*(\d+)\s*(?:years?|yrs?)/gi,
  /(?:total|overall)\s*(?:exp|experience)\s*:?\s*(\d+)/gi,
  /worked\s*(?:for\s*)?(\d+)\s*(?:years?|yrs?)/gi,
];

function parseResumeText(text) {
  if (!text || typeof text !== 'string') return { skills: [], education: [], experience_years: 0 };

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const fullText = text.toLowerCase();
  const result = {
    name: null,
    email: null,
    phone: null,
    skills: [],
    education: [],
    experience_years: 0,
    experience_entries: [],
    links: [],
    languages: [],
    summary: null,
    raw_sections: {}
  };

  // ═══ EMAIL ═══
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (emailMatch) result.email = emailMatch[0];

  // ═══ PHONE ═══
  const phoneMatch = text.match(/(?:\+91[\s-]?)?(?:0?[6-9]\d{9}|\d{3}[\s.-]\d{3}[\s.-]\d{4}|\(\d{3}\)\s?\d{3}[\s.-]\d{4})/);
  if (phoneMatch) result.phone = phoneMatch[0].replace(/[\s.-]/g, '');

  // ═══ NAME (heuristic: first non-empty line that's not email/phone/url) ═══
  for (const line of lines.slice(0, 5)) {
    const clean = line.replace(/[^a-zA-Z\s.]/g, '').trim();
    if (clean.length >= 3 && clean.length <= 50 && !clean.includes('@') && !clean.includes('http') && 
        !clean.match(/resume|curriculum|cv|objective|summary|profile/i) &&
        clean.split(' ').length >= 2 && clean.split(' ').length <= 5) {
      result.name = clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      break;
    }
  }

  // ═══ SKILLS (multi-strategy matching) ═══
  const foundSkills = new Set();
  for (const skill of SKILL_DATABASE) {
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    if (regex.test(fullText)) {
      foundSkills.add(skill.charAt(0).toUpperCase() + skill.slice(1));
    }
  }
  // Also check for skill section
  const skillSectionMatch = text.match(/(?:skills?|technical\s*skills?|key\s*skills?|core\s*competenc(?:ies|y))\s*:?\s*\n?([\s\S]*?)(?:\n\s*\n|$)/i);
  if (skillSectionMatch) {
    const skillLine = skillSectionMatch[1];
    const extraSkills = skillLine.split(/[,|•·●\n;]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 40);
    extraSkills.forEach(s => foundSkills.add(s));
  }
  result.skills = [...foundSkills].slice(0, 30);

  // ═══ EDUCATION ═══
  const foundEdu = new Set();
  for (const pattern of EDUCATION_PATTERNS) {
    let m;
    const re = new RegExp(pattern.source, pattern.flags);
    while ((m = re.exec(text)) !== null) {
      foundEdu.add(m[0].toUpperCase());
    }
  }
  result.education = [...foundEdu];

  // ═══ EXPERIENCE YEARS ═══
  for (const pattern of EXPERIENCE_PATTERNS) {
    let m;
    const re = new RegExp(pattern.source, pattern.flags);
    while ((m = re.exec(text)) !== null) {
      const years = parseInt(m[1]);
      if (years > 0 && years < 50 && years > result.experience_years) {
        result.experience_years = years;
      }
    }
  }

  // ═══ EXPERIENCE ENTRIES (company/role detection) ═══
  const companyPatterns = [
    /(?:at|@|with)\s+([A-Z][a-zA-Z\s&.]+(?:Ltd|Pvt|Inc|Corp|LLC|LLP|Co\.?)?)/g,
    /(?:company|employer|organization)\s*:?\s*([A-Z][a-zA-Z\s&.]+)/gi,
  ];
  for (const pat of companyPatterns) {
    let m;
    while ((m = pat.exec(text)) !== null) {
      if (m[1].trim().length > 2) result.experience_entries.push(m[1].trim());
    }
  }

  // ═══ LINKS ═══
  const urlMatch = text.match(/https?:\/\/[^\s<>"]+/g);
  if (urlMatch) {
    result.links = urlMatch.map(url => {
      if (url.includes('linkedin')) return { type: 'linkedin', url };
      if (url.includes('github')) return { type: 'github', url };
      if (url.includes('portfolio') || url.includes('behance') || url.includes('dribbble')) return { type: 'portfolio', url };
      return { type: 'other', url };
    });
  }

  // ═══ LANGUAGES ═══
  const langPatterns = ['english','hindi','marathi','tamil','telugu','kannada','bengali','gujarati','punjabi','urdu','malayalam','odia','sanskrit','french','german','spanish','japanese','chinese','korean','arabic'];
  for (const lang of langPatterns) {
    if (fullText.includes(lang)) result.languages.push(lang.charAt(0).toUpperCase() + lang.slice(1));
  }

  // ═══ SUMMARY (first paragraph-like block) ═══
  const summaryMatch = text.match(/(?:summary|objective|about\s*me|profile)\s*:?\s*\n?([\s\S]{20,300}?)(?:\n\s*\n|$)/i);
  if (summaryMatch) result.summary = summaryMatch[1].trim();

  // ═══ HEALTH SCORE ═══
  let health = 0;
  if (result.name) health += 15;
  if (result.email) health += 10;
  if (result.phone) health += 10;
  if (result.skills.length > 0) health += Math.min(25, result.skills.length * 5);
  if (result.education.length > 0) health += 15;
  if (result.experience_years > 0) health += 15;
  if (result.summary) health += 5;
  if (result.links.length > 0) health += 5;
  result.health_score = Math.min(100, health);

  return result;
}

// Extract text from common resume formats
function extractTextFromBuffer(buffer, filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  
  if (ext === 'txt') {
    return buffer.toString('utf8');
  }
  
  // For PDF: basic text extraction (no external deps)
  if (ext === 'pdf') {
    const text = buffer.toString('utf8');
    // Extract readable text between stream markers
    const readable = text
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ' ')  // Remove control chars
      .replace(/\s+/g, ' ')
      .match(/[\w\s@.+\-(),/:;!?#&*%$'"{}[\]<>|\\~`=^]+/g);
    return readable ? readable.join(' ') : '';
  }
  
  // For DOCX: basic XML text extraction
  if (ext === 'docx') {
    const text = buffer.toString('utf8');
    // Strip XML tags, extract text content
    return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  
  return buffer.toString('utf8');
}

module.exports = { parseResumeText, extractTextFromBuffer, SKILL_DATABASE };
