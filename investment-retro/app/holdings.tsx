import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Text, View } from '@/components/Themed';
import { HOLDINGS, PORTFOLIO_SUMMARY } from '@/data/portfolio';

export default function HoldingsScreen() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>我的持股</Text>
        <Text style={styles.subtitle}>共 {PORTFOLIO_SUMMARY.holdingCount} 檔</Text>
      </View>

      {/* Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>總市值</Text>
            <Text style={styles.summaryValue}>NT${PORTFOLIO_SUMMARY.totalMarketValue.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>總損益</Text>
            <Text style={styles.summaryGreen}>+NT${PORTFOLIO_SUMMARY.totalPnL.toLocaleString()}</Text>
          </View>
        </View>
      </View>

      {/* Holdings List */}
      {HOLDINGS.map((stock) => (
        <View key={stock.symbol} style={styles.stockCard}>
          <View style={styles.stockTop}>
            <View style={styles.stockLeft}>
              <Text style={styles.stockName}>{stock.name}</Text>
              <Text style={styles.stockCode}>{stock.symbol}</Text>
            </View>
            <View style={styles.stockRight}>
              <Text style={styles.stockValue}>NT${stock.marketValue.toLocaleString()}</Text>
              <Text style={styles.stockGain}>+{stock.pnlPercent}%</Text>
            </View>
          </View>
          <View style={styles.stockDetails}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>持有</Text>
              <Text style={styles.detailValue}>{stock.shares} 股</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>成本</Text>
              <Text style={styles.detailValue}>NT${stock.avgCost}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>現價</Text>
              <Text style={styles.detailValue}>NT${stock.price}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>占比</Text>
              <Text style={styles.detailValue}>{stock.weight}%</Text>
            </View>
          </View>
        </View>
      ))}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F7' },
  header: { padding: 24, paddingBottom: 12, backgroundColor: 'transparent' },
  title: { fontSize: 28, fontWeight: '600', color: '#222222' },
  subtitle: { fontSize: 14, color: '#888888', marginTop: 4 },
  summaryCard: {
    backgroundColor: '#FFFFFF', marginHorizontal: 20, marginBottom: 16,
    padding: 24, borderRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'transparent' },
  summaryItem: { backgroundColor: 'transparent' },
  summaryLabel: { fontSize: 13, color: '#888888', marginBottom: 4 },
  summaryValue: { fontSize: 22, fontWeight: '600', color: '#222222' },
  summaryGreen: { fontSize: 22, fontWeight: '600', color: '#B6C9A8' },
  stockCard: {
    backgroundColor: '#FFFFFF', marginHorizontal: 20, marginBottom: 12,
    padding: 20, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  stockTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 14, backgroundColor: 'transparent',
  },
  stockLeft: { backgroundColor: 'transparent' },
  stockRight: { alignItems: 'flex-end', backgroundColor: 'transparent' },
  stockName: { fontSize: 17, fontWeight: '500', color: '#222222' },
  stockCode: { fontSize: 13, color: '#BBBBBB', marginTop: 2 },
  stockValue: { fontSize: 16, fontWeight: '500', color: '#222222' },
  stockGain: { fontSize: 14, color: '#B6C9A8', fontWeight: '500', marginTop: 2 },
  stockDetails: {
    flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'transparent',
    paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F4F1ED',
  },
  detailItem: { alignItems: 'center', backgroundColor: 'transparent' },
  detailLabel: { fontSize: 11, color: '#BBBBBB', marginBottom: 4 },
  detailValue: { fontSize: 13, color: '#555555', fontWeight: '500' },
  bottomPadding: { height: 40, backgroundColor: 'transparent' },
});
