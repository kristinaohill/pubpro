import React from 'react';
import useDismiss from '../../components/useDismiss';
import { EyebrowLabel, Field, Icon, IconButton, SectionHeading, Select, TextArea, TextField } from '../../ds/pubpro';
import {
  PLANS, PRODUCTS, PUBTYPE_OPTIONS, REVIEW_DEPT_OPTIONS, REVIEW_SPONSOR_OPTIONS,
  REVIEW_SUBTYPE_OPTIONS, REVIEW_THERAPEUTIC_AREA_OPTIONS, TEMPLATE_FOR_TYPE, NO_VENDOR,
} from './data';
import { stageTemplatePatch } from './state';
import { BoxCheck } from './shared';

export default function OverviewTab({ st, set, bind, navigate, typeLocked, plans }) {
  const onPubType = e => {
    const v = e.target.value;
    set(s => {
      const tmpl = TEMPLATE_FOR_TYPE[v];
      const next = { ...s, pubType: v };
      if (s.vendor === NO_VENDOR && tmpl) return { pubType: v, stageTemplate: tmpl, ...stageTemplatePatch(next, tmpl) };
      return { pubType: v };
    });
  };

  const pq = st.planQuery.trim().toLowerCase();
  // Saved plans, plus the design's sample plan (saved the first time it is opened).
  const planList = (plans || []).concat(PLANS.filter(p => p.id === 'PLAN-26-DAX-002' && !(plans || []).some(x => x.id === p.id)));
  const planMatches = planList.filter(p => (p.id + ' ' + p.name).toLowerCase().includes(pq));
  const linkedPlan = st.parentPlan && planList.find(p => p.id === st.parentPlan.id);
  const planHref = !linkedPlan ? null : linkedPlan.savedId ? '/publication-plan/' + linkedPlan.savedId : '/publication-plan';
  const showPlanSuggestions = st.planFocused && !st.parentPlan;
  const planRef = useDismiss(showPlanSuggestions, () => set({ planFocused: false }));

  const onProduct = e => {
    const v = e.target.value;
    set(s => ({ product: v, additionalProducts: s.additionalProducts.filter(x => x !== v) }));
  };
  const toggleProduct = p => set(s => ({
    additionalProducts: s.additionalProducts.includes(p)
      ? s.additionalProducts.filter(x => x !== p)
      : s.additionalProducts.concat([p]),
  }));

  return (
    <div className="pf-overview">
      <SectionHeading subtitle="Core record details for this publication.">Overview</SectionHeading>

      <div className="pf-group">
        <EyebrowLabel>Publication Identity</EyebrowLabel>
        <Field label="Abbreviated Title" info="Maximum 60 characters">
          <TextField {...bind('abbrevTitle')} maxLength={60} width="620px" style={{ maxWidth: '100%' }} />
        </Field>
        <Field label="Publication Title" info="Publication Title">
          <TextArea {...bind('pubTitle')} width="620px" height="58px" style={{ maxWidth: '100%' }} />
        </Field>
        <Field label="Publication Type">
          <Select options={PUBTYPE_OPTIONS} value={st.pubType} onChange={onPubType} width="300px" disabled={typeLocked} />
          {typeLocked && <div className="pf-faint13 pf-mt5">Locked once the record is saved. Cancel the record and create a new one to change it.</div>}
        </Field>
        <Field label="Publication Sub-Type">
          <Select options={REVIEW_SUBTYPE_OPTIONS} value={st.subType} onChange={e => set({ subType: e.target.value })} width="300px" />
        </Field>
        <Field label="Parent Planning ID" info="Parent Planning ID">
          {st.parentPlan ? (
            <div className="pf-planchip">
              <div className="pf-flex1">
                {planHref ? (
                  <a
                    href={planHref}
                    className="pf-planchip-link"
                    onClick={e => { e.preventDefault(); navigate(planHref); }}
                  >
                    {st.parentPlan.id}
                    <Icon name="open_in_new" size={15} />
                  </a>
                ) : (
                  <span className="pf-planchip-link" title="This plan is not saved in PubPro">{st.parentPlan.id}</span>
                )}
                <div className="pf-planchip-name">{st.parentPlan.name}</div>
              </div>
              <IconButton
                icon="close"
                tone="fatal"
                size={24}
                title="Remove parent plan"
                onClick={() => set({ parentPlan: null, planQuery: '', planFocused: false })}
              />
            </div>
          ) : (
            <div className="pf-search pf-search--340" ref={planRef}>
              <div className="pf-search-box">
                <Icon name="search" size={19} color="var(--text-meta)" style={{ padding: '0 6px 0 9px' }} />
                <input
                  value={st.planQuery}
                  onChange={e => set({ planQuery: e.target.value })}
                  onFocus={() => set({ planFocused: true })}
                  placeholder="Search by plan ID or name"
                  className="pf-search-input"
                />
              </div>
              {showPlanSuggestions && (
                <div className="pf-menu">
                  {planMatches.map(p => (
                    <div key={p.id} className="pf-menu-item pf-menu-item--stack" onClick={() => set({ parentPlan: { id: p.id, name: p.name }, planQuery: '', planFocused: false })}>
                      <div className="pf-strong">{p.id}</div>
                      <div className="pf-faint13 pf-mt2">{p.name}</div>
                    </div>
                  ))}
                  {planMatches.length === 0 && <div className="pf-menu-empty pf-italic">No plans match that search.</div>}
                </div>
              )}
            </div>
          )}
        </Field>
      </div>

      <div className="pf-group">
        <EyebrowLabel>Classification</EyebrowLabel>
        <Field label="Therapeutic Area">
          <Select options={REVIEW_THERAPEUTIC_AREA_OPTIONS} placeholder="Please select" {...bind('therapeuticArea')} width="300px" />
        </Field>
        <Field label="Product">
          <Select options={PRODUCTS} placeholder="Please select" value={st.product} onChange={onProduct} width="300px" />
        </Field>
        <Field label="Additional Products">
          <div className="pf-checklist-box">
            {PRODUCTS.filter(p => p !== st.product).map(p => (
              <label key={p} className="pf-checkline" onClick={() => toggleProduct(p)}>
                <BoxCheck on={st.additionalProducts.includes(p)} size={16} fill="var(--high-emphasis)" border="var(--high-emphasis)" />
                {p}
              </label>
            ))}
          </div>
          {st.additionalProducts.length === 0 && <div className="pf-faint13 pf-italic pf-mt5">No additional products selected.</div>}
        </Field>
        <Field label="Department">
          <Select options={REVIEW_DEPT_OPTIONS} placeholder="Please select" {...bind('department')} width="300px" />
        </Field>
        <Field label="Sponsor Type">
          <Select options={REVIEW_SPONSOR_OPTIONS} placeholder="Please select" {...bind('sponsorType')} width="300px" />
        </Field>
      </div>
    </div>
  );
}
