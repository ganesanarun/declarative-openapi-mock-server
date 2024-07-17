import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { getHttpOperationsFromSpec } from '@stoplight/prism-cli/dist/operations.js';
import { parse } from '@stoplight/yaml';
import _ from 'lodash';


const loadSpecs = (folderName) => {
    const specsDir = path.join(__dirname, folderName);
    const files = fs.readdirSync(specsDir).filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));
    const specs = files.map(file => parse(fs.readFileSync(path.join(specsDir, file), 'utf8')));
    return specs;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadOperations = async (folderName) => {
    const specsDir = path.join(__dirname, folderName);
    const files = fs.readdirSync(specsDir).filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));
    const operationsArray = await Promise.all(
        files.map(file => getHttpOperationsFromSpec(path.join(specsDir, file)))
    );
    return _.flatten(operationsArray);
};

export  {
    loadOperations,
    loadSpecs
};