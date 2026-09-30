import type { KeyValue } from "../types";

interface Props {
  rows: KeyValue[];
  onChange: (rows: KeyValue[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export default function KeyValueEditor({
  rows,
  onChange,
  keyPlaceholder = "key",
  valuePlaceholder = "value",
}: Props) {
  const update = (i: number, patch: Partial<KeyValue>) => {
    const next = rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    onChange(next);
  };

  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));

  const add = () =>
    onChange([...rows, { key: "", value: "", enabled: true }]);

  return (
    <div className="kv-editor">
      <div className="kv-head">
        <span className="kv-check" />
        <span>Key</span>
        <span>Value</span>
        <span />
      </div>
      {rows.map((row, i) => (
        <div className="kv-row" key={i}>
          <input
            type="checkbox"
            className="kv-check"
            checked={row.enabled}
            onChange={(e) => update(i, { enabled: e.target.checked })}
          />
          <input
            className="kv-input"
            value={row.key}
            placeholder={keyPlaceholder}
            onChange={(e) => update(i, { key: e.target.value })}
          />
          <input
            className="kv-input"
            value={row.value}
            placeholder={valuePlaceholder}
            onChange={(e) => update(i, { value: e.target.value })}
          />
          <button
            className="icon-btn"
            title="Remove"
            onClick={() => remove(i)}
          >
            ×
          </button>
        </div>
      ))}
      <button className="add-row" onClick={add}>
        + Add
      </button>
    </div>
  );
}
