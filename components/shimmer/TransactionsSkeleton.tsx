import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ShimmerBlock } from './ShimmerBlock';

export const TransactionsSkeleton: React.FC = () => {
    return (
        <View style={styles.container}>
            {/* Search Bar Skeleton */}
            <ShimmerBlock width="100%" height={48} borderRadius={14} style={styles.mb16} />

            {/* Filter Pills Skeleton */}
            <View style={styles.filterRow}>
                <ShimmerBlock width={70} height={32} borderRadius={16} />
                <ShimmerBlock width={80} height={32} borderRadius={16} />
                <ShimmerBlock width={80} height={32} borderRadius={16} />
            </View>

            {/* Transaction Item List Skeleton */}
            {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={styles.txRow}>
                    <ShimmerBlock width={46} height={46} borderRadius={14} />
                    <View style={styles.txDetails}>
                        <ShimmerBlock width={140} height={16} borderRadius={4} style={styles.mb6} />
                        <ShimmerBlock width={100} height={12} borderRadius={4} />
                    </View>
                    <ShimmerBlock width={75} height={18} borderRadius={6} />
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    mb6: {
        marginBottom: 6,
    },
    mb16: {
        marginBottom: 16,
    },
    filterRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    txRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
    },
    txDetails: {
        marginLeft: 12,
        flex: 1,
    },
});
