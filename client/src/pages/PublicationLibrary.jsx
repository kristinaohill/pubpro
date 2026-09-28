import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Icon, InlineMessage, Pill, Select, TextField } from '../ds/pubpro';
import DateField from '../components/DateField';
import PageHeader from '../components/PageHeader';
import { api } from '../api';
import './PublicationLibrary.css';

// The Publication Library workspace: every publication with a final disposition (Accepted, past any
// embargo). They're public, so staff and Library Users (read-only) can browse, filter and read them.

const iso = mdy => { const m = String(mdy || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? m[3] + '-' + m[1].padStart(2, '0') + '-' + m[2].padStart(2, '0') : ''; };
const uniq = xs => [...new Set(xs.filter(Boolean))].sort((a, b) => a.localeCompare(b));
const opts = (label, xs) => [{ value: '', label }].concat(xs.map(x => ({ value: x, label: x })));
const typeLabel = p => p.type + (p.subType ? ' · ' + p.subType : '');
const EMPTY = { q: '', from: '', to: '', ta: '', product: '', author: '', owner: '', type: '', venue: '' };

export default function PublicationLibrary() {
  const navigate = useNavigate();
  const [pubs, setPubs] = useState(null);
  const [error, setError] = useState('');
  const [f, setF] = useState(EMPTY);
  useEffect(() => { api.get('/library').then(setPubs).catch(err => setError(err.message)); }, []);

  const lists = useMemo(() => {
    const all = pubs || [];
    return {
      ta: uniq(all.map(p => p.therapeuticArea)),
      product: uniq(all.map(p => p.product)),
      author: uniq(all.flatMap(p => p.authors.map(a => a.name))),
      owner: uniq(all.map(p => p.owner)),
      type: uniq(all.map(typeLabel)),
      venue: uniq(all.map(p => p.venue)),
    };
  }, [pubs]);

  const q = f.q.trim().toLowerCase();
  const from = iso(f.from);
  const to = iso(f.to);
  const shown = (pubs || []).filter(p => (!q || [p.title, p.shortTitle, p.recordId, p.excerpt, p.venue, p.authors.map(a => a.name).join(' ')].join(' ').toLowerCase().includes(q))
    && (!from || (p.publishedIso && p.publishedIso >= from))
    && (!to || (p.publishedIso && p.publishedIso <= to))
    && (!f.ta || p.therapeuticArea === f.ta)
    && (!f.product || p.product === f.product)
    && (!f.author || p.authors.some(a => a.name === f.author))
    && (!f.owner || p.owner === f.owner)
    && (!f.type || typeLabel(p) === f.type)
    && (!f.venue || p.venue === f.venue));
  const active = Object.entries(f).filter(([, v]) => v).length;
  const set = p => setF(x => ({ ...x, ...p }));

  return (
    <div className="lib-page">
      <PageHeader
        title="Publication Library"
        description={pubs ? pubs.length + ' published ' + (pubs.length === 1 ? 'publication' : 'publications') + ' with a final disposition' : 'Published publications with a final disposition'}
      />
      {error && <InlineMessage kind="error">{error}</InlineMessage>}

      <section className="lib-filters" aria-label="Filter the library">
        <TextField iconBefore="search" placeholder="Search titles, abstracts, authors and journals" value={f.q} onChange={e => set({ q: e.target.value })} aria-label="Search the library" />
        <div className="lib-filter-grid">
          <div className="lib-dates">
            <span className="lib-flabel">Date published</span>
            <div className="lib-dates-row">
              <DateField value={f.from} onChange={e => set({ from: e.target.value })} width="100%" aria-label="Published from" />
              <span className="lib-to">to</span>
              <DateField value={f.to} onChange={e => set({ to: e.target.value })} width="100%" aria-label="Published to" />
            </div>
          </div>
          <Select options={opts('All therapeutic areas', lists.ta)} value={f.ta} onChange={e => set({ ta: e.target.value })} width="100%" aria-label="Therapeutic area" />
          <Select options={opts('All products', lists.product)} value={f.product} onChange={e => set({ product: e.target.value })} width="100%" aria-label="Product" />
          <Select options={opts('All publication types', lists.type)} value={f.type} onChange={e => set({ type: e.target.value })} width="100%" aria-label="Publication type" />
          <Select options={opts('All congresses and journals', lists.venue)} value={f.venue} onChange={e => set({ venue: e.target.value })} width="100%" aria-label="Congress or journal" />
          <Select options={opts('All authors', lists.author)} value={f.author} onChange={e => set({ author: e.target.value })} width="100%" aria-label="Author" />
          <Select options={opts('All owners', lists.owner)} value={f.owner} onChange={e => set({ owner: e.target.value })} width="100%" aria-label="Owner" />
        </div>
        <div className="lib-filter-foot">
          <span className="lib-count" aria-live="polite">{pubs ? shown.length + ' of ' + pubs.length : ''}</span>
          {active > 0 && <Button variant="tertiary" icon="close" onClick={() => setF(EMPTY)}>Clear filters</Button>}
        </div>
      </section>

      {pubs === null && !error && <div className="empty-state">Loading&hellip;</div>}
      {pubs && shown.length === 0 && (
        <div className="empty-state">{pubs.length ? 'Nothing matches those filters.' : 'No publications have a final disposition yet. They appear here once their Outcome status is Accepted.'}</div>
      )}
      <div className="lib-list">
        {shown.map(p => (
          <article key={p.id} className="lib-card">
            <div className="lib-card-top">
              <span className="lib-type">{typeLabel(p)}</span>
              <span className="lib-meta">{p.recordId}</span>
            </div>
            <h2 className="lib-title"><a href={'/library/' + p.id} onClick={e => { e.preventDefault(); navigate('/library/' + p.id); }}>{p.title}</a></h2>
            <div className="lib-authors">{p.authors.map(a => a.name).join(', ')}</div>
            <div className="lib-venue">
              {p.venue && <><Icon name={p.type === 'Manuscript' ? 'menu_book' : 'podium'} size={16} />{p.venue}</>}
              {p.published && <span className="lib-meta"> · Published {p.published}</span>}
            </div>
            {p.excerpt && <p className="lib-excerpt">{p.excerpt}{p.excerpt.length >= 280 ? '…' : ''}</p>}
            <div className="lib-tags">
              {p.product && <Pill tone="outline">{p.product}</Pill>}
              {p.therapeuticArea && <Pill tone="draft">{p.therapeuticArea}</Pill>}
              {p.owner && <span className="lib-meta">Owner: {p.owner}</span>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/** One publication in the library, read-only. */
export function LibraryPublication() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [p, setP] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/library/' + id).then(setP).catch(err => setError(err.message)); }, [id]);
  if (error) return <div className="lib-page"><InlineMessage kind="error">{error}</InlineMessage><Button variant="secondary" onClick={() => navigate('/library')}>Back to the Library</Button></div>;
  if (!p) return <div className="lib-page"><div className="empty-state">Loading&hellip;</div></div>;
  return (
    <div className="lib-page lib-page--read">
      <button type="button" className="lib-back" onClick={() => navigate('/library')}><Icon name="arrow_back" size={18} />Publication Library</button>
      <article className="lib-read">
        <div className="lib-card-top"><span className="lib-type">{typeLabel(p)}</span><span className="lib-meta">{p.recordId}</span></div>
        <h1 className="lib-read-title">{p.title}</h1>
        <div className="lib-read-authors">
          {p.authors.map((a, i) => (
            <span key={i}>{a.name}{a.affiliation ? <span className="lib-meta"> ({a.affiliation})</span> : null}{i < p.authors.length - 1 ? ', ' : ''}</span>
          ))}
        </div>
        <dl className="lib-facts">
          <div><dt>{p.type === 'Manuscript' ? 'Journal' : 'Congress'}</dt><dd>{p.venue || 'Not recorded'}</dd></div>
          <div><dt>Date published</dt><dd>{p.published || 'Not recorded'}</dd></div>
          <div><dt>Product</dt><dd>{p.product || 'Not recorded'}</dd></div>
          <div><dt>Therapeutic area</dt><dd>{p.therapeuticArea || 'Not recorded'}</dd></div>
          <div><dt>Owner</dt><dd>{p.owner || 'Not recorded'}</dd></div>
          <div><dt>Studies</dt><dd>{p.studies.length ? p.studies.join(', ') : 'Not recorded'}</dd></div>
        </dl>
        {p.text ? <div className="lib-text">{p.text}</div> : <div className="empty-state empty-state--inset">No text for this publication.</div>}
      </article>
    </div>
  );
}
