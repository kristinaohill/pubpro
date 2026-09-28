import React from 'react';
import useDismiss from '../../components/useDismiss';
import { Icon, IconButton, Select, TextArea, TextField } from '../../ds/pubpro';
import {
  PLANS, PRODUCT_TA, PRODUCTS, productsForTA, PUBTYPE_OPTIONS, REVIEW_DEPT_OPTIONS, REVIEW_SPONSOR_OPTIONS,
  REVIEW_SUBTYPE_OPTIONS, REVIEW_THERAPEUTIC_AREA_OPTIONS, TEMPLATE_FOR_TYPE, NO_VENDOR,
} from './data';
import { stageTemplatePatch } from './state';
import { Card, ChipCheck, ChipChoice, FormField, Pair, Stack, TabHead } from './ui';
import './tabs-a.css';

export default function OverviewTab({ st, set, bind, navigate, typeLocked, plans, allowedProducts }) {
  const onPubType = e => {
    const v = e.target.value;
    set(s => {
      const tmpl = TEMPLATE_FOR_TYPE[v];
      const next = { ...s, pubType: v };
      // Sub-types only apply to abstracts.
      const subType = v === 'Abstract' ? s.subType : '';
      if (s.vendor === NO_VENDOR && tmpl) return { pubType: v, subType, stageTemplate: tmpl, ...stageTemplatePatch(next, tmpl) };
      return { pubType: v, subType };
    });
  };

  const pq = st.planQuery.trim().toLowerCase();
  // Saved plans, plus the design's sample plan (saved the first time it is opened).
  const planList = (plans || []).concat(PLANS.filter(p => p.id === 'PLAN-26-DAX-002' && !(plans || []).some(x => x.id === p.id)));
  const planMatches = planList.filter(p => (p.id + ' ' + p.name).toLowerCase().includes(pq));
  const linkedPlan = st.parentPlan && planList.find(p => p.id === st.parentPlan.id);
  const planHref = !linkedPlan ? null : linkedPlan.savedId ? '/publication-plan/' + linkedPlan.savedId : '/publication-plan';
  const showPlanSuggestions = st.planFocused && !st.parentPlan;
  const planRef = useDismiss(showPlanSuggestions, () => set({ planFocused: false }), () => set({ planFocused: true }));

  const ta = bind('therapeuticArea').value;
  // A new area clears a product outside it; picking a product with no area fills the area in.
  const onTA = e => {
    const v = e.target.value;
    set(s => ({
      fields: { ...s.fields, therapeuticArea: v },
      product: v && s.product && PRODUCT_TA[s.product] !== v ? '' : s.product,
    }));
  };
  const onProduct = e => {
    const v = e.target.value;
    set(s => ({
      product: v,
      additionalProducts: s.additionalProducts.filter(x => x !== v),
      fields: ta || !v ? s.fields : { ...s.fields, therapeuticArea: PRODUCT_TA[v] || '' },
    }));
  };
  const toggleProduct = p => set(s => ({
    additionalProducts: s.additionalProducts.includes(p)
      ? s.additionalProducts.filter(x => x !== p)
      : s.additionalProducts.concat([p]),
  }));

  const abbrev = bind('abbrevTitle');
  const isAbstract = st.pubType === 'Abstract';
  const subTypeOptions = REVIEW_SUBTYPE_OPTIONS.filter(o => o.value);

  return (
    <Stack>
      <TabHead title="Overview" sub="Core record details for this publication." />

      <Card title="Publication identity">
        <FormField id="pf-abbrev" label="Abbreviated Title" counter={String(abbrev.value || '').length + ' / 60'} help="Maximum 60 characters">
          <TextField id="pf-abbrev" {...abbrev} maxLength={60} width="100%" />
        </FormField>
        <FormField id="pf-pubtitle" label="Publication Title">
          <TextArea id="pf-pubtitle" {...bind('pubTitle')} width="100%" height="58px" />
        </FormField>
        <Pair>
          <FormField
            id="pf-pubtype"
            label="Publication Type"
            help={typeLocked && (
              <span className="pfxa-lock">
                <Icon name="lock" size={14} color="var(--pfx-meta)" />
                Locked once the record is saved. Cancel the record and create a new one to change it.
              </span>
            )}
          >
            <Select id="pf-pubtype" options={PUBTYPE_OPTIONS} value={st.pubType} onChange={onPubType} width="100%" disabled={typeLocked} />
          </FormField>
          <ChipChoice
            label="Publication Sub-Type"
            options={subTypeOptions}
            value={isAbstract ? st.subType : ''}
            onChange={v => set({ subType: v })}
            disabled={!isAbstract}
            help={!isAbstract ? 'Only used for abstracts.' : undefined}
          />
        </Pair>
        <FormField id="pf-parentplan" label="Parent Planning ID">
          {st.parentPlan ? (
            <div className="pfxa-linked">
              <div className="pfxa-linked-text">
                {planHref ? (
                  <a
                    href={planHref}
                    className="pfxa-linked-id"
                    onClick={e => { e.preventDefault(); navigate(planHref); }}
                  >
                    {st.parentPlan.id}
                    <Icon name="open_in_new" size={15} />
                  </a>
                ) : (
                  <span className="pfxa-linked-id" title="This plan is not saved in PubPro">{st.parentPlan.id}</span>
                )}
                <div className="pfxa-linked-name">{st.parentPlan.name}</div>
              </div>
              <IconButton
                icon="close"
                tone="fatal"
                size={30}
                title="Remove parent plan"
                onClick={() => set({ parentPlan: null, planQuery: '', planFocused: false })}
              />
            </div>
          ) : (
            <div className="pfxa-search" ref={planRef}>
              <TextField
                id="pf-parentplan"
                iconBefore="search"
                width="100%"
                value={st.planQuery}
                onChange={e => set({ planQuery: e.target.value })}
                onFocus={() => set({ planFocused: true })}
                placeholder="Search by plan ID or name"
              />
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
        </FormField>
      </Card>

      <Card title="Classification">
        <Pair>
          <FormField id="pf-ta" label="Therapeutic Area">
            <Select id="pf-ta" options={REVIEW_THERAPEUTIC_AREA_OPTIONS} placeholder="Please select" value={ta} onChange={onTA} width="100%" />
          </FormField>
          <FormField id="pf-product" label="Product">
            {/* Only the products this person's roles let them work on (plus the current one). */}
            <Select id="pf-product" options={productsForTA(ta).filter(p => !allowedProducts || allowedProducts.includes(p) || p === st.product)} placeholder="Please select" value={st.product} onChange={onProduct} width="100%" />
          </FormField>
        </Pair>
        <fieldset className="pfx-fieldset">
          <legend className="pfx-label">Additional Products</legend>
          <div className="pfx-chips">
            {PRODUCTS.filter(p => p !== st.product).map(p => (
              <ChipCheck key={p} label={p} checked={st.additionalProducts.includes(p)} onChange={() => toggleProduct(p)} />
            ))}
          </div>
          {st.additionalProducts.length === 0 && <div className="pfx-help">No additional products selected.</div>}
        </fieldset>
        <Pair>
          <FormField id="pf-dept" label="Department">
            <Select id="pf-dept" options={REVIEW_DEPT_OPTIONS} placeholder="Please select" {...bind('department')} width="100%" />
          </FormField>
          <FormField id="pf-sponsor" label="Sponsor Type">
            <Select id="pf-sponsor" options={REVIEW_SPONSOR_OPTIONS} placeholder="Please select" {...bind('sponsorType')} width="100%" />
          </FormField>
        </Pair>
      </Card>
    </Stack>
  );
}
