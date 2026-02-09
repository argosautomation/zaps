'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

/**
 * DecryptedText
 *
 * A text animation component that cycles through random characters before revealing
 * the final text, creating a "decryption" effect.
 *
 * Sourced/Adapted from: reactbits.dev
 */

interface DecryptedTextProps {
    text: string;
    speed?: number;
    maxIterations?: number;
    sequential?: boolean;
    revealDirection?: 'start' | 'end' | 'center';
    useOriginalCharsOnly?: boolean;
    characters?: string;
    className?: string;
    parentClassName?: string;
    encryptedClassName?: string;
    animateOn?: 'view' | 'hover';
    [key: string]: any;
}

export default function DecryptedText({
    text,
    speed = 50,
    maxIterations = 10,
    sequential = false,
    revealDirection = 'start',
    useOriginalCharsOnly = false,
    characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()_+',
    className = '',
    parentClassName = '',
    encryptedClassName = '',
    animateOn = 'hover',
    ...props
}: DecryptedTextProps) {
    const [displayText, setDisplayText] = useState<string>(text);
    const [isHovering, setIsHovering] = useState<boolean>(false);
    const [isScrambling, setIsScrambling] = useState<boolean>(false);
    const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (animateOn === 'view') {
            interval = setInterval(() => {
                setIsHovering(true);
                setIsScrambling(true);
                clearInterval(interval);
            }, 200); // Trigger after short delay on view
            return () => clearInterval(interval);
        }
    }, [animateOn]);

    useEffect(() => {
        if (isHovering) {
            setIsScrambling(true);
            setRevealedIndices(new Set());
        } else {
            setIsScrambling(false);
            setRevealedIndices(new Set(text.split('').map((_, i) => i)));
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isHovering, text]);

    useEffect(() => {
        if (isScrambling) {
            let iteration = 0;
            const max = maxIterations;

            intervalRef.current = setInterval(() => {
                // Determine new revealed indices based on direction and sequential flag
                if (sequential) {
                    if (revealedIndices.size < text.length) {
                        const nextIndex = getNextIndex(revealedIndices, text.length, revealDirection);
                        setRevealedIndices((prev) => new Set(prev).add(nextIndex));
                    } else {
                        setIsScrambling(false);
                        clearInterval(intervalRef.current!);
                    }
                } else {
                    // Random reveal logic
                    setRevealedIndices((prev) => {
                        const newSet = new Set(prev);
                        if (iteration < max) {
                            // During scrambling phase, reveal nothing permanently yet or just partial?
                            // Actually, for "decryption", we want all chars to scramble until they "lock" in place.
                            // But usually it locks in one by one.
                            // Let's implement a simple "lock in" probability if not sequential
                            if (Math.random() < 0.1) {
                                // Lock in a random unrevealed index
                                const unrevealed = text.split('').map((_, i) => i).filter(i => !newSet.has(i));
                                if (unrevealed.length > 0) {
                                    const idx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
                                    newSet.add(idx);
                                }
                            }
                        } else {
                            // After max iterations, force reveal all
                            setIsScrambling(false);
                            clearInterval(intervalRef.current!);
                            return new Set(text.split('').map((_, i) => i));
                        }
                        return newSet;
                    });
                }

                iteration++;

                // Scramble Display Text
                setDisplayText(
                    text
                        .split('')
                        .map((char, i) => {
                            if (char === ' ') return ' ';
                            if (revealedIndices.has(i)) return char;
                            return getScrambledChar(characters);
                        })
                        .join('')
                );

            }, speed);
        } else {
            setDisplayText(text);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isScrambling, revealedIndices, text, speed, maxIterations, sequential, revealDirection, characters]);

    // Helper to pick next index based on direction
    const getNextIndex = (revealed: Set<number>, length: number, direction: string): number => {
        const unrevealed = Array.from({ length }, (_, i) => i).filter((i) => !revealed.has(i));

        if (unrevealed.length === 0) return -1;

        if (direction === 'start') return unrevealed[0];
        if (direction === 'end') return unrevealed[unrevealed.length - 1];
        if (direction === 'center') {
            const middle = Math.floor(length / 2);
            // Find unrevealed index closest to middle
            return unrevealed.sort((a, b) => Math.abs(a - middle) - Math.abs(b - middle))[0];
        }

        return unrevealed[0];
    };

    const getScrambledChar = (chars: string) => {
        return chars[Math.floor(Math.random() * chars.length)];
    };


    const handleMouseEnter = () => {
        if (animateOn === 'hover') setIsHovering(true);
    };

    const handleMouseLeave = () => {
        if (animateOn === 'hover') setIsHovering(false);
    };

    return (
        <span
            className={`inline-block whitespace-pre-wrap ${parentClassName}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            {...props}
        >
            <span className="sr-only">{text}</span>
            <span aria-hidden="true">
                {displayText.split('').map((char, index) => {
                    const isRevealed = revealedIndices.has(index) || char === ' ';
                    return (
                        <span
                            key={index}
                            className={isRevealed ? className : encryptedClassName}
                        >
                            {char}
                        </span>
                    );
                })}
            </span>
        </span>
    );
}
