// Generated from the PubPro Design System bundle in Claude Design (project ea3c10c9).
// Do not edit by hand: re-import from Claude Design instead.
/* eslint-disable */
import React from "react";

/* @ds-bundle: {"format":4,"namespace":"PubProDesignSystem_ea3c10","components":[{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"EyebrowLabel","sourcePath":"components/core/EyebrowLabel.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Panel","sourcePath":"components/core/Panel.jsx"},{"name":"Pill","sourcePath":"components/core/Pill.jsx"},{"name":"SectionHeading","sourcePath":"components/core/SectionHeading.jsx"},{"name":"StatusStepper","sourcePath":"components/core/StatusStepper.jsx"},{"name":"BandHeader","sourcePath":"components/data/BandHeader.jsx"},{"name":"BarChart","sourcePath":"components/data/BarChart.jsx"},{"name":"DataTable","sourcePath":"components/data/DataTable.jsx"},{"name":"DetailGrid","sourcePath":"components/data/DetailGrid.jsx"},{"name":"DonutChart","sourcePath":"components/data/DonutChart.jsx"},{"name":"GanttChart","sourcePath":"components/data/GanttChart.jsx"},{"name":"PieChart","sourcePath":"components/data/PieChart.jsx"},{"name":"StatCard","sourcePath":"components/data/StatCard.jsx"},{"name":"AIActionButton","sourcePath":"components/feedback/AIActionButton.jsx"},{"name":"CommentComposer","sourcePath":"components/feedback/CommentComposer.jsx"},{"name":"ConfirmModal","sourcePath":"components/feedback/ConfirmModal.jsx"},{"name":"InlineMessage","sourcePath":"components/feedback/InlineMessage.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"CheckboxGroup","sourcePath":"components/forms/CheckboxGroup.jsx"},{"name":"DateField","sourcePath":"components/forms/DateField.jsx"},{"name":"DropZone","sourcePath":"components/forms/DropZone.jsx"},{"name":"Field","sourcePath":"components/forms/Field.jsx"},{"name":"MoneyField","sourcePath":"components/forms/MoneyField.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"RecordRef","sourcePath":"components/forms/RecordRef.jsx"},{"name":"SearchSelect","sourcePath":"components/forms/SearchSelect.jsx"},{"name":"SegmentedToggle","sourcePath":"components/forms/SegmentedToggle.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"TextArea","sourcePath":"components/forms/TextArea.jsx"},{"name":"TextField","sourcePath":"components/forms/TextField.jsx"},{"name":"BrandMark","sourcePath":"components/navigation/BrandMark.jsx"},{"name":"FormActionBar","sourcePath":"components/navigation/FormActionBar.jsx"},{"name":"NavMenu","sourcePath":"components/navigation/NavMenu.jsx"},{"name":"PanelTabs","sourcePath":"components/navigation/PanelTabs.jsx"},{"name":"RecordHeader","sourcePath":"components/navigation/RecordHeader.jsx"},{"name":"SideTabRail","sourcePath":"components/navigation/SideTabRail.jsx"},{"name":"TopNav","sourcePath":"components/navigation/TopNav.jsx"},{"name":"WorkspaceTabs","sourcePath":"components/navigation/WorkspaceTabs.jsx"}],"sourceHashes":{"components/core/Button.jsx":"3ac853b362d8","components/core/EyebrowLabel.jsx":"f9398e6023ae","components/core/Icon.jsx":"1243609307a3","components/core/IconButton.jsx":"3955af5b66b7","components/core/Panel.jsx":"16ccfc827d7f","components/core/Pill.jsx":"162b39bf5293","components/core/SectionHeading.jsx":"a46407607544","components/core/StatusStepper.jsx":"76e09a5bf863","components/data/BandHeader.jsx":"bfb34e80e2b6","components/data/BarChart.jsx":"a9b535276858","components/data/DataTable.jsx":"eaefce43498c","components/data/DetailGrid.jsx":"de33529d65c2","components/data/DonutChart.jsx":"1bb022ac97df","components/data/GanttChart.jsx":"99eab1e040f0","components/data/PieChart.jsx":"f9c9df5144b3","components/data/StatCard.jsx":"04690aa440dd","components/feedback/AIActionButton.jsx":"d4152b8af4e6","components/feedback/CommentComposer.jsx":"e525e6fe6d1a","components/feedback/ConfirmModal.jsx":"23a17e2b205a","components/feedback/InlineMessage.jsx":"07a93b15c687","components/feedback/Tooltip.jsx":"ea547c95ad82","components/forms/Checkbox.jsx":"8747d29ed71a","components/forms/CheckboxGroup.jsx":"36db3d59a2ce","components/forms/DateField.jsx":"eba39c4554a1","components/forms/DropZone.jsx":"9246645cf17a","components/forms/Field.jsx":"31f95a865a00","components/forms/MoneyField.jsx":"6aedffcdc792","components/forms/Radio.jsx":"9fd45a7a0325","components/forms/RecordRef.jsx":"1735cd490601","components/forms/SearchSelect.jsx":"a9ea6070e1a2","components/forms/SegmentedToggle.jsx":"30ccde7f8a3a","components/forms/Select.jsx":"96b5e37a1a4c","components/forms/TextArea.jsx":"b37b6c75913d","components/forms/TextField.jsx":"1efcfaaf7d5a","components/navigation/BrandMark.jsx":"8c17c51fc61d","components/navigation/FormActionBar.jsx":"effc46c50d38","components/navigation/NavMenu.jsx":"665104b0495f","components/navigation/PanelTabs.jsx":"5a503a75785d","components/navigation/RecordHeader.jsx":"e379ad4f53ab","components/navigation/SideTabRail.jsx":"44075d09e9fc","components/navigation/TopNav.jsx":"88c5fc6f61c2","components/navigation/WorkspaceTabs.jsx":"cff65a0db57b","ui_kits/pubpro/Dashboard.jsx":"f701d2154e6a","ui_kits/pubpro/PlanRecord.jsx":"61f74772029c","ui_kits/pubpro/PublicationRecord.jsx":"927b2d7d9eda","ui_kits/pubpro/data.js":"3d48f7c5dea6"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.PubProDesignSystem_ea3c10 = window.PubProDesignSystem_ea3c10 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/EyebrowLabel.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Uppercase 11px group label that divides a long form into field groups. */
function EyebrowLabel({
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      fontSize: "var(--fs-eyebrow)",
      fontWeight: "var(--fw-bold)",
      letterSpacing: "var(--ls-eyebrow)",
      color: "var(--text-meta)",
      textTransform: "uppercase",
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { EyebrowLabel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/EyebrowLabel.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Material Symbols Outlined glyph (Material 3 default, FILL 0). */
function Icon({
  name,
  size = 20,
  color = "currentColor",
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    className: "material-symbols-outlined",
    style: {
      fontSize: size,
      color,
      ...style
    },
    "aria-hidden": "true"
  }, rest), name);
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const FACE = {
  primary: {
    background: "var(--high-emphasis)",
    color: "var(--text-button)"
  },
  secondary: {
    background: "var(--low-emphasis)",
    color: "var(--text-button-dark)"
  },
  tertiary: {
    background: "var(--med-emphasis)",
    color: "var(--text-button-dark)"
  },
  fatal: {
    background: "var(--fatal-action)",
    color: "var(--text-button-dark)"
  }
};

/** Pill action button. Primary sits bottom-right of a form; fatal sits bottom-left. */
function Button({
  variant = "primary",
  icon,
  iconAfter,
  disabled,
  children,
  style,
  ...rest
}) {
  const ghost = variant === "ghost";
  const base = {
    border: ghost ? "1px solid var(--border-divider)" : 0,
    borderRadius: ghost ? "var(--radius-input)" : "var(--radius-pill)",
    padding: ghost ? "0 13px" : "0 var(--button-pad-x)",
    minHeight: ghost ? "var(--button-h-ghost)" : "var(--button-h)",
    fontFamily: "var(--font-sans)",
    fontSize: ghost ? "var(--fs-sm)" : "var(--fs-meta)",
    fontWeight: "var(--fw-bold)",
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    whiteSpace: "nowrap",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "filter var(--dur-base) var(--ease-standard), transform var(--dur-fast)",
    ...(ghost ? {
      background: "var(--white)",
      color: "var(--text-button-dark)"
    } : FACE[variant] || FACE.primary)
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    disabled: disabled,
    style: {
      ...base,
      ...style
    },
    onMouseEnter: e => {
      if (!disabled) e.currentTarget.style.filter = "var(--hover-darken)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.filter = "none";
    },
    onMouseDown: e => {
      if (!disabled) e.currentTarget.style.transform = "var(--press-shift)";
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = "none";
    }
  }, rest), icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 18
  }) : null, children, iconAfter ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconAfter,
    size: 18
  }) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONE = {
  fatal: {
    background: "var(--fatal-action)",
    color: "var(--text-button-dark)"
  },
  primary: {
    background: "var(--high-emphasis)",
    color: "var(--text-button)"
  },
  nav: {
    background: "var(--nav)",
    color: "var(--text-button)"
  },
  locked: {
    background: "var(--blue-chip)",
    color: "var(--text-button-dark)"
  }
};

/** Round or pill icon-only control — row remove (×), reorder arrows, header actions. */
function IconButton({
  icon,
  tone = "fatal",
  size = 30,
  shape = "round",
  title,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    title: title,
    role: "button",
    style: {
      width: shape === "pill" ? size : size,
      height: shape === "pill" ? Math.round(size * 0.87) : size,
      borderRadius: shape === "pill" ? "var(--radius-pill)" : "var(--radius-round)",
      background: (TONE[tone] || TONE.fatal).background,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      flex: "none",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: Math.round(size * 0.62),
    color: (TONE[tone] || TONE.fatal).color
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Panel.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Titled panel: white card, icon chip, bold title with an item count, optional
 * description and top-right actions/refresh. The repeated shell around dashboard
 * charts, tables and lists. Border only — never pair with a shadow (see elevation rule).
 */
function Panel({
  icon,
  iconColor = "var(--high-emphasis)",
  title,
  count,
  description,
  actions,
  onRefresh,
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: "var(--white)",
      border: "1px solid var(--border-divider)",
      borderRadius: "var(--radius-panel)",
      display: "flex",
      flexDirection: "column",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "14px 16px",
      borderBottom: description || children ? "1px solid var(--border-hairline)" : 0
    }
  }, icon ? /*#__PURE__*/React.createElement("div", {
    style: {
      width: 26,
      height: 26,
      borderRadius: "var(--radius-check)",
      background: iconColor,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 16,
    color: "var(--white)"
  })) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--fs-base)",
      fontWeight: "var(--fw-bold)",
      color: "var(--nav)"
    }
  }, title, count != null ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-meta)",
      fontWeight: "var(--fw-regular)"
    }
  }, " (", count, ")") : null), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, actions, onRefresh ? /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "refresh",
    tone: "primary",
    size: 22,
    onClick: onRefresh,
    title: "Refresh"
  }) : null)), description ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 16px 0",
      fontSize: "var(--fs-sm)",
      color: "var(--fg-faint)"
    }
  }, description) : null, children ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      flex: 1
    }
  }, children) : null);
}
Object.assign(__ds_scope, { Panel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Panel.jsx", error: String((e && e.message) || e) }); }

// components/core/Pill.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* [DECIDED] Pill text/icons are black-or-white only, same rule as Button: white on dark fills,
   black on light fills. Tone is carried by background + the label text, never by a semantic
   text colour — this replaces the earlier per-tone colours (navy Draft, #5A4B00 Hold, etc). */
const TONE = {
  draft: {
    background: "var(--status-draft)",
    color: "var(--text-button-dark)"
  },
  active: {
    background: "var(--status-active)",
    color: "var(--text-button)"
  },
  hold: {
    background: "var(--status-hold)",
    color: "var(--text-button-dark)"
  },
  cancelled: {
    background: "var(--status-cancelled)",
    color: "var(--text-button-dark)"
  },
  nav: {
    background: "var(--nav)",
    color: "var(--text-button)"
  },
  outline: {
    background: "var(--white)",
    color: "var(--text-button-dark)",
    boxShadow: "inset 0 0 0 1px var(--border-input)"
  },
  /* Deadline urgency — date-relative, not workflow state. Do not reuse draft/active/hold/cancelled for due dates. */
  overdue: {
    background: "var(--deadline-overdue-bg)",
    color: "var(--text-button-dark)"
  },
  "due-soon": {
    background: "var(--deadline-duesoon-bg)",
    color: "var(--text-button-dark)"
  },
  "on-track": {
    background: "var(--white)",
    color: "var(--text-button-dark)",
    boxShadow: "inset 0 0 0 1px var(--border-input)"
  }
};

/** Named workflow status. Status is always named, never implied by colour alone. */
function Pill({
  tone = "draft",
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      borderRadius: "var(--radius-pill)",
      padding: "4px 12px",
      fontSize: "var(--fs-meta)",
      fontWeight: "var(--fw-semibold)",
      display: "inline-block",
      whiteSpace: "nowrap",
      ...(TONE[tone] || TONE.draft),
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Pill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Pill.jsx", error: String((e && e.message) || e) }); }

// components/core/SectionHeading.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Steel-blue bold heading that opens a tab panel or a block inside it. */
function SectionHeading({
  level = "section",
  subtitle,
  children,
  style,
  ...rest
}) {
  const size = level === "section" ? "var(--fs-section)" : "var(--fs-subsection)";
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 3,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: size,
      fontWeight: "var(--fw-bold)",
      color: "var(--text-heading)",
      lineHeight: "var(--lh-tight)"
    }
  }, children), subtitle ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--fs-sm)",
      color: "var(--text-meta)"
    }
  }, subtitle) : null);
}
Object.assign(__ds_scope, { SectionHeading });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/SectionHeading.jsx", error: String((e && e.message) || e) }); }

// components/core/StatusStepper.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** The record-header lifecycle track: outlined pills joined by em dashes, active one filled blue. */
function StatusStepper({
  steps = [],
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      ...style
    }
  }, rest), steps.map((s, i) => {
    const label = typeof s === "string" ? s : s.label;
    const active = typeof s === "string" ? false : !!s.active;
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: label + i
    }, i > 0 ? /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--fg-3)"
      }
    }, "\u2014") : null, /*#__PURE__*/React.createElement("span", {
      style: active ? {
        background: "var(--high-emphasis)",
        color: "var(--text-invert)",
        borderRadius: "var(--radius-pill)",
        padding: "6px 22px",
        fontSize: "var(--fs-sm)",
        fontWeight: "var(--fw-semibold)",
        whiteSpace: "nowrap"
      } : {
        border: "1px solid var(--border-input)",
        background: "var(--white)",
        color: "var(--fg-3)",
        borderRadius: "var(--radius-pill)",
        padding: "5px 20px",
        fontSize: "var(--fs-sm)",
        fontWeight: "var(--fw-semibold)",
        whiteSpace: "nowrap"
      }
    }, label));
  }));
}
Object.assign(__ds_scope, { StatusStepper });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/StatusStepper.jsx", error: String((e && e.message) || e) }); }

// components/data/BandHeader.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Square-cornered group band above a sub-table: Internal / External, Mandatory / Additional. */
function BandHeader({
  tone = "blue",
  note,
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: tone === "reviewer" ? "var(--surface-band-review)" : "var(--surface-band)",
      padding: "7px 12px",
      fontSize: "var(--fs-sm)",
      fontWeight: "var(--fw-bold)",
      color: "var(--nav)",
      display: "flex",
      alignItems: "center",
      ...style
    }
  }, rest), children, note ? /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      fontWeight: "var(--fw-regular)",
      fontSize: "var(--fs-meta)",
      color: tone === "reviewer" ? "#4A6B60" : "var(--fg-3)"
    }
  }, note) : null);
}
Object.assign(__ds_scope, { BandHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/BandHeader.jsx", error: String((e && e.message) || e) }); }

// components/data/BarChart.jsx
try { (() => {
const DEFAULT_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];

/** Grouped horizontal bars — Publication Type Mix (multiple series across categories). */
function BarChart({
  categories = [],
  series = [],
  colors = DEFAULT_COLORS,
  barHeight = 9,
  style
}) {
  const max = Math.max(1, ...categories.flatMap(c => c.values));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12,
      ...style
    }
  }, series.length > 1 ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 16
    }
  }, series.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontSize: "var(--fs-sm)",
      color: "var(--fg-3)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 9,
      height: 9,
      borderRadius: "var(--radius-round)",
      background: colors[i % colors.length]
    }
  }), s))) : null, categories.map((c, ci) => /*#__PURE__*/React.createElement("div", {
    key: ci,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 3
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--fs-sm)",
      color: "var(--fg-3)"
    }
  }, c.label), c.values.map((v, si) => /*#__PURE__*/React.createElement("div", {
    key: si,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: barHeight,
      background: "var(--low-emphasis)",
      borderRadius: "var(--radius-input)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      width: `${v / max * 100}%`,
      background: colors[si % colors.length],
      borderRadius: "var(--radius-input)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 30,
      textAlign: "right",
      fontSize: "var(--fs-meta)",
      color: "var(--nav)",
      fontWeight: "var(--fw-bold)",
      flex: "none"
    }
  }, v))))));
}
Object.assign(__ds_scope, { BarChart });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/BarChart.jsx", error: String((e && e.message) || e) }); }

// components/data/DataTable.jsx
try { (() => {
/**
 * The product's list table: medium-blue header band, zebra rows, hairline dividers,
 * hover tint. Columns are explicit grid tracks so dense tables stay aligned.
 * Two header treatments: "record" (blue band, for record-form tables — authors,
 * reviewers, checklist, budget) and "knowledge" (white, bottom hairline, for
 * dashboard/knowledge-view tables — task list, publication plans).
 */
function DataTable({
  columns = [],
  rows,
  children,
  onRowClick,
  footer,
  bordered = true,
  headerTone = "record",
  zebra = false,
  sortBy,
  sortDir = "asc",
  onSort,
  visibleRows,
  maxHeight,
  style
}) {
  const template = columns.map(c => c.width || "minmax(0,1fr)").join(" ");
  const cell = c => ({
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    textAlign: c.align || "left",
    fontWeight: c.bold ? "var(--fw-bold)" : "var(--fw-regular)"
  });
  const headerStyle = headerTone === "knowledge" ? {
    background: "var(--white)",
    color: "var(--nav)",
    borderBottom: "1px solid var(--border-divider)"
  } : {
    background: "var(--surface-table-head)",
    color: "var(--nav)"
  };
  const scroll = visibleRows || maxHeight ? {
    maxHeight: maxHeight || `calc(${visibleRows} * (var(--cell-pad-y) * 2 + 1.4em))`,
    overflowY: "auto"
  } : null;
  const headerRow = /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: template,
      columnGap: 12,
      fontSize: "var(--fs-meta)",
      fontWeight: "var(--fw-bold)",
      padding: "9px 12px",
      position: scroll ? "sticky" : "static",
      top: 0,
      zIndex: 1,
      ...headerStyle
    }
  }, columns.map((c, i) => {
    const sortable = c.sortable;
    const active = sortBy === i;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      onClick: sortable && onSort ? () => onSort(i) : undefined,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 4,
        textAlign: c.align || "left",
        cursor: sortable ? "pointer" : "default",
        userSelect: "none"
      }
    }, c.header, sortable ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: active && sortDir === "desc" ? "arrow_downward" : "arrow_upward",
      size: 14,
      color: active ? "var(--nav)" : "var(--border-input)"
    }) : null);
  }));
  const bodyRows = children ? children : (rows || []).map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: r.key || i,
    onClick: onRowClick ? () => onRowClick(r, i) : undefined,
    onMouseEnter: e => {
      e.currentTarget.style.background = "var(--surface-row-hover)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = zebra && i % 2 ? "var(--surface-zebra)" : "var(--white)";
    },
    style: {
      display: "grid",
      gridTemplateColumns: template,
      columnGap: 12,
      alignItems: "center",
      fontSize: "var(--fs-sm)",
      padding: "var(--cell-pad-y) var(--cell-pad-x)",
      borderTop: "1px solid var(--border-hairline)",
      background: zebra && i % 2 ? "var(--surface-zebra)" : "var(--white)",
      cursor: onRowClick ? "pointer" : "default"
    }
  }, columns.map((c, j) => /*#__PURE__*/React.createElement("div", {
    key: j,
    style: cell(c)
  }, r.cells[j]))));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      border: bordered ? "1px solid var(--border-divider)" : 0,
      borderRadius: "var(--radius-input)",
      overflow: "hidden",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: scroll || undefined
  }, headerRow, bodyRows), footer ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: template,
      columnGap: 12,
      alignItems: "center",
      fontSize: "var(--fs-sm)",
      fontWeight: "var(--fw-bold)",
      padding: "11px 12px",
      borderTop: "1px solid var(--border-divider)",
      background: "var(--low-emphasis)"
    }
  }, columns.map((c, j) => /*#__PURE__*/React.createElement("div", {
    key: j,
    style: {
      textAlign: c.align || "left"
    }
  }, footer[j]))) : null);
}
Object.assign(__ds_scope, { DataTable });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/DataTable.jsx", error: String((e && e.message) || e) }); }

// components/data/DetailGrid.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Read-only label/value pairs in two columns — the product's record-detail layout. */
function DetailGrid({
  items = [],
  columns = 2,
  framed,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "grid",
      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      gap: "14px 40px",
      ...(framed ? {
        border: "1px solid var(--border-input)",
        borderRadius: "var(--radius-input)",
        background: "var(--white)",
        padding: 14
      } : null),
      ...style
    }
  }, rest), items.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: it.full ? {
      gridColumn: "1 / -1"
    } : null
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--fs-meta)",
      color: "var(--text-meta)",
      fontWeight: "var(--fw-bold)"
    }
  }, it.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--fs-base)",
      marginTop: 2,
      textWrap: "pretty",
      fontStyle: it.empty ? "italic" : "normal",
      color: it.empty ? "var(--fg-faint)" : "var(--text-body)"
    }
  }, it.value))));
}
Object.assign(__ds_scope, { DetailGrid });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/DetailGrid.jsx", error: String((e && e.message) || e) }); }

// components/data/DonutChart.jsx
try { (() => {
const DEFAULT_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];
function Legend({
  data,
  colors
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 7,
      minWidth: 140,
      flex: "none"
    }
  }, data.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 7
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 9,
      height: 9,
      borderRadius: "var(--radius-round)",
      background: d.color || colors[i % colors.length],
      flex: "none"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-sm)",
      color: "var(--fg-3)",
      flex: 1,
      minWidth: 0,
      textWrap: "pretty"
    }
  }, d.label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-sm)",
      fontWeight: "var(--fw-bold)",
      color: "var(--nav)",
      flex: "none"
    }
  }, d.value))));
}

/** Ring breakdown with an optional centre label — Outcome Status, Outcome, Final Disposition. */
function DonutChart({
  data = [],
  size = 150,
  thickness,
  colors = DEFAULT_COLORS,
  showLegend = true,
  centerLabel,
  centerValue,
  style
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let acc = 0;
  const stops = data.map((d, i) => {
    const start = acc / total * 360;
    acc += d.value;
    const end = acc / total * 360;
    return `${d.color || colors[i % colors.length]} ${start}deg ${end}deg`;
  }).join(", ");
  const hole = size - (thickness || size * 0.42) * 2;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 20,
      flexWrap: "wrap",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width: size,
      height: size,
      flex: "none"
    },
    title: data.map(d => `${d.label}: ${d.value}`).join(", ")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: size,
      height: size,
      borderRadius: "50%",
      background: `conic-gradient(${stops})`
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: (size - hole) / 2,
      width: hole,
      height: hole,
      borderRadius: "50%",
      background: "var(--white)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center"
    }
  }, centerValue != null ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: "var(--fw-bold)",
      color: "var(--nav)"
    }
  }, centerValue) : null, centerLabel ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--fs-eyebrow)",
      color: "var(--text-meta)"
    }
  }, centerLabel) : null)), showLegend ? /*#__PURE__*/React.createElement(Legend, {
    data: data,
    colors: colors
  }) : null);
}
Object.assign(__ds_scope, { DonutChart });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/DonutChart.jsx", error: String((e && e.message) || e) }); }

// components/data/GanttChart.jsx
try { (() => {
/**
 * Publication-plan roadmap: 280px task column, period header band, rounded progress
 * bars in the plan colour, black diamond milestones.
 */
function GanttChart({
  periods = [],
  rows = [],
  taskColumnWidth = 280,
  style
}) {
  const cols = periods.length || 1;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1px solid var(--border-divider)",
      borderRadius: "var(--radius-input)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: `${taskColumnWidth}px 1fr`,
      background: "var(--surface-band)",
      borderBottom: "1px solid var(--blue-line)",
      borderRadius: "var(--radius-input) var(--radius-input) 0 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--fs-sm)",
      fontWeight: "var(--fw-bold)",
      color: "var(--nav)",
      padding: "10px 12px"
    }
  }, "Task Name"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`
    }
  }, periods.map(p => /*#__PURE__*/React.createElement("div", {
    key: p,
    style: {
      fontSize: "var(--fs-meta)",
      fontWeight: "var(--fw-bold)",
      color: "var(--nav)",
      padding: "10px 8px",
      borderLeft: "1px solid var(--blue-line)",
      textAlign: "center"
    }
  }, p)))), rows.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "grid",
      gridTemplateColumns: `${taskColumnWidth}px 1fr`,
      borderBottom: "1px solid var(--border-hairline)",
      background: "var(--white)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: `7px 12px 7px ${12 + (r.level || 0) * 20}px`,
      fontSize: "var(--fs-sm)",
      fontWeight: r.kind === "group" || r.level === 0 ? "var(--fw-bold)" : "var(--fw-regular)",
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, r.name)), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      minHeight: 30,
      backgroundImage: "linear-gradient(to right, var(--border-hairline) 1px, transparent 1px)",
      backgroundSize: `${100 / cols}% 100%`
    }
  }, r.kind === "milestone" ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 9,
      left: r.start + "%",
      width: 13,
      height: 13,
      background: "var(--fg-1)",
      transform: "rotate(45deg)"
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 6,
      height: 18,
      left: r.start + "%",
      width: (r.width || 0) + "%",
      display: "flex",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      background: r.trackColor || "var(--tint-positive-bg)",
      borderRadius: "var(--radius-input)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: "0 auto 0 0",
      width: (r.percent || 0) + "%",
      background: r.color || "var(--plan-default)"
    }
  })), r.barLabel ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      marginLeft: `calc(${r.width || 0}% + 8px)`,
      fontSize: 11,
      color: "var(--fg-3)",
      whiteSpace: "nowrap"
    }
  }, r.barLabel) : null)))));
}
Object.assign(__ds_scope, { GanttChart });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/GanttChart.jsx", error: String((e && e.message) || e) }); }

// components/data/PieChart.jsx
try { (() => {
const DEFAULT_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];
function Legend({
  data,
  colors
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 7,
      minWidth: 140,
      flex: "none"
    }
  }, data.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 7
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 9,
      height: 9,
      borderRadius: "var(--radius-round)",
      background: d.color || colors[i % colors.length],
      flex: "none"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-sm)",
      color: "var(--fg-3)",
      flex: 1,
      minWidth: 0,
      textWrap: "pretty"
    }
  }, d.label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-sm)",
      fontWeight: "var(--fw-bold)",
      color: "var(--nav)",
      flex: "none"
    }
  }, d.value))));
}

/** Slice map for a categorical breakdown — Publication by Product, Therapeutic Area Distribution. */
function PieChart({
  data = [],
  size = 150,
  colors = DEFAULT_COLORS,
  showLegend = true,
  style
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let acc = 0;
  const stops = data.map((d, i) => {
    const start = acc / total * 360;
    acc += d.value;
    const end = acc / total * 360;
    return `${d.color || colors[i % colors.length]} ${start}deg ${end}deg`;
  }).join(", ");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 20,
      flexWrap: "wrap",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: size,
      height: size,
      borderRadius: "50%",
      background: `conic-gradient(${stops})`,
      flex: "none"
    },
    title: data.map(d => `${d.label}: ${d.value}`).join(", ")
  }), showLegend ? /*#__PURE__*/React.createElement(Legend, {
    data: data,
    colors: colors
  }) : null);
}
Object.assign(__ds_scope, { PieChart });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/PieChart.jsx", error: String((e && e.message) || e) }); }

// components/data/StatCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONE = {
  neutral: {
    bg: "var(--white)",
    border: "1px solid var(--border-input)",
    accent: "var(--nav)"
  },
  info: {
    bg: "var(--tint-info-bg)",
    border: "1px solid var(--tint-info-bg)",
    accent: "var(--tint-info-accent)"
  },
  positive: {
    bg: "var(--tint-positive-bg)",
    border: "1px solid var(--tint-positive-bg)",
    accent: "var(--tint-positive-accent)"
  },
  warning: {
    bg: "var(--tint-warning-bg)",
    border: "1px solid var(--tint-warning-bg)",
    accent: "var(--tint-warning-accent)"
  },
  suspended: {
    bg: "var(--tint-suspended-bg)",
    border: "1px solid var(--tint-suspended-bg)",
    accent: "var(--tint-suspended-accent)"
  },
  fatal: {
    bg: "var(--tint-fatal-bg)",
    border: "1px solid var(--tint-fatal-bg)",
    accent: "var(--tint-fatal-accent)"
  }
};

/** Single-number summary tile — budget, committed, remaining, or a status count. */
function StatCard({
  label,
  value,
  valueColor,
  tone = "neutral",
  icon,
  href,
  style,
  ...rest
}) {
  const t = TONE[tone] || TONE.neutral;
  const accent = valueColor || t.accent;
  const ValueTag = href ? "a" : "div";
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      border: t.border,
      borderRadius: "var(--radius-input)",
      background: t.bg,
      padding: 14,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontSize: "var(--fs-meta)",
      color: tone === "neutral" ? "var(--text-meta)" : accent,
      fontWeight: "var(--fw-bold)"
    }
  }, icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 16,
    color: tone === "neutral" ? "var(--text-meta)" : accent
  }) : null, label), /*#__PURE__*/React.createElement(ValueTag, {
    href: href,
    style: {
      display: "block",
      fontSize: 22,
      fontWeight: "var(--fw-bold)",
      color: accent,
      marginTop: 4,
      textDecoration: href ? "underline" : "none"
    }
  }, value));
}
Object.assign(__ds_scope, { StatCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatCard.jsx", error: String((e && e.message) || e) }); }

// components/feedback/AIActionButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Approvia AI action — a tertiary pill with a sparkle glyph on the left. */
function AIActionButton({
  children,
  disabled,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    disabled: disabled,
    style: {
      border: 0,
      borderRadius: "var(--radius-pill)",
      background: "var(--med-emphasis)",
      color: "var(--text-button-dark)",
      padding: "0 var(--button-pad-x)",
      minHeight: "var(--button-h)",
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      whiteSpace: "nowrap",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--fs-meta)",
      fontWeight: "var(--fw-bold)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      transition: "filter var(--dur-base)",
      ...style
    },
    onMouseEnter: e => {
      if (!disabled) e.currentTarget.style.filter = "var(--hover-darken)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.filter = "none";
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "auto_awesome",
    size: 16,
    color: "var(--text-button-dark)"
  }), children);
}
Object.assign(__ds_scope, { AIActionButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/AIActionButton.jsx", error: String((e && e.message) || e) }); }

// components/feedback/ConfirmModal.jsx
try { (() => {
/** Confirmation dialog. Required before any fatal action. */
function ConfirmModal({
  title,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(8,47,77,.35)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 100
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 460,
      background: "var(--white)",
      borderRadius: "var(--radius-chip)",
      boxShadow: "var(--shadow-menu)",
      overflow: "hidden",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      background: "var(--fatal-modal)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px 22px 22px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--fs-subsection)",
      fontWeight: "var(--fw-bold)",
      color: "var(--nav)"
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--fs-base)",
      lineHeight: "var(--lh-body)",
      color: "var(--fg-3)",
      marginTop: 8
    }
  }, children), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      marginTop: 22
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "fatal",
    onClick: onConfirm
  }, confirmLabel), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    onClick: onCancel,
    style: {
      marginLeft: "auto"
    }
  }, cancelLabel)))));
}
Object.assign(__ds_scope, { ConfirmModal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/ConfirmModal.jsx", error: String((e && e.message) || e) }); }

// components/feedback/InlineMessage.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const KIND = {
  info: {
    bg: "var(--info-bg)",
    chip: "var(--info-icon)",
    glyph: "info",
    fg: "var(--white)"
  },
  warning: {
    bg: "var(--warning-bg)",
    chip: "var(--warning-icon)",
    glyph: "priority_high",
    fg: "#5A4B00"
  },
  error: {
    bg: "var(--error-bg)",
    chip: "var(--error-icon)",
    glyph: "error",
    fg: "var(--white)"
  }
};

/** Soft tinted bar with a circular icon chip. Radius 5px. */
function InlineMessage({
  kind = "info",
  children,
  style,
  ...rest
}) {
  const k = KIND[kind] || KIND.info;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      borderRadius: "var(--radius-msg)",
      padding: "9px 13px",
      fontSize: "var(--fs-sm)",
      background: k.bg,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      height: 18,
      borderRadius: "var(--radius-round)",
      background: k.chip,
      flex: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: k.glyph,
    size: 13,
    color: k.fg
  })), /*#__PURE__*/React.createElement("span", null, children));
}
Object.assign(__ds_scope, { InlineMessage });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/InlineMessage.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Hover explainer card. Anchored, never interactive (pointer-events off). */
function Tooltip({
  title,
  children,
  width = 250,
  align = "right",
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      position: "absolute",
      top: "100%",
      [align === "right" ? "right" : "left"]: 0,
      marginTop: 6,
      width,
      background: "var(--white)",
      border: "1px solid var(--border-divider)",
      borderRadius: "var(--radius-chip)",
      boxShadow: "var(--shadow-tip)",
      padding: "10px 12px",
      fontSize: "var(--fs-meta)",
      lineHeight: "var(--lh-body)",
      color: "var(--fg-3)",
      zIndex: 40,
      pointerEvents: "none",
      ...style
    }
  }, rest), title ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: "var(--fw-bold)",
      color: "var(--nav)",
      marginBottom: 3
    }
  }, title) : null, children);
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Square 3px-radius checkbox with a Material tick. Locked rows show a padlock instead. */
function Checkbox({
  checked,
  locked,
  label,
  size = 17,
  onChange,
  style,
  ...rest
}) {
  const box = {
    width: size,
    height: size,
    borderRadius: "var(--radius-check)",
    border: locked ? 0 : "1px solid var(--border-input)",
    background: locked ? "var(--blue-chip)" : checked ? "var(--high-emphasis)" : "var(--white)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "none"
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    onClick: locked ? undefined : onChange,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 9,
      cursor: locked ? "default" : "pointer",
      fontSize: "var(--fs-base)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: box
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: locked ? "lock" : "check",
    size: Math.round(size * 0.8),
    color: locked || checked ? "var(--white)" : "transparent"
  })), label ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: "var(--fw-bold)"
    }
  }, label) : null);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/CheckboxGroup.jsx
try { (() => {
/** Bordered group of checkboxes acting as a multi-select field (additional products,
 * therapeutic areas, tags, distribution channels). */
function CheckboxGroup({
  options = [],
  value = [],
  onChange,
  framed = true,
  maxHeight,
  columns = 1,
  style
}) {
  const opts = options.map(o => typeof o === "string" ? {
    value: o,
    label: o
  } : o);
  const toggle = v => {
    if (!onChange) return;
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      border: framed ? "1px solid var(--border-input)" : 0,
      borderRadius: "var(--radius-input)",
      padding: framed ? 12 : 0,
      display: "grid",
      gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))`,
      gap: 10,
      maxHeight,
      overflowY: maxHeight ? "auto" : undefined,
      ...style
    }
  }, opts.map(o => /*#__PURE__*/React.createElement(__ds_scope.Checkbox, {
    key: o.value,
    checked: value.includes(o.value),
    onChange: () => toggle(o.value),
    label: o.label
  })));
}
Object.assign(__ds_scope, { CheckboxGroup });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/CheckboxGroup.jsx", error: String((e && e.message) || e) }); }

// components/forms/DropZone.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Dashed document upload box. Every file field in PubPro uses this exact wording. */
function DropZone({
  accept = "Accepted: .docx, .pptx, .pdf",
  newDocumentLabel = "Start New Document",
  onSelect,
  onNewDocument,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      border: "2px dashed var(--border-input)",
      borderRadius: "var(--radius-input)",
      padding: "32px 20px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 10,
      background: "var(--white)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "backup",
    size: 46,
    color: "var(--high-emphasis)"
  }), /*#__PURE__*/React.createElement("div", {
    onClick: onSelect,
    style: {
      fontSize: "var(--fs-lg)",
      color: "var(--nav)",
      cursor: "pointer"
    }
  }, "Click here to select a document or drag and drop it into this box"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--fs-sm)",
      color: "var(--fg-faint)"
    }
  }, accept), newDocumentLabel ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-sm)",
      color: "var(--fg-faint)"
    }
  }, "or"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    icon: "note_add",
    onClick: onNewDocument,
    style: {
      fontSize: "var(--fs-sm)"
    }
  }, newDocumentLabel)) : null);
}
Object.assign(__ds_scope, { DropZone });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/DropZone.jsx", error: String((e && e.message) || e) }); }

// components/forms/Field.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Bold-14 label above a control, with the product's info affordance and required accent. */
function Field({
  label,
  info,
  required,
  help,
  width,
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      width,
      ...style
    }
  }, rest), label ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontSize: "var(--fs-base)",
      fontWeight: "var(--fw-semibold)",
      marginBottom: 5
    }
  }, label, info ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "info",
    size: 16,
    color: "var(--high-emphasis)",
    title: info
  }) : null) : null, /*#__PURE__*/React.createElement("div", {
    style: required ? {
      borderLeft: "4px solid var(--fatal-action)",
      paddingLeft: 8
    } : null
  }, children), help ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--fs-sm)",
      color: "var(--fg-faint)",
      marginTop: 6
    }
  }, help) : null);
}
Object.assign(__ds_scope, { Field });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Field.jsx", error: String((e && e.message) || e) }); }

// components/forms/MoneyField.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Currency input: fixed $ prefix, right-aligned bold value. */
function MoneyField({
  width = 170,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      border: "1px solid var(--border-input)",
      borderRadius: "var(--radius-input)",
      background: "var(--white)",
      padding: "0 9px",
      width,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-base)",
      color: "var(--fg-3)",
      marginRight: 3
    }
  }, "$"), /*#__PURE__*/React.createElement("input", _extends({
    style: {
      width: "100%",
      border: 0,
      outline: "none",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--fs-base)",
      padding: "7px 0",
      textAlign: "right",
      fontWeight: "var(--fw-bold)",
      background: "transparent"
    }
  }, rest)));
}
Object.assign(__ds_scope, { MoneyField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/MoneyField.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Round option control. Selected state is a filled blue circle with a tick. */
function Radio({
  checked,
  label,
  size = 17,
  onChange,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    onClick: onChange,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      cursor: "pointer",
      fontSize: "var(--fs-base)",
      color: checked ? "var(--text-body)" : "var(--fg-3)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: size,
      height: size,
      borderRadius: "var(--radius-round)",
      border: checked ? 0 : "1px solid var(--border-input)",
      background: checked ? "var(--high-emphasis)" : "var(--white)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: Math.round(size * 0.76),
    color: checked ? "var(--white)" : "transparent"
  })), label);
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/RecordRef.jsx
try { (() => {
/**
 * Reference to another record: search for it, then show it as a linked chip
 * (ID + name + optional secondary line) with a remove affordance. Clearing swaps
 * back to the typeahead. The generic version of "Add Study" / "Parent Planning ID".
 */
function RecordRef({
  value,
  query = "",
  placeholder = "Search",
  suggestions = [],
  open,
  emptyLabel,
  width = 320,
  onQueryChange,
  onPick,
  onClear,
  style
}) {
  if (value) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        border: "1px solid var(--border-input)",
        borderRadius: "var(--radius-input)",
        background: "var(--white)",
        padding: "9px 10px",
        width,
        ...style
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0,
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: "var(--fs-sm)",
        fontWeight: "var(--fw-bold)",
        color: "var(--nav)"
      }
    }, value.id), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: "var(--fs-sm)",
        color: "var(--fg-3)",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, value.label), value.secondaryLabel ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: "var(--fs-meta)",
        color: "var(--text-meta)"
      }
    }, value.secondaryLabel) : null), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
      icon: "close",
      tone: "fatal",
      size: 22,
      onClick: onClear,
      title: "Remove"
    }));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      border: "1px solid var(--border-input)",
      borderRadius: "var(--radius-input)",
      background: "var(--white)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 19,
    color: "var(--text-meta)",
    style: {
      padding: "0 6px 0 9px"
    }
  }), /*#__PURE__*/React.createElement("input", {
    value: query,
    placeholder: placeholder,
    onChange: e => onQueryChange && onQueryChange(e.target.value),
    style: {
      flex: 1,
      minWidth: 0,
      border: 0,
      outline: "none",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--fs-base)",
      padding: "8px 4px"
    }
  })), open ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      top: "100%",
      marginTop: 4,
      background: "var(--white)",
      border: "1px solid var(--border-input)",
      borderRadius: "var(--radius-input)",
      boxShadow: "var(--shadow-menu)",
      zIndex: 30,
      maxHeight: 236,
      overflowY: "auto"
    }
  }, suggestions.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: s.id || i,
    onClick: () => onPick && onPick(s),
    onMouseEnter: e => {
      e.currentTarget.style.background = "var(--surface-row-hover)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = "var(--white)";
    },
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "9px 12px",
      cursor: "pointer",
      borderBottom: "1px solid var(--border-hairline)"
    }
  }, s.id ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-sm)",
      fontWeight: "var(--fw-bold)",
      color: "var(--nav)",
      flex: "none"
    }
  }, s.id) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-sm)",
      flex: 1,
      minWidth: 0,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, s.label), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "add_circle",
    size: 19,
    color: "var(--high-emphasis)"
  }))), suggestions.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 12px",
      fontSize: "var(--fs-sm)",
      color: "var(--fg-faint)",
      fontStyle: "italic"
    }
  }, emptyLabel || "No matches.") : null) : null);
}
Object.assign(__ds_scope, { RecordRef });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/RecordRef.jsx", error: String((e && e.message) || e) }); }

// components/forms/SearchSelect.jsx
try { (() => {
/**
 * Type-to-find control with a suggestion menu — how PubPro attaches studies,
 * publications, authors and reviewers to a record.
 */
function SearchSelect({
  value = "",
  placeholder = "Search",
  suggestions = [],
  open,
  emptyLabel,
  width = 320,
  onChange,
  onFocus,
  onClear,
  onPick,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      border: "1px solid var(--border-input)",
      borderRadius: "var(--radius-input)",
      background: "var(--white)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 19,
    color: "var(--text-meta)",
    style: {
      padding: "0 6px 0 9px"
    }
  }), /*#__PURE__*/React.createElement("input", {
    value: value,
    placeholder: placeholder,
    onChange: onChange,
    onFocus: onFocus,
    style: {
      flex: 1,
      minWidth: 0,
      border: 0,
      outline: "none",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--fs-base)",
      padding: "8px 4px"
    }
  }), value ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "close",
    size: 18,
    color: "var(--text-meta)",
    onClick: onClear,
    style: {
      padding: "0 8px",
      cursor: "pointer"
    }
  }) : null), open ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      top: "100%",
      marginTop: 4,
      background: "var(--white)",
      border: "1px solid var(--border-input)",
      borderRadius: "var(--radius-input)",
      boxShadow: "var(--shadow-menu)",
      zIndex: 30,
      maxHeight: 236,
      overflowY: "auto"
    }
  }, suggestions.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: s.id || i,
    onClick: () => onPick && onPick(s),
    onMouseEnter: e => {
      e.currentTarget.style.background = "var(--surface-row-hover)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = "var(--white)";
    },
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "9px 12px",
      cursor: "pointer",
      borderBottom: "1px solid var(--border-hairline)"
    }
  }, s.id ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-sm)",
      fontWeight: "var(--fw-bold)",
      color: "var(--nav)",
      flex: "none"
    }
  }, s.id) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-sm)",
      flex: 1,
      minWidth: 0,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, s.label), s.meta ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-meta)",
      color: "var(--text-meta)",
      flex: "none"
    }
  }, s.meta) : null, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "add_circle",
    size: 19,
    color: "var(--high-emphasis)"
  }))), suggestions.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 12px",
      fontSize: "var(--fs-sm)",
      color: "var(--fg-faint)"
    }
  }, emptyLabel || "No matches.") : null) : null);
}
Object.assign(__ds_scope, { SearchSelect });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SearchSelect.jsx", error: String((e && e.message) || e) }); }

// components/forms/SegmentedToggle.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Two or three exclusive options in one pill-bordered strip (Week/Month, Internal/External). */
function SegmentedToggle({
  options = [],
  value,
  onChange,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      border: "1px solid var(--border-input)",
      borderRadius: "var(--radius-pill)",
      overflow: "hidden",
      flex: "none",
      ...style
    }
  }, rest), options.map(o => {
    const on = o === value;
    return /*#__PURE__*/React.createElement("span", {
      key: o,
      onClick: () => onChange && onChange(o),
      style: {
        fontSize: "var(--fs-meta)",
        fontWeight: "var(--fw-bold)",
        padding: "7px 18px",
        cursor: "pointer",
        background: on ? "var(--high-emphasis)" : "var(--white)",
        color: on ? "var(--text-invert)" : "var(--fg-3)"
      }
    }, o);
  }));
}
Object.assign(__ds_scope, { SegmentedToggle });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SegmentedToggle.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Native select in the product's 4px frame. Unset value renders in placeholder grey. */
function Select({
  options = [],
  placeholder,
  value,
  width = 260,
  style,
  ...rest
}) {
  const unset = value === "" || value == null;
  return /*#__PURE__*/React.createElement("select", _extends({
    value: value,
    style: {
      width,
      fontFamily: "var(--font-sans)",
      fontSize: "var(--fs-base)",
      padding: "6px 8px",
      border: "1px solid var(--border-input)",
      borderRadius: "var(--radius-input)",
      background: "var(--white)",
      color: unset ? "var(--fg-faint)" : "var(--text-body)",
      ...style
    }
  }, rest), placeholder ? /*#__PURE__*/React.createElement("option", {
    value: ""
  }, placeholder) : null, options.map(o => {
    const v = typeof o === "string" ? o : o.value;
    const l = typeof o === "string" ? o : o.label;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  }));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/TextArea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Multi-line input. Same 4px frame as TextField; vertical resize only. */
function TextArea({
  width = "100%",
  height,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("textarea", _extends({
    style: {
      width,
      height,
      boxSizing: "border-box",
      border: "1px solid var(--border-input)",
      borderRadius: "var(--radius-input)",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--fs-base)",
      lineHeight: "var(--lh-loose)",
      color: "var(--text-body)",
      padding: "9px 11px",
      resize: "vertical",
      background: "var(--white)",
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { TextArea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/TextArea.jsx", error: String((e && e.message) || e) }); }

// components/feedback/CommentComposer.jsx
try { (() => {
const {
  useState
} = React;
/**
 * Compose-and-submit row for review comments, decisions and audit notes: a
 * TextArea plus a secondary "Comment" button. Extracted from two hand-rolled
 * instances (round reviewer comments, publication comment thread) — use this
 * instead of pairing TextArea + Button inline again.
 */
function CommentComposer({
  width = 460,
  height = 76,
  placeholder,
  submitLabel = "Comment",
  layout = "inline",
  value,
  onChange,
  onSubmit,
  disabled,
  style
}) {
  const [local, setLocal] = useState("");
  const controlled = value != null;
  const text = controlled ? value : local;
  const set = v => controlled ? onChange && onChange(v) : setLocal(v);
  const submit = () => {
    if (onSubmit) onSubmit(text);
    if (!controlled) setLocal("");
  };
  const button = /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    disabled: disabled || !text.trim(),
    onClick: submit
  }, submitLabel);
  if (layout === "stacked") {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 10,
        width,
        ...style
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.TextArea, {
      width: "100%",
      height: height,
      placeholder: placeholder,
      value: text,
      onChange: e => set(e.target.value),
      disabled: disabled
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "flex-end"
      }
    }, button));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.TextArea, {
    width: width,
    height: height,
    placeholder: placeholder,
    value: text,
    onChange: e => set(e.target.value),
    disabled: disabled
  }), button);
}
Object.assign(__ds_scope, { CommentComposer });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/CommentComposer.jsx", error: String((e && e.message) || e) }); }

// components/forms/TextField.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Single-line text input; optional leading or trailing glyph inside the 4px frame. */
function TextField({
  iconBefore,
  iconAfter,
  onIconClick,
  width = "100%",
  align,
  style,
  ...rest
}) {
  const input = /*#__PURE__*/React.createElement("input", _extends({
    style: {
      flex: 1,
      minWidth: 0,
      border: 0,
      outline: "none",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--fs-base)",
      color: "var(--text-body)",
      padding: "var(--field-pad-y) var(--field-pad-x)",
      textAlign: align,
      background: "transparent"
    }
  }, rest));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      border: "1px solid var(--border-input)",
      borderRadius: "var(--radius-input)",
      background: "var(--white)",
      overflow: "hidden",
      width,
      ...style
    }
  }, iconBefore ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconBefore,
    size: 19,
    color: "var(--text-meta)",
    style: {
      padding: "0 6px 0 9px"
    }
  }) : null, input, iconAfter ? /*#__PURE__*/React.createElement("span", {
    onClick: onIconClick,
    style: {
      padding: "0 8px",
      borderLeft: "1px solid var(--border-divider)",
      cursor: onIconClick ? "pointer" : "default",
      display: "flex"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconAfter,
    size: 20,
    color: "var(--nav)"
  })) : null);
}
Object.assign(__ds_scope, { TextField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/TextField.jsx", error: String((e && e.message) || e) }); }

// components/forms/DateField.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Date (or time) entry: m/d/yyyy text plus a divided calendar cell. */
function DateField({
  width = 178,
  time,
  ...rest
}) {
  return /*#__PURE__*/React.createElement(__ds_scope.TextField, _extends({
    width: width,
    placeholder: time ? "h:mm AM/PM" : "m/d/yyyy",
    iconAfter: time ? "schedule" : "calendar_month"
  }, rest));
}
Object.assign(__ds_scope, { DateField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/DateField.jsx", error: String((e && e.message) || e) }); }

// components/navigation/BrandMark.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SRC = {
  navy: "assets/logo-bplogix-navy.svg",
  white: "assets/logo-bplogix-white.svg"
};

/**
 * Finds the design-system root at runtime from the loaded _ds_bundle.js script tag,
 * so assets resolve both here and inside a consuming project's _ds/<folder>/ tree.
 */
function dsRoot() {
  return "/ds";
  const tags = Array.prototype.slice.call(document.querySelectorAll("script[src]"));
  for (let i = 0; i < tags.length; i++) {
    const src = tags[i].src || "";
    if (/_ds_bundle\.js(\?|$)/.test(src)) return src.replace(/\/_ds_bundle\.js.*$/, "");
  }
  return ".";
}

/** The BP Logix wordmark. Navy on light surfaces, knockout on navy and dark. */
function BrandMark({
  variant = "white",
  height = 26,
  basePath,
  style,
  ...rest
}) {
  const root = String(basePath == null ? dsRoot() : basePath).replace(/\/+$/, "") || ".";
  return /*#__PURE__*/React.createElement("img", _extends({
    src: root + "/" + SRC[variant === "navy" ? "navy" : "white"],
    alt: "BP Logix",
    style: {
      height,
      width: "auto",
      display: "block",
      flex: "none",
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { BrandMark });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/BrandMark.jsx", error: String((e && e.message) || e) }); }

// components/navigation/FormActionBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Bottom action bar: destructive actions left, committing action far right. */
function FormActionBar({
  left,
  right,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      alignItems: "center",
      padding: "28px var(--page-gutter) 29px",
      gap: "var(--button-gap)",
      flexWrap: "wrap",
      ...style
    }
  }, rest), left, /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      display: "flex",
      alignItems: "center",
      gap: "var(--button-gap)"
    }
  }, right));
}
Object.assign(__ds_scope, { FormActionBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/FormActionBar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/NavMenu.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Dropdown menu under a nav item: white card, 14px navy rows, hover tint. */
function NavMenu({
  items = [],
  width,
  onSelect,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      position: "absolute",
      top: "100%",
      left: 0,
      minWidth: width || 230,
      background: "var(--white)",
      borderRadius: "var(--radius-input)",
      boxShadow: "var(--shadow-menu)",
      padding: "6px 0",
      zIndex: 50,
      ...style
    }
  }, rest), items.map((it, i) => {
    const label = typeof it === "string" ? it : it.label;
    const icon = typeof it === "string" ? null : it.icon;
    return /*#__PURE__*/React.createElement("div", {
      key: label + i,
      onClick: onSelect ? () => onSelect(label) : undefined,
      onMouseEnter: e => {
        e.currentTarget.style.background = "var(--surface-row-hover)";
      },
      onMouseLeave: e => {
        e.currentTarget.style.background = "transparent";
      },
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 20px",
        fontSize: "var(--fs-base)",
        color: "var(--nav)",
        cursor: "pointer",
        whiteSpace: "nowrap"
      }
    }, icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: icon,
      size: 18,
      color: "var(--high-emphasis)"
    }) : null, label);
  }));
}
Object.assign(__ds_scope, { NavMenu });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/NavMenu.jsx", error: String((e && e.message) || e) }); }

// components/navigation/PanelTabs.jsx
try { (() => {
/**
 * Card-style tabs that seam into the panel beneath (module switcher: PUBLICATIONS /
 * IIS / GRANTS / MEDINFO). Distinct from WorkspaceTabs (chrome-level) and SideTabRail
 * (record side rail) — this is the third, panel-level tab pattern.
 */
function PanelTabs({
  tabs = [],
  active,
  onSelect,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 0,
      ...style
    }
  }, tabs.map(t => {
    const on = t.id === active;
    const accent = t.accent || "var(--high-emphasis)";
    return /*#__PURE__*/React.createElement("div", {
      key: t.id,
      onClick: onSelect ? () => onSelect(t.id) : undefined,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 16px",
        borderTop: on ? `3px solid ${accent}` : "1px solid var(--border-divider)",
        borderLeft: "1px solid var(--border-divider)",
        borderRight: "1px solid var(--border-divider)",
        borderBottom: on ? 0 : "1px solid var(--border-divider)",
        marginTop: on ? 0 : 2,
        marginBottom: on ? -1 : 0,
        background: on ? "var(--white)" : "var(--low-emphasis)",
        color: "var(--nav)",
        fontSize: "var(--fs-sm)",
        fontWeight: on ? "var(--fw-bold)" : "var(--fw-regular)",
        cursor: "pointer",
        borderRadius: "var(--radius-panel) var(--radius-panel) 0 0",
        zIndex: on ? 1 : 0
      }
    }, t.icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: t.icon,
      size: 18,
      color: on ? accent : "var(--fg-3)"
    }) : null, t.label);
  }));
}
Object.assign(__ds_scope, { PanelTabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/PanelTabs.jsx", error: String((e && e.message) || e) }); }

// components/navigation/RecordHeader.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const MODULE_SRC = {
  pubpro: "assets/icons/icon-pubpro.svg",
  medinfo: "assets/icons/icon-medinfo.svg",
  iis: "assets/icons/icon-iis.svg"
};

/** Finds the design-system root from the loaded _ds_bundle.js script tag. */
function dsRoot() {
  return "/ds";
  const tags = Array.prototype.slice.call(document.querySelectorAll("script[src]"));
  for (let i = 0; i < tags.length; i++) {
    const src = tags[i].src || "";
    if (/_ds_bundle\.js(\?|$)/.test(src)) return src.replace(/\/_ds_bundle\.js.*$/, "");
  }
  return ".";
}

/** Grey band identifying the open record: module tile, title, task name, lifecycle, meta. */
function RecordHeader({
  module: moduleName = "pubpro",
  icon,
  title,
  task,
  subtitle,
  steps,
  meta = [],
  basePath,
  style,
  ...rest
}) {
  const src = MODULE_SRC[moduleName];
  const root = String(basePath == null ? dsRoot() : basePath).replace(/\/+$/, "") || ".";
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: "var(--surface-page)",
      padding: "14px var(--page-gutter) 10px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 14
    }
  }, src && !icon ? /*#__PURE__*/React.createElement("img", {
    src: root + "/" + src,
    alt: "",
    style: {
      width: 44,
      height: 44,
      display: "block",
      flex: "none"
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 44,
      borderRadius: "var(--radius-tile)",
      background: "var(--med-emphasis)",
      border: "1px solid var(--blue-line-2)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon || "library_books",
    size: 26,
    color: "var(--nav)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--fs-record-title)",
      fontWeight: "var(--fw-bold)",
      color: "var(--text-heading)",
      lineHeight: "var(--lh-snug)",
      wordBreak: "break-word",
      textWrap: "pretty"
    }
  }, title), task ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--fs-base)",
      fontWeight: "var(--fw-bold)",
      color: "var(--fg-3)"
    }
  }, task) : null), steps ? /*#__PURE__*/React.createElement(__ds_scope.StatusStepper, {
    steps: steps,
    style: {
      marginLeft: "auto"
    }
  }) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      gap: 20
    }
  }, subtitle ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--fs-body)",
      color: "var(--fg-3)"
    }
  }, subtitle) : null, meta.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      textAlign: "right",
      fontSize: "var(--fs-base)",
      color: "var(--fg-3)",
      lineHeight: "var(--lh-loose)"
    }
  }, meta.map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, m))) : null));
}
Object.assign(__ds_scope, { RecordHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/RecordHeader.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SideTabRail.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** 196px vertical tab rail on the left of a record form. Active tab is a navy chip. */
function SideTabRail({
  tabs = [],
  active,
  onSelect,
  width = 196,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      width,
      height: "100%",
      flex: "none",
      display: "flex",
      flexDirection: "column",
      background: "var(--white)",
      border: "1px solid var(--border-divider)",
      borderRight: 0,
      padding: "6px 0",
      borderRadius: "var(--radius-panel) 0 0 var(--radius-panel)",
      overflow: "hidden",
      ...style
    }
  }, rest), tabs.map(t => {
    const on = t.id === active;
    return /*#__PURE__*/React.createElement("div", {
      key: t.id,
      onClick: onSelect ? () => onSelect(t.id) : undefined,
      onMouseEnter: e => {
        if (!on) e.currentTarget.style.background = "var(--surface-row-hover)";
      },
      onMouseLeave: e => {
        if (!on) e.currentTarget.style.background = "var(--white)";
      },
      style: {
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "12px 12px 12px 13px",
        margin: "0 6px 3px",
        borderRadius: "var(--radius-chip)",
        fontSize: "var(--fs-base)",
        fontWeight: "var(--fw-semibold)",
        letterSpacing: "var(--ls-nav)",
        cursor: "pointer",
        transition: "background var(--dur-base)",
        background: on ? "var(--nav)" : "var(--white)",
        color: on ? "var(--text-invert)" : "var(--nav)"
      }
    }, t.icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: t.icon,
      size: 19,
      color: on ? "var(--white)" : "#7395B3",
      style: {
        width: 20,
        textAlign: "center"
      }
    }) : null, /*#__PURE__*/React.createElement("span", null, t.label), t.flagged ? /*#__PURE__*/React.createElement("span", {
      title: "Required fields missing",
      style: {
        marginLeft: "auto",
        flexShrink: 0,
        width: 8,
        height: 8,
        borderRadius: "var(--radius-round)",
        background: "var(--fatal-text)"
      }
    }) : null);
  }));
}
Object.assign(__ds_scope, { SideTabRail });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SideTabRail.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TopNav.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Fixed navy application bar, 60px tall. Always present. */
function TopNav({
  items = [],
  active,
  tenant,
  avatarUrl,
  onNavigate,
  onMenuSelect,
  style,
  ...rest
}) {
  const [open, setOpen] = React.useState(null);
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      height: "var(--topnav-h)",
      background: "var(--nav)",
      display: "flex",
      alignItems: "center",
      padding: "0 22px",
      gap: 30,
      color: "var(--text-invert)",
      position: "relative",
      zIndex: 20,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.BrandMark, {
    variant: "white",
    height: 26
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, items.map(it => {
    const label = typeof it === "string" ? it : it.label;
    const menuItems = typeof it === "string" ? null : it.menuItems;
    const caret = typeof it === "string" ? false : !!it.menu || !!menuItems;
    const on = label === active;
    const isOpen = open === label;
    return /*#__PURE__*/React.createElement("span", {
      key: label,
      style: {
        position: "relative"
      }
    }, /*#__PURE__*/React.createElement("span", {
      onClick: () => {
        if (menuItems) setOpen(isOpen ? null : label);else if (onNavigate) onNavigate(label);
      },
      style: {
        fontSize: "var(--fs-body)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 5,
        opacity: on || isOpen ? 1 : 0.92,
        fontWeight: "var(--fw-semibold)",
        padding: "6px 12px",
        borderRadius: "var(--radius-chip)",
        background: isOpen || on ? "var(--high-emphasis)" : "transparent"
      }
    }, label, caret ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: isOpen ? "arrow_drop_up" : "arrow_drop_down",
      size: 18
    }) : null), isOpen && menuItems ? /*#__PURE__*/React.createElement(__ds_scope.NavMenu, {
      items: menuItems,
      style: {
        marginTop: 8
      },
      onSelect: l => {
        setOpen(null);
        if (onMenuSelect) onMenuSelect(label, l);
      }
    }) : null);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      display: "flex",
      alignItems: "center",
      gap: 16
    }
  }, tenant ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-body)"
    }
  }, tenant) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: "var(--radius-round)",
      background: "var(--high-emphasis)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "forum",
    size: 20,
    color: "var(--white)"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: "var(--radius-round)",
      background: avatarUrl ? "#cdd6df url(" + avatarUrl + ") center/cover" : "#cdd6df",
      border: "2px solid rgba(255,255,255,.5)"
    }
  })));
}
Object.assign(__ds_scope, { TopNav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TopNav.jsx", error: String((e && e.message) || e) }); }

// components/navigation/WorkspaceTabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** White bar under the top nav: a blue chevron naming the workspace, then flat tabs. */
function WorkspaceTabs({
  workspace,
  tabs = [],
  active,
  onSelect,
  onMenuSelect,
  style,
  ...rest
}) {
  const [open, setOpen] = React.useState(null);
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      alignItems: "stretch",
      height: "var(--wstabs-h)",
      background: "var(--white)",
      boxShadow: "var(--shadow-bar)",
      position: "relative",
      zIndex: 10,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--high-emphasis)",
      color: "var(--text-invert)",
      fontSize: "var(--fs-base)",
      display: "flex",
      alignItems: "center",
      padding: "0 28px 0 16px",
      whiteSpace: "nowrap",
      clipPath: "polygon(0 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 0 100%)"
    }
  }, workspace), tabs.map(t => {
    const label = typeof t === "string" ? t : t.label;
    const menuItems = typeof t === "string" ? null : t.menuItems;
    const caret = typeof t === "string" ? false : !!t.menu || !!menuItems;
    const on = label === active;
    const isOpen = open === label;
    return /*#__PURE__*/React.createElement("div", {
      key: label,
      onClick: () => {
        if (menuItems) setOpen(isOpen ? null : label);else if (onSelect) onSelect(label);
      },
      onMouseEnter: e => {
        if (!on && !isOpen) e.currentTarget.style.background = "#F6F9FD";
      },
      onMouseLeave: e => {
        if (!on && !isOpen) e.currentTarget.style.background = "transparent";
      },
      style: {
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 18px",
        fontSize: "var(--fs-base)",
        color: "var(--nav)",
        cursor: "pointer",
        whiteSpace: "nowrap",
        background: on ? "var(--info-bg)" : "transparent",
        fontWeight: "var(--fw-semibold)"
      }
    }, label, caret ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: isOpen ? "arrow_drop_up" : "arrow_drop_down",
      size: 19,
      color: "var(--high-emphasis)"
    }) : null, isOpen && menuItems ? /*#__PURE__*/React.createElement(__ds_scope.NavMenu, {
      items: menuItems,
      onSelect: l => {
        setOpen(null);
        if (onMenuSelect) onMenuSelect(label, l);
      }
    }) : null);
  }));
}
Object.assign(__ds_scope, { WorkspaceTabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/WorkspaceTabs.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.EyebrowLabel = __ds_scope.EyebrowLabel;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Panel = __ds_scope.Panel;

__ds_ns.Pill = __ds_scope.Pill;

__ds_ns.SectionHeading = __ds_scope.SectionHeading;

__ds_ns.StatusStepper = __ds_scope.StatusStepper;

__ds_ns.BandHeader = __ds_scope.BandHeader;

__ds_ns.BarChart = __ds_scope.BarChart;

__ds_ns.DataTable = __ds_scope.DataTable;

__ds_ns.DetailGrid = __ds_scope.DetailGrid;

__ds_ns.DonutChart = __ds_scope.DonutChart;

__ds_ns.GanttChart = __ds_scope.GanttChart;

__ds_ns.PieChart = __ds_scope.PieChart;

__ds_ns.StatCard = __ds_scope.StatCard;

__ds_ns.AIActionButton = __ds_scope.AIActionButton;

__ds_ns.CommentComposer = __ds_scope.CommentComposer;

__ds_ns.ConfirmModal = __ds_scope.ConfirmModal;

__ds_ns.InlineMessage = __ds_scope.InlineMessage;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.CheckboxGroup = __ds_scope.CheckboxGroup;

__ds_ns.DateField = __ds_scope.DateField;

__ds_ns.DropZone = __ds_scope.DropZone;

__ds_ns.Field = __ds_scope.Field;

__ds_ns.MoneyField = __ds_scope.MoneyField;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.RecordRef = __ds_scope.RecordRef;

__ds_ns.SearchSelect = __ds_scope.SearchSelect;

__ds_ns.SegmentedToggle = __ds_scope.SegmentedToggle;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.TextArea = __ds_scope.TextArea;

__ds_ns.TextField = __ds_scope.TextField;

__ds_ns.BrandMark = __ds_scope.BrandMark;

__ds_ns.FormActionBar = __ds_scope.FormActionBar;

__ds_ns.NavMenu = __ds_scope.NavMenu;

__ds_ns.PanelTabs = __ds_scope.PanelTabs;

__ds_ns.RecordHeader = __ds_scope.RecordHeader;

__ds_ns.SideTabRail = __ds_scope.SideTabRail;

__ds_ns.TopNav = __ds_scope.TopNav;

__ds_ns.WorkspaceTabs = __ds_scope.WorkspaceTabs;

})();


const DS = window.PubProDesignSystem_ea3c10;
if (DS.__errors && DS.__errors.length) console.warn("PubPro design system load errors", DS.__errors);
export const { Button, EyebrowLabel, Icon, IconButton, Panel, Pill, SectionHeading, StatusStepper, BandHeader, BarChart, DataTable, DetailGrid, DonutChart, GanttChart, PieChart, StatCard, AIActionButton, CommentComposer, ConfirmModal, InlineMessage, Tooltip, Checkbox, CheckboxGroup, DateField, DropZone, Field, MoneyField, Radio, RecordRef, SearchSelect, SegmentedToggle, Select, TextArea, TextField, BrandMark, FormActionBar, NavMenu, PanelTabs, RecordHeader, SideTabRail, TopNav, WorkspaceTabs } = DS;
export default DS;
