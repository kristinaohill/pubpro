import React from 'react';
import { Button, CommentComposer, DropZone, Icon, IconButton, InlineMessage } from '../../ds/pubpro';
import { nowStamp } from './data';
import { criteriaMissing, bylineAuthors } from './state';
import { kickoffRowOf, needsKickoff } from './kickoff';
import { Card, Stack, TabHead } from './ui';
import './tabs-a.css';

export default function PublicationTab({ st, set, recordId, userName, openDocument, record }) {
  const hasDoc = !!st.pubDoc;
  // A1 (ICMJE, GPP): drafting can't start until every author has agreed to the ICMJE criteria.
  // Records that already had a document before this rule are left as they are.
  const authors = bylineAuthors(st);
  const waiting = criteriaMissing(st);
  const kickRow = kickoffRowOf(st);
  const kickoffPending = needsKickoff(st) && !(kickRow && kickRow.done);
  const blocked = !hasDoc && !st.draftStartedAt && (!record || !authors.length || waiting.length > 0 || kickoffPending);
  const startedText = st.draftStartedAt ? new Date(st.draftStartedAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) : '';
  // pubDocOn is set when the document is started or imported here; the sample record predates it.
  const docName = st.pubDoc === 'new'
    ? recordId + '_Draft.docx'
    : st.pubDocOn ? recordId + '_Imported_Draft.docx'
      : (st.pubType === 'Manuscript' ? 'Daxafort_CLARIFY_Week52_Manuscript_2.docx' : 'Daxafort_CLARIFY_Week52_Abstract_3.docx');
  const docMeta = st.pubDocOn
    ? (st.pubDoc === 'new' ? 'Created: ' : 'Imported: ') + st.pubDocOn + ' ' + st.pubDocBy + (st.pubDoc === 'new' ? ' · new document' : '')
    : 'Imported: 8/31/2026 4:38 PM Kristina Hill';
  const startDoc = kind => set({ pubDoc: kind, pubDocOn: nowStamp(), pubDocBy: userName });
  // The document opens in a floating panel over the form (DocumentPanel).
  const openEditor = () => {
    if (!st.pubDoc) startDoc('new');
    openDocument();
  };
  const words = String(st.pubDocText || '').trim().split(/\s+/).filter(Boolean).length;

  return (
    <Stack>
      <TabHead title="Publication" sub="The publication document, reference materials and comments." />

      <Card title="Publication document">
        {!hasDoc && (
          <div className="pfxa-docstart">
            <Icon name="note_add" size={46} color="var(--high-emphasis)" />
            <div className="pfxa-docstart-title">Start the publication document in PubPro</div>
            {blocked && (
              <InlineMessage kind="warning">
                <strong>A1, A4 (ICMJE, GPP):</strong> every author signs the authorship agreement, attesting to the four ICMJE criteria, before drafting starts. They sign from their invitation.{' '}
                {!record ? 'Save the publication and invite its authors first.'
                  : !authors.length ? 'Add the authors first.'
                    : waiting.length ? 'Still waiting on ' + waiting.join(', ') + '.'
                      : 'Every author has signed. Next, record the kick-off on the Kick-off tab (V2, GPP).'}
              </InlineMessage>
            )}
            <div className="pfxa-docstart-actions">
              <Button variant="primary" icon="note_add" onClick={openEditor} disabled={blocked}>Start New Document</Button>
              <span className="pfxa-docstart-alt">
                <span className="pfx-meta">Already have a draft?</span>
                <Button variant="secondary" icon="backup" onClick={() => startDoc('import')} disabled={blocked}>Import existing draft</Button>
              </span>
            </div>
            <div className="pfxa-docstart-hint">Imports accept .docx, .pptx, .pdf — or drag and drop a file into this box</div>
          </div>
        )}
        {hasDoc && (
          <div className="pfxa-file">
            <Icon name="description" size={30} color="var(--high-emphasis)" style={{ flex: 'none' }} />
            <div className="pfxa-file-text">
              <div className="pfxa-file-name">{docName}</div>
              <div className="pfxa-file-meta">{docMeta}{st.pubDoc === 'new' ? ' · ' + words + (words === 1 ? ' word' : ' words') : ''}</div>
              {startedText && <div className="pfxa-file-meta"><Icon name="verified" size={14} color="var(--ok)" /> Drafting started {startedText}, after every author signed the authorship agreement (A1, A4)</div>}
            </div>
            <div className="pfxa-file-actions">
              {st.pubDoc === 'new' && <Button variant="secondary" icon="edit_document" onClick={openEditor}>Open Document</Button>}
              <Button variant="secondary">Download</Button>
              <IconButton icon="close" tone="fatal" size={30} title="Remove document" onClick={() => set({ pubDoc: false })} />
            </div>
          </div>
        )}
      </Card>

      <Card title="Reference materials">
        <DropZone />
      </Card>

      <Card title="Comments">
        <CommentComposer layout="stacked" width="100%" height="76px" />
      </Card>
    </Stack>
  );
}
