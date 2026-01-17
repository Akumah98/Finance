/**
 * Formats a string to be a display-friendly amount (e.g., "1,234.56").
 * Allows only numbers and one decimal point.
 * Adds commas for thousands.
 */
export const formatAmount = (value: string): string => {
    // 1. Remove all non-numeric chars except the first decimal point
    // This regex matches anything that is NOT a digit or a dot
    let cleaned = value.replace(/[^0-9.]/g, '');

    // Handle multiple decimal points: keep only the first one
    const parts = cleaned.split('.');
    if (parts.length > 2) {
        cleaned = parts[0] + '.' + parts.slice(1).join('');
    }

    // 2. Split into integer and decimal parts
    const [integerPart, decimalPart] = cleaned.split('.');

    // 3. Add commas to the integer part
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    // 4. Construct final string
    if (decimalPart !== undefined) {
        // Limit to 2 decimal places
        return `${formattedInteger}.${decimalPart.slice(0, 2)}`;
    }

    return formattedInteger;
};

/**
 * Parses a display-friendly amount string back to a valid number string for API/storage.
 * Removes commas.
 */
export const parseAmount = (value: string): string => {
    // Remove all non-numeric characters except dots
    // This effectively strips commas
    return value.replace(/,/g, '');
};

/**
 * Validates if the input string is a valid partial or full number input
 * Used to block invalid key presses if needed, though formatAmount typically handles this by stripping.
 */
export const isValidAmountInput = (text: string): boolean => {
    // Allow empty string
    if (text === '') return true;
    // Allow numbers with optional commas and one decimal
    return /^[0-9,]*\.?[0-9]*$/.test(text);
};
