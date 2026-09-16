import "server-only";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { colors, styles } from "./theme";
import { formatR } from "../format";

export interface StatementPayment {
  date: string;
  amount: number;
}

export interface StatementData {
  tenantName: string;
  unitLabel: string;
  propertyName: string;
  phone: string;
  generatedOn: string;
  moveIn: string;
  leaseEnd: string;
  monthlyRent: number;
  depositHeld: number;
  balance: number;
  graceDays: number;
  lateFee: number;
  payments: StatementPayment[];
}

/**
 * Doubles as the letter-of-demand attachment (`variant: "demand"`) — same
 * ledger data, a sterner heading and an intro paragraph instead of the
 * plain statement's. Keeping one template avoids two documents drifting
 * out of sync on numbers that must always match.
 */
export function StatementDocument({ data, variant = "statement" }: { data: StatementData; variant?: "statement" | "demand" }) {
  const isDemand = variant === "demand";

  return (
    <Document title={`${isDemand ? "Letter of demand" : "Statement"} — ${data.tenantName}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.brandRow}>
          <View>
            <Text style={styles.brandMark}>HAUSWERK</Text>
            <Text style={styles.brandSub}>Internal ops · {data.propertyName}</Text>
          </View>
          <View style={styles.docMeta}>
            <Text style={styles.eyebrow}>Generated {data.generatedOn}</Text>
            <Text style={[styles.title, isDemand ? { color: colors.accentDark } : undefined]}>
              {isDemand ? "Letter of demand" : "Tenant statement"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tenant</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Name</Text>
            <Text style={styles.rowValue}>{data.tenantName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Unit</Text>
            <Text style={styles.rowValue}>
              {data.unitLabel} · {data.propertyName}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Phone</Text>
            <Text style={styles.rowValue}>{data.phone}</Text>
          </View>
        </View>

        {isDemand && (
          <View style={styles.section}>
            <Text style={styles.paragraph}>
              This letter formally demands settlement of the overdue balance shown below within {data.graceDays} days
              of the date of this letter. A late fee of {formatR(data.lateFee)} applies once the grace period has
              passed and may already be reflected in the balance. Please contact the office immediately to arrange
              payment or discuss a repayment plan.
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lease terms</Text>
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
          <Text style={styles.sectionTitle}>Payments received</Text>
          {data.payments.length === 0 ? (
            <Text style={styles.paragraph}>No payments on file yet.</Text>
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
          <Text style={[styles.totalLabel, data.balance > 0 ? { color: colors.accentDark } : undefined]}>
            {data.balance > 0 ? "Amount overdue" : "Current balance"}
          </Text>
          <Text style={[styles.totalValue, data.balance > 0 ? { color: colors.accentDark } : undefined]}>
            {formatR(data.balance)}
          </Text>
        </View>

        <Text style={styles.footer}>
          HAUSWERK Internal Ops · This is a system-generated {isDemand ? "letter of demand" : "statement"} and does
          not require a signature.
        </Text>
      </Page>
    </Document>
  );
}
