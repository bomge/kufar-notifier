import fs from 'node:fs';
import path from 'node:path';
import type { IConfig } from '../core/interfaces/IConfig';
/**
 * Sorts an array of objects by a specified field.
 * @param array - The array of objects to sort.
 * @param field - The field name to sort by.
 * @returns A new sorted array.
 */
export function sortByField<T>(array: T[], field: keyof T): T[] {
    return array.slice().sort((a, b) => {
        const valueA = a[field] !== undefined ? a[field] : ""; 
        const valueB = b[field] !== undefined ? b[field] : ""; 
        
        if (valueA < valueB) return 1;
        if (valueA > valueB) return -1;
        return 0; // They are equal
    });
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function saveConfig(updatedConfig: IConfig) {
    const configPath = path.join(__dirname, '..', '..', 'config.ts');
    const configContent = `import type { IConfig } from "./src/core/interfaces/IConfig";\n\nexport const config: IConfig = ${JSON.stringify(updatedConfig, null, 2)};`;
    fs.writeFileSync(configPath, configContent);
}

export function compareObjects(oldObj, newObj, path = '') {
    const changes = {};

    // Check properties in newObj
    for (const key in newObj) {
        const currentPath = path ? `${path}.${key}` : key;
        if (typeof newObj[key] === 'object' && newObj[key] !== null && typeof oldObj[key] === 'object' && oldObj[key] !== null) {
            Object.assign(changes, compareObjects(oldObj[key], newObj[key], currentPath));
        } else if (oldObj[key] !== newObj[key]) {
            changes[currentPath] = { old: oldObj[key], new: newObj[key] };
        }
    }

    // Check for properties in oldObj that are not in newObj
    for (const key in oldObj) {
        const currentPath = path ? `${path}.${key}` : key;
        if (!(key in newObj)) {
            changes[currentPath] = { old: oldObj[key], new: undefined };
        }
    }

    return changes;
}