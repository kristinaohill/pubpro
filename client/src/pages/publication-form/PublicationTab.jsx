import React from 'react';
import { Button, CommentComposer, DropZone, Icon, IconButton, SectionHeading } from '../../ds/pubpro';
import { nowStamp } from './data';

export default function PublicationTab({ st, set, recordId, userName, openDocument }) {
  const hasDoc = !!st.pubDoc;
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
    <div className="pf-stack22">
      <div className="pf-divided-block">
        <SectionHeading style={{ marginBottom: 18 }}>Publication</SectionHeading>
        <div className="pf-inset pf-stack26">
          <div>
            <div className="pf-label pf-mb10">Publication Document</div>
            {!hasDoc && (
              <div className="pf-docstart">
                <Icon name="note_add" size={46} color="var(--high-emphasis)" />
                <div className="pf-docstart-title">Start the publication document in PubPro</div>
                <Button variant="primary" icon="note_add" onClick={openEditor}>Start New Document</Button>
                <div className="pf-docstart-alt">
                  <span className="pf-faint13">Already have a draft?</span>
                  <Button variant="secondary" icon="backup" onClick={() => startDoc('import')}>Import existing draft</Button>
                </div>
                <div className="pf-faint13">Imports accept .docx, .pptx, .pdf — or drag and drop a file into this box</div>
              </div>
            )}
            {hasDoc && (
              <div className="pf-filecard">
                <div>
                  <div className="pf-filecard-name">{docName}</div>
                  <div className="pf-faint13 pf-mt3">{docMeta}{st.pubDoc === 'new' ? ' · ' + words + (words === 1 ? ' word' : ' words') : ''}</div>
                </div>
                {st.pubDoc === 'new' && <Button variant="secondary" icon="edit_document" onClick={openEditor}>Open Document</Button>}
                <Button variant="secondary">Download</Button>
                <IconButton icon="close" tone="fatal" size={30} title="Remove document" onClick={() => set({ pubDoc: false })} />
              </div>
            )}
          </div>
          <div>
            <div className="pf-label pf-mb10">Reference Materials</div>
            <DropZone />
          </div>
        </div>
      </div>

      <div>
        <SectionHeading level="subsection" style={{ marginBottom: 14 }}>Comments</SectionHeading>
        <div className="pf-inset">
          <CommentComposer layout="stacked" width="100%" height="76px" />
        </div>
      </div>
    </div>
  );
}
