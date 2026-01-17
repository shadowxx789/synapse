import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, Animated as RNAnimated } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Colors, FontSizes, Spacing } from '@/constants/Colors';

// ADHD治愈性名言警句
const ADHD_QUOTES = [
    {
        text: '你的大脑不是坏掉了，只是运作方式与众不同',
        author: '——写给 ADHD 的你',
    },
    {
        text: '每一个小小的完成，都值得庆祝',
        author: '——相信进步的力量',
    },
    {
        text: '专注不是意志力的问题，而是大脑的特性',
        author: '——接纳自己',
    },
    {
        text: '你不需要"治愈"，你需要的是理解和支持',
        author: '——拥抱多样性',
    },
    {
        text: '拖延不是懒惰，而是大脑在保护你免受焦虑',
        author: '——温柔对待自己',
    },
    {
        text: '分心是你的超能力换档的瞬间',
        author: '——看到不同的可能',
    },
    {
        text: '小步前进也是前进，别因为没走完整条路而否定自己',
        author: '——珍惜每一步',
    },
    {
        text: '你的价值不由效率决定',
        author: '——你本身就足够好',
    },
    {
        text: '有时候，休息就是最好的进步',
        author: '——学会暂停',
    },
    {
        text: 'ADHD 让你看到别人看不到的联系',
        author: '——这是礼物，不是诅咒',
    },
    {
        text: '你的努力不会因为看不见而不存在',
        author: '——隐形的战斗同样勇敢',
    },
    {
        text: '完美是陷阱，完成才是目标',
        author: '——拥抱 80% 就够了',
    },
    {
        text: '你需要的不是更努力，而是更聪明的方法',
        author: '——工具比意志力更重要',
    },
    {
        text: '忘记不是失败，是大脑在优先处理更重要的事',
        author: '——善用外部记忆',
    },
    {
        text: '你的创造力和 ADHD 是同一枚硬币的两面',
        author: '——接纳全部的自己',
    },
];

interface SplashQuoteProps {
    onComplete: () => void;
    duration?: number;
}

export default function SplashQuote({ onComplete, duration = 3000 }: SplashQuoteProps) {
    const [quote] = useState(() => {
        const randomIndex = Math.floor(Math.random() * ADHD_QUOTES.length);
        return ADHD_QUOTES[randomIndex];
    });

    // For web: use React Native's built-in Animated for more reliable behavior
    const [webOpacity] = useState(() => new RNAnimated.Value(0));

    useEffect(() => {
        // Fade in animation for web
        if (Platform.OS === 'web') {
            RNAnimated.timing(webOpacity, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }).start();
        }

        const timer = setTimeout(() => {
            if (Platform.OS === 'web') {
                // Fade out before completing
                RNAnimated.timing(webOpacity, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                }).start(() => onComplete());
            } else {
                onComplete();
            }
        }, duration - 400); // Subtract fade-out time

        return () => clearTimeout(timer);
    }, [duration, onComplete, webOpacity]);

    const content = (
        <View style={styles.content}>
            <Text style={styles.logo}>✨</Text>
            <Text style={styles.appName}>Synapse</Text>
            <View style={styles.quoteContainer}>
                <Text style={styles.quoteText}>{quote.text}</Text>
                <Text style={styles.quoteAuthor}>{quote.author}</Text>
            </View>
        </View>
    );

    // Use different animation approach for web vs native
    if (Platform.OS === 'web') {
        return (
            <RNAnimated.View style={[styles.container, { opacity: webOpacity }]}>
                {content}
            </RNAnimated.View>
        );
    }

    return (
        <Animated.View
            style={styles.container}
            entering={FadeIn.duration(600)}
            exiting={FadeOut.duration(600)}
        >
            {content}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    content: {
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        maxWidth: 480,
    },
    logo: {
        fontSize: 64,
        marginBottom: Spacing.md,
    },
    appName: {
        fontSize: FontSizes.hero,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.xxl,
        letterSpacing: 2,
    },
    quoteContainer: {
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
    },
    quoteText: {
        fontSize: FontSizes.lg,
        color: Colors.textPrimary,
        textAlign: 'center',
        lineHeight: FontSizes.lg * 1.5,
        marginBottom: Spacing.md,
        fontWeight: '500',
    },
    quoteAuthor: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        textAlign: 'center',
        fontStyle: 'italic',
    },
});
