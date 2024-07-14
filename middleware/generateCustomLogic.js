import fs from 'fs';
import path from 'path';
import { parse } from '@stoplight/yaml';
import { fileURLToPath } from 'url';
import _ from 'lodash';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadSpecs = () => {
    const specsDir = path.join(__dirname, '../specs');
    const files = fs.readdirSync(specsDir).filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));
    const specs = files.map(file => parse(fs.readFileSync(path.join(specsDir, file), 'utf8')));
    return specs;
};

const evaluateRule = (value, rule) => {
    if (rule.caseSensitive === false && typeof value === 'string' && typeof rule.value === 'string') {
        value = value.toLowerCase();
        rule.value = rule.value.toLowerCase();
    }

    switch (rule.operator) {
        case 'lte':
            return value <= rule.value;
        case 'gte':
            return value >= rule.value;
        case 'lt':
            return value < rule.value;
        case 'gt':
            return value > rule.value;
        case 'eq':
        default:
            return value === rule.value;
    }
};

const evaluateCondition = (req, condition) => {
    if (condition.type === 'and') {
        return condition.rules.every(rule => evaluateRule(_.get(req.body, rule.field), rule));
    } else if (condition.type === 'or') {
        return condition.rules.some(rule => evaluateRule(_.get(req.body, rule.field), rule));
    }
    return false;
};

const generateCustomLogicMiddleware = () => {
    const specs = loadSpecs();
    const customLogic = [];

    specs.forEach(spec => {
        Object.entries(spec.paths).forEach(([path, methods]) => {
            Object.entries(methods).forEach(([method, details]) => {
                if (details['x-custom-logic']) {
                    customLogic.push({
                        path,
                        method: method.toUpperCase(),
                        logic: details['x-custom-logic']
                    });
                }
            });
        });
    });

    return (req, res, next) => {
        const matchingLogic = customLogic.find(logic =>
            logic.path === req.path && logic.method === req.method
        );

        if (matchingLogic) {
            const { logic } = matchingLogic;

            if (logic.type === 'conditionalResponse') {
                const matchedCondition = logic.conditions.find(condition => evaluateCondition(req, condition));
                if (matchedCondition) {
                    return res.json(matchedCondition.response);
                }
            }
        }

        delete req["body"];
        delete req.headers["content-type"];
        delete req.headers['content-length'];
        next();
    };
};

export default generateCustomLogicMiddleware;