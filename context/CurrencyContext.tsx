import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

export type CurrencyCode = 'XAF' | 'USD' | 'GBP' | 'EUR';

export interface Currency {
    code: CurrencyCode;
    symbol: string;
    name: string;
    locale: string;
}

const CURRENCIES: Record<CurrencyCode, Currency> = {
    XAF: { code: 'XAF', symbol: 'FCFA', name: 'Central African CFA Franc', locale: 'fr-FR' }, // fr-FR uses space separators often, good for XAF
    USD: { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
    GBP: { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
    EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' }, // de-DE is standard for Euro formatting usually
};

interface CurrencyContextType {
    currency: Currency;
    setCurrencyCode: (code: CurrencyCode) => Promise<void>;
    formatAmount: (amount: number) => string;
    availableCurrencies: Currency[];
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currency, setCurrency] = useState<Currency>(CURRENCIES.XAF);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCurrency();
    }, []);

    const loadCurrency = async () => {
        try {
            const savedCode = await AsyncStorage.getItem('user_currency');
            if (savedCode && (savedCode in CURRENCIES)) {
                setCurrency(CURRENCIES[savedCode as CurrencyCode]);
            }
        } catch (e) {
            console.error('Failed to load currency', e);
        } finally {
            setLoading(false);
        }
    };

    const setCurrencyCode = async (code: CurrencyCode) => {
        try {
            const newCurrency = CURRENCIES[code];
            setCurrency(newCurrency);
            await AsyncStorage.setItem('user_currency', code);
        } catch (e) {
            console.error('Failed to save currency', e);
        }
    };

    const formatAmount = (amount: number) => {
        // XAF typically doesn't use decimals for day-to-day amounts, but we can keep it standard or conditionally remove them.
        // For XAF, usually 0 fraction digits. For others, 2.
        const fractionDigits = currency.code === 'XAF' ? 0 : 2;

        return new Intl.NumberFormat(currency.locale, {
            style: 'currency',
            currency: currency.code,
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits,
        }).format(amount).replace('XAF', 'FCFA'); // Start with standard currency formatting
        // Note: Intl might format XAF as "XAF 1,000" or similar. We can enforce specific symbol replacement if needed.
        // Specifically for XAF, it's often "1 000 FCFA" or "FCFA 1,000".

        // Custom simple approach to ensure Symbol is used exactly as desired if Intl is tricky on hermes/android sometimes:
        /*
        const formattedNum = amount.toFixed(fractionDigits).replace(/\B(?=(\d{3})+(?!\d))/g, " "); // space separator
        if (currency.code === 'XAF') return `${formattedNum} ${currency.symbol}`;
        return `${currency.symbol}${formattedNum}`;
        */
    };

    return (
        <CurrencyContext.Provider value={{
            currency,
            setCurrencyCode,
            formatAmount,
            availableCurrencies: Object.values(CURRENCIES)
        }}>
            {children}
        </CurrencyContext.Provider>
    );
};

export const useCurrency = () => {
    const context = useContext(CurrencyContext);
    if (!context) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
};
