import React, { useEffect } from 'react';
import { DimensionValue, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

interface ShimmerBlockProps {
    width?: DimensionValue;
    height?: DimensionValue;
    borderRadius?: number;
    style?: ViewStyle;
}

export const ShimmerBlock: React.FC<ShimmerBlockProps> = ({
    width = '100%',
    height = 20,
    borderRadius = 8,
    style,
}) => {
    const opacity = useSharedValue(0.3);

    useEffect(() => {
        opacity.value = withRepeat(
            withTiming(0.8, { duration: 800 }),
            -1,
            true
        );
    }, [opacity]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            style={[
                styles.base,
                { width, height, borderRadius },
                animatedStyle,
                style,
            ]}
        />
    );
};

const styles = StyleSheet.create({
    base: {
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
    },
});
