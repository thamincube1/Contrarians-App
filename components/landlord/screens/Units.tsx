"use client";

import { useApp, useDerived } from "@/lib/store";
import Tag from "@/components/ui/Tag";

const FILTERS = ["All units", "Vacant", "In arrears", "On notice"];

export default function Units() {
  const { state, R, setQuery, setFilter, openTenant } = useApp();
  const { all, vacantOf, balanceOf } = useDerived();

  let rows = all;
  if (state.filter === "Vacant") rows = rows.filter((u) => vacantOf(u));
  if (state.filter === "In arrears") rows = rows.filter((u) => !vacantOf(u) && balanceOf(u) > 0);
  if (state.filter === "On notice") rows = rows.filter((u) => u.notice);
  const q = state.query.trim().toLowerCase();
  if (q) rows = rows.filter((u) => `${u.label} ${u.tenant || "vacant"} ${u.property}`.toLowerCase().includes(q));
  const shown = rows.slice(0, 14);

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap p-4">
        <input
          value={state.query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search unit or tenant"
          className="input"
          style={{ minWidth: 260, width: "auto", background: "#f8f4f4" }}
        />
        <div className="segmented">
          {FILTERS.map((f) => {
            const active = state.filter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className="btn seg-btn text-[13px] px-[13px] py-2"
                style={{
                  background: active ? "#201e1d" : "transparent",
                  color: active ? "#f3f2f2" : "#201e1d",
                }}
              >
                {f}
              </button>
            );
          })}
        </div>
        <div className="tabnum ml-auto text-[13px]" style={{ color: "#605d5d" }}>
          {rows.length} of {all.length} units
        </div>
      </div>
      <div className="surface mx-4">
        <table className="table">
          <thead>
            <tr style={{ background: "#eae9e9" }}>
              <th className="pl-[22px]">Unit</th>
              <th>Property</th>
              <th>Tenant</th>
              <th className="text-right">Rent</th>
              <th className="text-right">Balance</th>
              <th className="pr-[22px]">Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((u) => {
              const vac = vacantOf(u);
              const b = vac ? 0 : balanceOf(u);
              const status = vac ? "Vacant" : u.notice ? "On notice" : b > 0 ? "In arrears" : "Occupied";
              const tagBg = vac ? "#ec3013" : b > 0 ? "#ffc4b8" : "#eae9e9";
              const tagFg = vac ? "#f3f2f2" : b > 0 ? "#7c1405" : "#444141";
              return (
                <tr
                  key={u.id}
                  className="cursor-pointer"
                  onClick={() => (vac ? undefined : openTenant(u.id))}
                >
                  <td className="tabnum pl-[22px] font-extrabold">{u.label}</td>
                  <td style={{ color: "#605d5d" }}>{u.property}</td>
                  <td className="font-semibold" style={{ color: vac ? "#9b9797" : "#201e1d" }}>
                    {vac ? "— vacant —" : u.tenant}
                  </td>
                  <td className="tabnum text-right">{R(u.rent)}</td>
                  <td className="tabnum text-right font-extrabold" style={{ color: b > 0 ? "#ae1800" : "#9b9797" }}>
                    {vac ? "—" : b > 0 ? R(b) : "—"}
                  </td>
                  <td className="pr-[22px]">
                    <Tag label={status} bg={tagBg} fg={tagFg} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="py-4 px-[22px] pb-[30px] text-xs" style={{ color: "#605d5d" }}>
        {shown.length < rows.length
          ? `Showing ${shown.length} of ${rows.length} — the real table pages server-side.`
          : "End of results."}
      </div>
    </div>
  );
}
