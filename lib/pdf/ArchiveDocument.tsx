import "server-only";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { colors, styles } from "./theme";
import { formatR } from "../format";

export interface ArchiveChecklistItem {
  label: string;
  ok: boolean;
  note: string | null;
}

export interface ArchiveMoveOutInspection {
  ref: string;
  condition: string;
  inspectedOn: string;
  photoCount: number;
  checklist: ArchiveChecklistItem[];
}

export interface ArchivePayment {
  date: string;
  amount: number;
}

export interface ArchiveData {
  tenantName: string;
  phone: string;
  unitLabel: string;
  propertyName: string;
  moveIn: string;
  leaseEnd: string;
  monthlyRent: number;
  depositHeld: number;
  finalBalance: number;
  purgeMode: "anonymise" | "hard";
  performedOn: string;
  payments: ArchivePayment[];
  moveOutInspection: ArchiveMoveOutInspection | null;
}

/**
 * The permanent record of an offboarding — generated inside
 * confirmOffboardAction (lib/actions.ts) from data gathered before the
 * tenant row is anonymised, so this PDF is the only place that final
 * ledger + move-out condition snapshot survives in human-readable form
 * once the live Tenant/Lease rows no longer carry it.
 */
export function ArchiveDocument({ data }: { data: ArchiveData }) {
  return (
    <Document title={`Offboarding archive — ${data.tenantName} — ${data.unitLabel}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.brandRow}>
          <View>
            <Text style={styles.brandMark}>HAUSWERK</Text>
            <Text style={styles.brandSub}>Internal ops · {data.propertyName}</Text>
          </View>
          <View style={styles.docMeta}>
            <Text style={styles.eyebrow}>Archived {data.performedOn}</Text>
            <Text style={styles.title}>Offboarding archive</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.paragraph}>
            {data.purgeMode === "hard"
              ? "This tenant's payment history was permanently deleted as part of a full erase. This document is the only remaining record of their final ledger position."
              : "This tenant's personal details have been anonymised in the live system. The lease and ledger remain linked for financial reporting; this document is the durable snapshot of who they were."}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tenant at time of offboarding</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Name</Text>
            <Text style={styles.rowValue}>{data.tenantName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Phone</Text>
            <Text style={styles.rowValue}>{data.phone}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Unit</Text>
            <Text style={styles.rowValue}>
              {data.unitLabel} · {data.propertyName}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Final lease &amp; ledger</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Move-in</Text>
            <Text style={styles.rowValue}>{data.moveIn}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Lease ends</Text>
            <Text style={styles.rowValue}>{data.leaseEnd}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Monthly rent</Text>
            <Text style={styles.rowValue}>{formatR(data.monthlyRent)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Deposit held</Text>
            <Text style={styles.rowValue}>{formatR(data.depositHeld)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment history</Text>
          {data.payments.length === 0 ? (
            <Text style={styles.paragraph}>No payments on file.</Text>
          ) : (
            data.payments.map((p, i) => (
              <View style={styles.row} key={i}>
                <Text style={styles.rowLabel}>{p.date}</Text>
                <Text style={styles.rowValue}>{formatR(p.amount)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, data.finalBalance > 0 ? { color: colors.accentDark } : undefined]}>
            Final balance at offboarding
          </Text>
          <Text style={[styles.totalValue, data.finalBalance > 0 ? { color: colors.accentDark } : undefined]}>
            {formatR(data.finalBalance)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Move-out inspection</Text>
          {!data.moveOutInspection ? (
            <Text style={styles.paragraph}>No move-out inspection was on file at the time of offboarding.</Text>
          ) : (
            <>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Reference</Text>
                <Text style={styles.rowValue}>{data.moveOutInspection.ref}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Inspected on</Text>
                <Text style={styles.rowValue}>{data.moveOutInspection.inspectedOn}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Condition</Text>
                <Text style={styles.rowValue}>{data.moveOutInspection.condition}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Photos on file</Text>
                <Text style={styles.rowValue}>{data.moveOutInspection.photoCount}</Text>
              </View>

              {data.moveOutInspection.checklist.length > 0 && (
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.eyebrow, { marginBottom: 4 }]}>Checklist</Text>
                  {data.moveOutInspection.checklist.map((item, i) => (
                    <View style={styles.checklistRow} key={i}>
                      <View
                        style={[styles.checklistDot, { backgroundColor: item.ok ? colors.ink : colors.accent }]}
                      />
                      <Text style={{ flex: 1 }}>{item.label}</Text>
                      {item.note && <Text style={{ color: colors.muted, fontSize: 8.5 }}>{item.note}</Text>}
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        <Text style={styles.footer}>
          HAUSWERK Internal Ops · Generated automatically as part of the offboarding transaction. Retain for
          financial and compliance record-keeping.
        </Text>
      </Page>
    </Document>
  );
}
