import _ from 'lodash';

import { loadSpecs } from '../common/core.js';


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
    const specs = loadSpecs('../specs');
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