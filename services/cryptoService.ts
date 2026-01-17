/**
 * Crypto Service - AES-GCM Encryption for Couple Messages
 *
 * This service provides symmetric encryption for messages between paired users.
 * The encryption key (coupleSecret) is generated during pairing and stored locally.
 */

import { Platform } from 'react-native';

// ============================================================================
// Types
// ============================================================================

export interface EncryptedData {
    encryptedContent: string; // Base64 encoded ciphertext
    iv: string; // Base64 encoded initialization vector
}

export interface DecryptedMessageContent {
    type: MessageType;
    text?: string;
    taskId?: string;
    taskTitle?: string;
    taskDescription?: string;
    energyPoints?: number;
    mood?: string;
    timestamp?: number;
}

export type MessageType =
    | 'text'
    | 'task_request'
    | 'task_update'
    | 'energy_boost'
    | 'energy_request'
    | 'mood_share'
    | 'system';

// ============================================================================
// Base64 Utilities (Cross-platform)
// ============================================================================

const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function uint8ArrayToBase64(bytes: Uint8Array): string {
    let result = '';
    const len = bytes.length;
    for (let i = 0; i < len; i += 3) {
        const a = bytes[i];
        const b = bytes[i + 1] || 0;
        const c = bytes[i + 2] || 0;

        result += base64Chars[a >> 2];
        result += base64Chars[((a & 3) << 4) | (b >> 4)];
        result += i + 1 < len ? base64Chars[((b & 15) << 2) | (c >> 6)] : '=';
        result += i + 2 < len ? base64Chars[c & 63] : '=';
    }
    return result;
}

function base64ToUint8Array(base64: string): Uint8Array {
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
    const len = (base64.length * 3) / 4 - padding;
    const bytes = new Uint8Array(len);

    let j = 0;
    for (let i = 0; i < base64.length; i += 4) {
        const a = base64Chars.indexOf(base64[i]);
        const b = base64Chars.indexOf(base64[i + 1]);
        const c = base64Chars.indexOf(base64[i + 2]);
        const d = base64Chars.indexOf(base64[i + 3]);

        bytes[j++] = (a << 2) | (b >> 4);
        if (j < len) bytes[j++] = ((b & 15) << 4) | (c >> 2);
        if (j < len) bytes[j++] = ((c & 3) << 6) | d;
    }

    return bytes;
}

function stringToUint8Array(str: string): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(str);
}

function uint8ArrayToString(bytes: Uint8Array): string {
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
}

function hexToUint8Array(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
}

function uint8ArrayToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer;
}

// ============================================================================
// Crypto Service
// ============================================================================

export const cryptoService = {
    /**
     * Generate a random 256-bit (32 bytes) couple secret
     * This is used as the AES-GCM encryption key
     */
    generateCoupleSecret(): string {
        const bytes = new Uint8Array(32);

        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            crypto.getRandomValues(bytes);
        } else {
            // Fallback for environments without Web Crypto API
            for (let i = 0; i < 32; i++) {
                bytes[i] = Math.floor(Math.random() * 256);
            }
        }

        return uint8ArrayToHex(bytes);
    },

    /**
     * Hash the secret using SHA-256 (for storage verification in database)
     * We don't store the actual secret in database, only its hash
     */
    async hashSecret(secret: string): Promise<string> {
        const secretBytes = hexToUint8Array(secret);

        if (typeof crypto !== 'undefined' && crypto.subtle) {
            const hashBuffer = await crypto.subtle.digest('SHA-256', toArrayBuffer(secretBytes));
            return uint8ArrayToHex(new Uint8Array(hashBuffer));
        }

        // Simple fallback hash (not cryptographically secure, but works for demo)
        let hash = 0;
        for (let i = 0; i < secret.length; i++) {
            const char = secret.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(64, '0');
    },

    /**
     * Import a hex secret as a CryptoKey for AES-GCM
     */
    async importKey(secretHex: string): Promise<CryptoKey> {
        const keyBytes = hexToUint8Array(secretHex);

        return crypto.subtle.importKey(
            'raw',
            toArrayBuffer(keyBytes),
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    },

    /**
     * Encrypt a message content object using AES-GCM
     */
    async encrypt(
        content: DecryptedMessageContent,
        secretHex: string
    ): Promise<EncryptedData> {
        // Check for Web Crypto API support
        if (typeof crypto === 'undefined' || !crypto.subtle) {
            // Fallback: Simple XOR-based "encryption" (NOT secure, for demo only)
            return this.encryptFallback(content, secretHex);
        }

        try {
            const key = await this.importKey(secretHex);

            // Generate random 96-bit IV (12 bytes)
            const iv = new Uint8Array(12);
            crypto.getRandomValues(iv);
            const ivBuffer = toArrayBuffer(iv);

            // Convert content to bytes
            const contentBytes = stringToUint8Array(JSON.stringify(content));
            const contentBuffer = toArrayBuffer(contentBytes);

            // Encrypt
            const ciphertext = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: ivBuffer },
                key,
                contentBuffer
            );

            return {
                encryptedContent: uint8ArrayToBase64(new Uint8Array(ciphertext)),
                iv: uint8ArrayToBase64(iv),
            };
        } catch (error) {
            console.error('Encryption failed, using fallback:', error);
            return this.encryptFallback(content, secretHex);
        }
    },

    /**
     * Decrypt an encrypted message using AES-GCM
     */
    async decrypt(
        encryptedContent: string,
        iv: string,
        secretHex: string
    ): Promise<DecryptedMessageContent> {
        // Check for Web Crypto API support
        if (typeof crypto === 'undefined' || !crypto.subtle) {
            return this.decryptFallback(encryptedContent, iv, secretHex);
        }

        try {
            const key = await this.importKey(secretHex);

            const ciphertextBytes = base64ToUint8Array(encryptedContent);
            const ivBytes = base64ToUint8Array(iv);
            const ciphertextBuffer = toArrayBuffer(ciphertextBytes);
            const ivBuffer = toArrayBuffer(ivBytes);

            // Decrypt
            const plaintextBuffer = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: ivBuffer },
                key,
                ciphertextBuffer
            );

            const plaintextString = uint8ArrayToString(new Uint8Array(plaintextBuffer));
            return JSON.parse(plaintextString) as DecryptedMessageContent;
        } catch (error) {
            console.error('Decryption failed, trying fallback:', error);
            return this.decryptFallback(encryptedContent, iv, secretHex);
        }
    },

    /**
     * Fallback encryption (XOR-based, NOT cryptographically secure)
     * Used when Web Crypto API is not available
     */
    encryptFallback(
        content: DecryptedMessageContent,
        secretHex: string
    ): EncryptedData {
        const contentString = JSON.stringify(content);
        const contentBytes = stringToUint8Array(contentString);
        const keyBytes = hexToUint8Array(secretHex);

        // Generate pseudo-random IV
        const iv = new Uint8Array(12);
        for (let i = 0; i < 12; i++) {
            iv[i] = Math.floor(Math.random() * 256);
        }

        // XOR encryption
        const encrypted = new Uint8Array(contentBytes.length);
        for (let i = 0; i < contentBytes.length; i++) {
            encrypted[i] = contentBytes[i] ^ keyBytes[i % keyBytes.length] ^ iv[i % iv.length];
        }

        return {
            encryptedContent: uint8ArrayToBase64(encrypted),
            iv: uint8ArrayToBase64(iv),
        };
    },

    /**
     * Fallback decryption (XOR-based)
     */
    decryptFallback(
        encryptedContent: string,
        iv: string,
        secretHex: string
    ): DecryptedMessageContent {
        const encryptedBytes = base64ToUint8Array(encryptedContent);
        const ivBytes = base64ToUint8Array(iv);
        const keyBytes = hexToUint8Array(secretHex);

        // XOR decryption
        const decrypted = new Uint8Array(encryptedBytes.length);
        for (let i = 0; i < encryptedBytes.length; i++) {
            decrypted[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length] ^ ivBytes[i % ivBytes.length];
        }

        const decryptedString = uint8ArrayToString(decrypted);
        return JSON.parse(decryptedString) as DecryptedMessageContent;
    },

    /**
     * Verify if a secret matches a stored hash
     */
    async verifySecret(secret: string, storedHash: string): Promise<boolean> {
        const hash = await this.hashSecret(secret);
        return hash === storedHash;
    },
};

export default cryptoService;
