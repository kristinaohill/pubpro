import React, { useRef, useState } from 'react';
import { DateField as DsDateField } from '../ds/pubpro';
import './DateField.css';

const pad = n => String(n).padStart(2, '0');
const toISO = s => {
  const m = String(s || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${pad(m[1])}-${pad(m[2])}` : '';
};
const fromISO = s => {
  const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${+m[2]}/${+m[3]}/${m[1]}` : '';
};
const to24 = s => {
  const m = String(s || '').trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp])[Mm]$/);
  if (!m) return '';
  const h = (+m[1] % 12) + (/[Pp]/.test(m[3]) ? 12 : 0);
  return pad(h) + ':' + m[2];
};
const from24 = s => {
  const m = String(s || '').match(/^(\d{2}):(\d{2})/);
  if (!m) return '';
  const h = +m[1];
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
};

/**
 * The DS DateField (m/d/yyyy text with a calendar cell) with a working picker: the calendar
 * or clock icon opens the browser's native date/time picker, and a pick is written back in the
 * same m/d/yyyy or h:mm AM/PM text the field takes when typed. Works controlled or uncontrolled.
 */
export default function DateField({ value, onChange, time, width = 178, style, ...rest }) {
  const pickerRef = useRef(null);
  const [local, setLocal] = useState('');
  const controlled = value !== undefined;
  const current = controlled ? value : local;

  const typed = e => {
    if (!controlled) setLocal(e.target.value);
    if (onChange) onChange(e);
  };
  const picked = e => {
    const v = time ? from24(e.target.value) : fromISO(e.target.value);
    if (!controlled) setLocal(v);
    if (onChange) onChange({ target: { value: v } });
  };
  const openPicker = () => {
    const el = pickerRef.current;
    if (!el) return;
    try { el.showPicker(); } catch (err) { el.focus(); }
  };

  return (
    <div className="df-wrap" style={{ width: typeof width === 'number' ? width + 'px' : width }}>
      <DsDateField {...rest} time={time} width="100%" style={style} value={current} onChange={typed} onIconClick={openPicker} />
      <input
        ref={pickerRef}
        type={time ? 'time' : 'date'}
        className="df-native"
        tabIndex={-1}
        aria-hidden="true"
        value={time ? to24(current) : toISO(current)}
        onChange={picked}
      />
    </div>
  );
}
