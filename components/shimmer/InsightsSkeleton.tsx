import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ShimmerBlock } from './ShimmerBlock';

export const InsightsSkeleton: React.FC = () => {
    return (
        <View style={styles.container}>
            {/* Health Score Ring Skeleton */}
            <View style={styles.scoreCard}>
                <ShimmerBlock width={120} height={120} borderRadius={60} style={styles.mb16} />
                <ShimmerBlock width={140} height={20} borderRadius={6} style={styles.mb8} />
                <ShimmerBlock width={220} height={14} borderRadius={4} />
            </View>

            {/* AI Summary Banner Skeleton */}
            <View style={styles.summaryCard}>
                <ShimmerBlock width={160} height={18} borderRadius={4} style={styles.mb12} />
                <ShimmerBlock width="100%" height={14} borderRadius={4} style={styles.mb8} />
                <ShimmerBlock width="90%" height={14} borderRadius={4} />
            </View>

            {/* Recommendations Skeleton */}
            <View style={styles.sectionHeader}>
                <ShimmerBlock width={150} height={18} borderRadius={4} />
            </View>
            {[1, 2, 3].map((i) => (
                <View key={i} style={styles.recCard}>
                    <ShimmerBlock width={36} height={36} borderRadius={18} />
                    <View style={styles.recDetails}>
                        <ShimmerBlock width="95%" height={14} borderRadius={4} style={styles.mb6} />
                        <ShimmerBlock width="60%" height={12} borderRadius={4} />
                    </View>
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
    mb8: {
        marginBottom: 8,
    },
    mb12: {
        marginBottom: 12,
    },
    mb16: {
        marginBottom: 16,
    },
    scoreCard: {
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
    },
    summaryCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
    },
    sectionHeader: {
        marginBottom: 14,
    },
    recCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
    },
    recDetails: {
        marginLeft: 12,
        flex: 1,
    },
});
