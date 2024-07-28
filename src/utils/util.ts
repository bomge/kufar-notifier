/**
 * Sorts an array of objects by a specified field.
 * @param array - The array of objects to sort.
 * @param field - The field name to sort by.
 * @returns A new sorted array.
 */
export function sortByField<T>(array: T[], field: keyof T): T[] {
    return array.slice().sort((a, b) => {
        const valueA = a[field] !== undefined ? a[field] : ""; // Fallback to empty string if undefined
        const valueB = b[field] !== undefined ? b[field] : ""; // Fallback to empty string if undefined

        if (valueA < valueB) return 1;
        if (valueA > valueB) return -1;
        return 0; // They are equal
    });
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))