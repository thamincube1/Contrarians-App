"use client";

import { STAFF } from "@/lib/store";
import Tag from "@/components/ui/Tag";

export default function Staff() {
  return (
    <div className="p-4">
      <div className="surface">
        <table className="table">
          <thead>
            <tr style={{ background: "#eae9e9" }}>
              <th className="pl-[22px]">Name</th>
              <th>Role</th>
              <th>Assigned properties</th>
              <th>Can close tickets</th>
              <th className="pr-[22px]">Last active</th>
            </tr>
          </thead>
          <tbody>
            {STAFF.map((s) => (
              <tr key={s.name}>
                <td className="pl-[22px] font-extrabold">{s.name}</td>
                <td>
                  <Tag
                    label={s.role}
                    bg={s.role === "Landlord" ? "#ec3013" : "#d7d3d3"}
                    fg={s.role === "Landlord" ? "#f3f2f2" : "#444141"}
                  />
                </td>
                <td style={{ color: "#444141" }}>{s.props}</td>
                <td style={{ color: "#444141" }}>{s.canClose}</td>
                <td className="tabnum pr-[22px]" style={{ color: "#605d5d" }}>{s.active}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="py-5 pb-[30px] max-w-[44em] text-[13px]" style={{ color: "#444141" }}>
        A caretaker sees only the properties assigned here — enforced by a row-level security policy in Postgres, not by hiding menu items. Financial columns, rent, invoices and electricity costs are not returned to their session at all.
      </div>
    </div>
  );
}
