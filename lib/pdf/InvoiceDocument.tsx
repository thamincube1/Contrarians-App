import "server-only";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { colors, styles } from "./theme";
import { formatR } from "../format";

export interface InvoiceLineItem {
  label: string;
  amount: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  tenantName: string;
  unitLabel: string;
  propertyName: string;
  billingMonth: string;
  issueDate: string;
  dueDate: string;
  lineItems: InvoiceLineItem[];
  total: number;
}

export function InvoiceDocument({ data }: { data: InvoiceData }) {
  return (
    <Document title={`Invoice ${data.invoiceNumber} — ${data.tenantName}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.brandRow}>
          <View>
            <Text style={styles.brandMark}>HAUSWERK</Text>
            <Text style={styles.brandSub}>Internal ops · {data.propertyName}</Text>
          </View>
          <View style={styles.docMeta}>
            <Text style={styles.eyebrow}>{data.invoiceNumber}</Text>
            <Text style={styles.title}>Invoice</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Billed to</Text>
            <Text style={styles.rowValue}>{data.tenantName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Unit</Text>
            <Text style={styles.rowValue}>
              {data.unitLabel} · {data.propertyName}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Billing month</Text>
            <Text style={styles.rowValue}>{data.billingMonth}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Issue date</Text>
            <Text style={styles.rowValue}>{data.issueDate}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Due date</Text>
            <Text style={styles.rowValue}>{data.dueDate}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Line items</Text>
          {data.lineItems.map((item, i) => (
            <View style={styles.row} key={i}>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Text style={styles.rowValue}>{formatR(item.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total due</Text>
          <Text style={[styles.totalValue, { color: colors.accent }]}>{formatR(data.total)}</Text>
        </View>

        <Text style={styles.footer}>
          HAUSWERK Internal Ops · This is a system-generated invoice and does not require a signature. Prepaid
          electricity is billed separately at the meter.
        </Text>
      </Page>
    </Document>
  );
}
