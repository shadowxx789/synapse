import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';

interface DopaminePopProps {
    trigger: boolean;
    onComplete?: () => void;
}

const { width, height } = Dimensions.get('window');

export default function DopaminePop({ trigger, onComplete }: DopaminePopProps) {
    const confettiRef = useRef<ConfettiCannon>(null);
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (trigger) {
            // Trigger haptic feedback
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Shoot confetti
            confettiRef.current?.start();

            // Animate the success circle
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 4,
                    tension: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                // Fade out after delay
                setTimeout(() => {
                    Animated.parallel([
                        Animated.timing(scaleAnim, {
                            toValue: 0,
                            duration: 300,
                            useNativeDriver: true,
                        }),
                        Animated.timing(opacityAnim, {
                            toValue: 0,
                            duration: 300,
                            useNativeDriver: true,
                        }),
                    ]).start(() => {
                        onComplete?.();
                    });
                }, 1500);
            });
        }
    }, [trigger]);

    if (!trigger) return null;

    return (
        <View style={styles.container} pointerEvents="none">
            {/* Success circle animation */}
            <Animated.View
                style={[
                    styles.successCircle,
                    {
                        transform: [{ scale: scaleAnim }],
                        opacity: opacityAnim,
                    }
                ]}
            >
                <Animated.Text
                    style={[
                        styles.checkmark,
                        { transform: [{ scale: scaleAnim }] }
                    ]}
                >
                    ✓
                </Animated.Text>
            </Animated.View>

            {/* Confetti */}
            <ConfettiCannon
                ref={confettiRef}
                count={80}
                origin={{ x: width / 2, y: height }}
                fadeOut
                autoStart={false}
                colors={[
                    Colors.primary,
                    Colors.secondary,
                    Colors.energyGlow,
                    '#FF6B8A',
                    '#A855F7',
                ]}
                explosionSpeed={350}
                fallSpeed={3000}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    successCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: Colors.success,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.success,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
        elevation: 10,
    },
    checkmark: {
        fontSize: 60,
        color: '#FFF',
        fontWeight: '700',
    },
});
