import React from 'react';
import { Icon } from '../../ds/pubpro';
import { api } from '../../api';
import './proof.css';

// Proof for anything recorded on someone's behalf: an author's acceptance and agreement to the
// ICMJE criteria, or a reviewer's response, sent by email because the link didn't work, say.
// The server refuses the record without it (server/gates.js, proxyGate).

export const PROOF_ACCEPT = '.pdf,.eml,.msg,.txt,.png,.jpg,.jpeg,.doc,.docx,.htm,.html';
const MAX = 5 * 1024 * 1024;

const toBase64 = file => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1] || '');
  r.onerror = () => reject(new Error('Could not read that file.'));
  r.readAsDataURL(file);
});

/** Uploads file to publication pubId. Returns { id, name, size, uploadedBy, uploadedAt }. */
export async function uploadProof(pubId, file, purpose, subject) {
  if (!file) throw new Error('Upload their written confirmation first.');
  if (file.size > MAX) throw new Error('Keep proof files under 5 MB.');
  const data = await toBase64(file);
  return api.post('/pp-publications/' + pubId + '/proofs', { name: file.name, mime: file.type, data, purpose, subject });
}

/** Downloads a proof file (the request needs the sign-in token, so it can't be a plain link). */
export async function openProof(pubId, proof) {
  const res = await fetch('/api/pp-publications/' + pubId + '/proofs/' + proof.id, { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } });
  if (!res.ok) throw new Error('Could not open the proof.');
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = proof.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** File picker for the proof. */
export function ProofField({ id, file, onFile, help }) {
  return (
    <div className="pf-proof">
      <label className="pf-proof-label" htmlFor={id}>Proof (required)</label>
      <div className="pf-proof-row">
        <label className="pf-proof-pick" htmlFor={id}>
          <Icon name="upload_file" size={18} />{file ? 'Change file' : 'Choose file'}
        </label>
        <input id={id} type="file" accept={PROOF_ACCEPT} className="pf-proof-input" onChange={e => onFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
        <span className="pf-proof-name">{file ? file.name + ' · ' + Math.max(1, Math.round(file.size / 1024)) + ' KB' : 'No file chosen'}</span>
      </div>
      {help && <div className="pf-proof-help">{help}</div>}
    </div>
  );
}

/** "Recorded by … · proof: file" with the file downloadable. */
export function ProofLink({ pubId, proxy }) {
  if (!proxy || !proxy.proof) return null;
  return (
    <span className="pf-proof-link">
      Recorded by {proxy.by} · proof:{' '}
      <button type="button" onClick={() => openProof(pubId, proxy.proof).catch(err => window.alert(err.message))}>{proxy.proof.name}</button>
    </span>
  );
}
