import * as fs from 'node:fs';
import * as path from 'node:path';

// Define the structure for refs
type RefValue = {
	variation_id: number;
	name: string;
	url_name: string;
	required: boolean;
	type: string;
	meta: string;
	multi: boolean;
	ui_component: {
		fallback_type: string;
		type: string;
	};
	actions: Array<{
		action_id: number;
		args: any;
		depends_on: any;
		name: string;
		type: string;
	}>;
	labels: {
		name: {
			ru: string;
			by: string;
		};
		placeholder: {
			ru: string;
			by: string;
		};
	};
	values: Array<{
		value: string;
		labels: {
			ru: string;
			by: string;
		};
		hint: {
			ru: string;
			by: string;
			value?: string
		} | null;
		image_url: string | null;
	}> | null;
	external_values_url: string | null;
	range: any;
	min_taxonomy_version: number;
	hint?: {
		ru: string;
		by: string;
		value?: any;
	} | null;
	image_url: string | null;
	is_type: boolean;
	grouping?: any
};

// Define the structure for rules
type Rule = {
	rule: {
		category?: string;
		[key: string]: string;
	};
	refs: string[];
};

// Define the structure for subcategories
type Subcategory = {
	id: string;
	parent: string;
	order: string;
	name: string;
	name_ru: string;
	name_by: string;
};

type Categories = {
	id: string;
	name: string;
	version: string;
	order: string;
	subcategories: Subcategory[];
}

const categories: Categories[] = require('./category_tree');

const categoryMap: { [key: string]: {[key: string]:string} } = {};
for (const category of categories) {
    categoryMap[category.name] = {}
    for (const subcategory of category.subcategories) {
        categoryMap[category.name][subcategory.id] = subcategory.name;
    }
}
// Function to process a single category
function processCategory(categoryName: string, refs: { [key: string]: RefValue }, rules: Rule[]) {
    const result: {
        [key: string]: {
            [key: string]: {
                name: string,
                type: string,
                isRequired: boolean,
                values: { [key: string]: string }[],
                label: string,
                refId: string
            }
        }
    } = {};

    // Gather subcategory IDs for the current category
    // Gather subcategory IDs and names for the current category
    const subcategoryMap = categoryMap[categoryName] || {};
    const subcategoryIds = Object.keys(subcategoryMap);
    
    for (const obj of rules) {
        const ruleKey = Object.keys(obj.rule)
            .map(key => `${key}:${obj.rule[key]}`)
            .join(' ');

        // Handle rules with a specified category
        if (obj.rule.category) {
            const subcategoryName = subcategoryMap[obj.rule.category];
            if (!subcategoryName) {
                console.log('!subcategoryName', obj);
                continue;
            }
            applyRefsToSubcategory(result, subcategoryName, obj.refs, refs);
        } else {
            // Handle rules without a category, apply to all subcategories of the current category
            // console.log(subcategoryIds,categoryMap)
            // process.exit()
            for (const subcategoryId of subcategoryIds) {
                const subcategoryName = subcategoryMap[subcategoryId];
                if (subcategoryName) {
                    applyRefsToSubcategory(result, subcategoryName, obj.refs, refs);
                }
            }
        }
    }

    return result;
}

// Helper function to apply refs to a subcategory
function applyRefsToSubcategory(result: any, subcategoryName: string, refs: string[], refValues: { [key: string]: RefValue }) {
    for (const refId of refs) {
        const ref = refValues[refId];
        if (!ref) {
            console.log('!ref', refId);
            continue;
        }
        if(ref.name === 'parent_category'){
            continue
        }
        const valuesArray = ref.values?.map(v => ({
            name: v.labels.ru,
            value: v.value
        })) || [];

        if (!result[subcategoryName]) {
            result[subcategoryName] = {};
        }

        result[subcategoryName][ref.name] = {
            name: ref.name,
            refId,
            type: ref.type,
            isRequired: ref.required,
            values: valuesArray,
            label: ref.labels.name.ru,
        };
    }
}
// Function to process all categories
async function processAllCategories() {
    const categoriesDir = path.join(__dirname, 'categories');
    const categoryFolders = fs.readdirSync(categoriesDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    const finalResult: { [category: string]: any } = {};

    for (const folder of categoryFolders) {
        const categoryPath = path.join(categoriesDir, folder);
        const files = fs.readdirSync(categoryPath);

        if (files.includes('index.ts') || files.includes('index.js')) {
            try {
                const { refs, rules, name } = require(`./categories/${folder}`);
                if (refs && rules) {
                    console.log(`Processing category: ${folder}`);
                    finalResult[folder] = processCategory(name, refs, rules);
                }
            } catch (error) {
                console.error(`Error processing category ${folder}:`, error);
            }
        }
    }

    return finalResult;
}

// Main execution
(async () => {
    const result = await processAllCategories();
    
    fs.writeFile('categories_result.json', JSON.stringify(result, null, 2), (err) => {
        if (err) {
            console.error('Error writing file:', err);
        } else {
            console.log('JSON saved to categories_result.json');
        }
    });
})();