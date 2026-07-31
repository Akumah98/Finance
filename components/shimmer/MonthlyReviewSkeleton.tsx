import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ShimmerBlock } from './ShimmerBlock';

export const MonthlyReviewSkeleton: React.FC = () => {
    return (
        <View style={styles.container}>
            {/* Hero Grade Banner Skeleton */}
            <View style={styles.heroCard}>
                <ShimmerBlock width={100} height={100} borderRadius={50} style={styles.mb16} />
                <ShimmerBlock width={160} height={22} borderRadius={6} style={styles.mb8} />
                <ShimmerBlock width={220} height={14} borderRadius={4} />
            </View>

            {/* Chart Block Skeleton */}
            <View style={styles.chartCard}>
                <ShimmerBlock width={140} height={16} borderRadius={4} style={styles.mb16} />
                <ShimmerBlock width="100%" height={160} borderRadius={12} />
            </View>

            {/* Breakdown Cards Skeleton */}
            <View style={styles.rowGap}>
                <View style={styles.flexCard}>
                    <ShimmerBlock width={80} height={14} borderRadius={4} style={styles.mb8} />
                    <ShimmerBlock width={100} height={22} borderRadius={6} />
                </View>
                <View style={styles.flexCard}>
                    <ShimmerBlock width={80} height={14} borderRadius={4} style={styles.mb8} />
                    <ShimmerBlock width={100} height={22} borderRadius={6} />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    mb8: {
        marginBottom: 8,
    },
    mb16: {
        marginBottom: 16,
    },
    heroCard: {
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
    },
    chartCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 18,
        padding: 18,
        marginBottom: 20,
    },
    rowGap: {
        flexDirection: 'row',
        gap: 12,
    },
    flexCard: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 16,
    },
});
