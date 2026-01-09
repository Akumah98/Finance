import { colors } from '@/constants/colors';
import { BlurView } from 'expo-blur'; // Install: expo install expo-blur
import { LinearGradient } from 'expo-linear-gradient'; // Install: expo install expo-linear-gradient
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    id: 1,
    title: 'Track Your\nExpenses',
    subtitle: 'Every Transaction Tells a Story',
    description: 'Gain clarity on your spending habits and see where every dollar goes. Your financial journey starts here.',
    gradient: [colors.gradient1, colors.gradient2] as [string, string],
    particles: 40,
  },
  {
    id: 2,
    title: 'Make It\nCount',
    subtitle: 'Smart Budgeting, Simplified',
    description: 'Set goals, create budgets, and receive intelligent insights to help you save more and spend smarter.',
    gradient: [colors.gradient1, colors.gradient2] as [string, string],
    particles: 35,
  },
  {
    id: 3,
    title: 'Track Today,\nTransform Your Future',
    subtitle: 'Your Financial Story',
    description: 'Build a stronger financial future by understanding your past. Every transaction is a step toward your goals.',
    gradient: [colors.gradient1, colors.gradient2] as [string, string],
    particles: 50,
  },
];

interface ParticleProps {
  delay: number;
  duration: number;
  maxX: number;
  maxY: number;
}

const Particle: React.FC<ParticleProps> = ({ delay, duration, maxX, maxY }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: Math.random() * 0.6 + 0.2,
              duration: 1000,
              delay: delay,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(translateX, {
            toValue: (Math.random() - 0.5) * maxX,
            duration: duration,
            delay: delay,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: (Math.random() - 0.5) * maxY,
            duration: duration,
            delay: delay,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(scale, {
              toValue: Math.random() * 1.5 + 0.5,
              duration: duration / 2,
              delay: delay,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: Math.random() * 1.5 + 0.5,
              duration: duration / 2,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    };
    animate();
  }, []);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          opacity,
          transform: [
            { translateX },
            { translateY },
            { scale },
          ],
        },
      ]}
    />
  );
};

const Onboarding = () => {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0.9)).current;
  const orbAnimation1 = useRef(new Animated.Value(0)).current;
  const orbAnimation2 = useRef(new Animated.Value(0)).current;
  const orbAnimation3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.stagger(150, [
      Animated.parallel([
        Animated.spring(fadeAnim, {
          toValue: 1,
          tension: 20,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 20,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 20,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        tension: 15,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous orb animations
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(orbAnimation1, {
            toValue: 1,
            duration: 4000,
            useNativeDriver: true,
          }),
          Animated.timing(orbAnimation1, {
            toValue: 0,
            duration: 4000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(orbAnimation2, {
            toValue: 1,
            duration: 5000,
            useNativeDriver: true,
          }),
          Animated.timing(orbAnimation2, {
            toValue: 0,
            duration: 5000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(orbAnimation3, {
            toValue: 1,
            duration: 6000,
            useNativeDriver: true,
          }),
          Animated.timing(orbAnimation3, {
            toValue: 0,
            duration: 6000,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -30,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentIndex(currentIndex + 1);
        fadeAnim.setValue(0);
        slideAnim.setValue(50);
        titleOpacity.setValue(0);
        contentOpacity.setValue(0);
        scaleAnim.setValue(0.8);
      });
    }
  };

  const currentSlide = slides[currentIndex];

  // Handle viewable items changes for the FlatList
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: { index: number }[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== undefined) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const orb1TranslateY = orbAnimation1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -100],
  });

  const orb2TranslateX = orbAnimation2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 80],
  });

  const orb3Scale = orbAnimation3.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Animated gradient background */}
      <LinearGradient
        colors={[colors.bg, '#0F172A']}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating orbs with animations */}
      <Animated.View
        style={[
          styles.orb,
          styles.orb1,
          {
            transform: [{ translateY: orb1TranslateY }],
          },
        ]}
      >
        <LinearGradient
          colors={[currentSlide.gradient[0] + '40', currentSlide.gradient[1] + '20']}
          style={styles.orbGradient}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.orb,
          styles.orb2,
          {
            transform: [{ translateX: orb2TranslateX }],
          },
        ]}
      >
        <LinearGradient
          colors={[currentSlide.gradient[1] + '40', currentSlide.gradient[0] + '20']}
          style={styles.orbGradient}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.orb,
          styles.orb3,
          {
            transform: [{ scale: orb3Scale }],
          },
        ]}
      >
        <LinearGradient
          colors={[currentSlide.gradient[0] + '30', 'transparent']}
          style={styles.orbGradient}
        />
      </Animated.View>

      {/* Particles */}
      <View style={styles.particleContainer}>
        {[...Array(currentSlide.particles)].map((_, i) => (
          <Particle
            key={`particle-${currentIndex}-${i}`}
            delay={i * 100}
            duration={3000 + Math.random() * 2000}
            maxX={width}
            maxY={height * 0.6}
          />
        ))}
      </View>

      {/* Main content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        {/* Subtitle badge */}
        <Animated.View style={[styles.badge, { opacity: titleOpacity }]}>
          <BlurView intensity={20} tint="light" style={styles.badgeBlur}>
            <LinearGradient
              colors={[currentSlide.gradient[0] + '30', currentSlide.gradient[1] + '30']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.badgeGradient}
            >
              <Text style={styles.badgeText}>{currentSlide.subtitle.toUpperCase()}</Text>
            </LinearGradient>
          </BlurView>
        </Animated.View>

        {/* Main title */}
        <Animated.Text
          style={[
            styles.title,
            {
              opacity: titleOpacity,
              transform: [
                {
                  translateY: titleOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {currentSlide.title}
        </Animated.Text>

        {/* Glass card with description */}
        <Animated.View
          style={[
            styles.glassCard,
            {
              opacity: contentOpacity,
              transform: [
                {
                  translateY: contentOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [40, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <BlurView intensity={30} tint="dark" style={styles.cardBlur}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              <Text style={styles.description}>{currentSlide.description}</Text>
              
              {/* Feature highlights */}
              <View style={styles.features}>
                {['Premium Design', 'Smart AI', 'Cloud Sync'].map((feature, i) => (
                  <View key={i} style={styles.featureItem}>
                    <View style={[styles.featureDot, { backgroundColor: colors.primary }]} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          </BlurView>
        </Animated.View>

        {/* Pagination with progress */}
        <View style={styles.pagination}>
          {slides.map((_, index) => {
            const isActive = index === currentIndex;
            return (
              <TouchableOpacity 
                key={index} 
                style={styles.paginationDot}
                onPress={() => {
                  flatListRef.current?.scrollToIndex({
                    index,
                    animated: true,
                  });
                  setCurrentIndex(index);
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.dotOuter,
                    isActive && { borderColor: currentSlide.gradient[0] },
                  ]}
                >
                  {isActive && (
                    <LinearGradient
                      colors={currentSlide.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.dotInner}
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>

      {/* Action buttons */}
      <Animated.View
        style={[
          styles.actions,
          {
            opacity: buttonScale,
            transform: [{ scale: buttonScale }],
          },
        ]}
      >
        {currentIndex < slides.length - 1 ? (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.skipButton}
              activeOpacity={0.8}
              onPress={() => console.log('Skip')}
            >
              <BlurView intensity={10} tint="dark" style={styles.skipBlur}>
                <Text style={styles.skipText}>Skip</Text>
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.nextButton}
              activeOpacity={0.9}
              onPress={handleNext}
            >
              <LinearGradient
                colors={currentSlide.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.nextGradient}
              >
                <Text style={styles.nextText}>Continue</Text>
                <View style={styles.arrow}>
                  <Text style={styles.arrowText}>→</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.getStartedButton}
            activeOpacity={0.9}
            onPress={() => router.push('/(auth)/login')}
          >
            <LinearGradient
              colors={currentSlide.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.getStartedGradient}
            >
              <Text style={styles.getStartedText}>Launch Experience</Text>
              <View style={styles.sparkle}>
                <Text style={styles.sparkleText}>✨</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
};

export default Onboarding;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  orb: {
    position: 'absolute',
    borderRadius: 9999,
  },
  orb1: {
    width: 400,
    height: 400,
    top: -150,
    right: -100,
  },
  orb2: {
    width: 350,
    height: 350,
    bottom: -100,
    left: -100,
  },
  orb3: {
    width: 300,
    height: 300,
    top: height * 0.3,
    right: -150,
  },
  orbGradient: {
    flex: 1,
    borderRadius: 9999,
  },
  particleContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    top: height * 0.3,
    left: width / 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    marginBottom: Platform.select({
      ios: 0,
      android: -20,
    }),
  },
  badge: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  badgeBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  badgeGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  badgeText: {
    color: colors.text,
    fontSize: Platform.select({
      ios: 13,
      android: 10,
    }),
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: Platform.select({
      ios: 56,
      android: 40,
    }),
    fontWeight: '900',
    color: colors.text,
    marginBottom: 40,
    lineHeight: Platform.select({
      ios: 64,
      android: 50,
    }),
    letterSpacing: -2,
  },
  glassCard: {
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: Platform.select({
      ios: 40,
      android: 20, // Reduced for Android
    }),
  },
  cardBlur: {
    borderRadius: 32,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 32,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  description: {
    fontSize: Platform.select({
      ios: 17,
      android: 12,
    }),
    color: colors.textSecondary,
    lineHeight: 28,
    marginBottom: 24,
    fontWeight: '400',
  },
  features: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  featureText: {
    fontSize: Platform.select({
      ios: 14,
      android: 9,
    }),
    color: colors.text,
    fontWeight: '600',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: Platform.OS === 'android' ? 10 : 20,
  },
  paginationDot: {
    padding: 4,
  },
  dotOuter: {
    width: 40,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  dotInner: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  actions: {
    paddingHorizontal: 24,
    paddingBottom: Platform.select({
      ios: 50,
      android: 80,
    }),
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  skipButton: {
    flex: 1,
    height: Platform.select({
      ios: 64,
      android: 56,
    }),
    borderRadius: Platform.select({
      ios: 32,
      android: 28,
    }),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  skipBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipText: {
    color: colors.text,
    fontSize: Platform.select({
      ios: 17,
      android: 16,
    }),
    fontWeight: '700',
  },
  nextButton: {
    flex: 2,
    height: Platform.select({
      ios: 64,
      android: 56,
    }),
    borderRadius: Platform.select({
      ios: 32,
      android: 28,
    }),
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  nextGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  nextText: {
    color: colors.text,
    fontSize: Platform.select({
      ios: 17,
      android: 16,
    }),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  arrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: Platform.select({
      ios: 18,
      android: 22, // Increased font size for better visibility on Android
    }),
    fontWeight: '700',
    color: colors.text,
    includeFontPadding: false,
    top: Platform.OS === 'android' ? -4 : 0,
  },
  getStartedButton: {
    height: Platform.select({
      ios: 68,
      android: 60,
    }),
    borderRadius: Platform.select({
      ios: 34,
      android: 30,
    }),
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 32,
    elevation: 16,
  },
  getStartedGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  getStartedText: {
    color: colors.text,
    fontSize: Platform.select({
      ios: 19,
      android: 17,
    }),
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sparkle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkleText: {
    fontSize: Platform.select({
      ios: 20,
      android: 18,
    }),
  },
});